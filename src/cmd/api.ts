import { Flag, CmdDefinition } from "cmdy"
import { CmdResult } from 'cmdy';
import { importModule } from "../lib/node";
import * as express from "express"
import * as cors from "cors"
import {
    file,
    ignoreTypescript,
    ignoreJson,
    namePrefix,
    outFile,
    tasks,
    taskStat,
    destroy,
    renew,
    applyDefinition
} from "./apply";
import { printAndPullImage } from "../docker/dockerFunc";
import { ContainerMap } from '../fleetform/fleetformTypes';
import { DockerExecuter } from '../docker/DockerExecuter';

export const port: Flag = {
    name: "port",
    alias: ["web", "listen"],
    shorthand: "p",
    types: ["number"],
    default: 8080,
    description: "Run fleetform apply in api mode. The number defines the port where the webserver is reachable.",
}

export const key: Flag = {
    name: "key",
    alias: ["apikey"],
    shorthand: "a",
    types: ["string"],
    required: true,
    description: "Key that you need to access the api.",
}

export const apiDefinition: CmdDefinition = {
    name: "api",
    alias: ["ap", "pi"],
    description: "Run fleetform in api mode.",
    details: "Run fleetform as webapi where you can update images and renew containers.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        namePrefix,
        outFile,
        tasks,
        taskStat,
        renew,
        destroy,
        port,
        key,
    ],
    cmds: [
    ],
    exe: async (cmd) => {
        const port = Number(cmd.valueFlags.port[0])
        if (typeof port != "number") {
            throw new Error("Port is not a number!")
        }
        const key = cmd.valueFlags.key[0]
        if (typeof key != "string" || key.length < 8) {
            throw new Error("ApiKey is smaller then 8 characters!")
        }

        let promise: Promise<void> | undefined = undefined
        const reload = async (
            task: (container: ContainerMap, executer: DockerExecuter) => Promise<string[]>
        ) => {
            while (promise) {
                await promise
            }

            promise = (async () => {
                (cmd as any).task = task
                await applyDefinition.exe(cmd)
                promise = undefined
            })()
            await promise
        }

        console.log("Start fleetform api mode on port '" + port + "'...")

        const app = express()
        app.use(cors())
        app.use((err, req, res, next) => {
            res.status(500)
                .send(
                    err.message ??
                    err.msg ??
                    "Unknown Error"
                )
        })

        app.get(
            [
                "/ready",
                "/live",
                "/started",
                "/status",
            ],
            (req, res) => {
                res.sendStatus(200)
            }
        )

        app.use((req, res, next) => {
            let key2 = req.header["auth"] || req.query["auth"]
            if (Array.isArray(key2)) {
                key2 = key2[0]
            }
            if (typeof key2 != "string" || key2.length < 8) {
                res.status(400).send("The type of 'auth' header or query parameter needs to be a string with a length of minimum 8!")
                return
            }
            if (key2 !== key) {
                res.sendStatus(401)
                return
            }
            next()
        })

        app.get("/container/:name/", async (req, res) => {
            let name = req.params.name
            if (typeof name != "string" || name.length < 1) {
                res.status(400).send("The container name needs to be a string with a length of minimum 1!")
                return
            }
            await reload(
                async () => [name]
            )
            res.sendStatus(200)
        })

        app.get("/image/:image/", async (req, res) => {
            let image = req.params.image
            if (typeof image != "string" || image.length < 1) {
                res.status(400).send("The image needs to be a string with a length of minimum 1!")
                return
            }

            await reload(
                async (container) => {
                    return Object.keys(container)
                        .filter((name) => container[name].image === image)
                }
            )
            res.sendStatus(200)
        })

        await reload(async () => [])

        app.listen(
            port,
            "0.0.0.0",
            () => {
                console.log("FleetForm API started on port '" + port + "'!")
            }
        )
    }
}

export async function importData(
    verbose: boolean,
    cmd: CmdResult,
    file: string,
    ignoreTypescript: boolean,
    ignoreJson: boolean,
): Promise<any> {
    if (verbose) {
        console.info("# VERBOSE #", {
            file,
            ignoreTypescript,
            ignoreJson,
            verbose,
            flags: cmd.flags,
            flagValues: cmd.valueFlags,
        })
    }
    let data = await importModule(file, {
        allowJson: !ignoreJson,
        compileTs: !ignoreTypescript,
    })
    console.info("# FLEET CONFIG FOUND #")
    if (data.default) {
        data = data.default
    }
    return data
}

export default apiDefinition