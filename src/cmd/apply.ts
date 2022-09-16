import { CmdDefinition, CmdResult, ValueFlag, BoolFlag } from "cmdy"
import { formatPath } from "../lib/fs"
import {
    generateApplyTaskSet,
    getHostResourceInfo,
    getImageHashs,
    handleTask,
    getNeededImages,
    Task,
    cleanDocker,
    TaskSet,
} from "../task";
import { DockerExecuter } from "../docker/executer";
import { validateFleetSettings, KeyValueObject, prepareSecretStore, parseSecretStoreKey } from '../func';
import { importModule } from "../lib/node";
import { printAndPullImage, unescapeUnicode } from "../docker/func";
import { promises as fs } from "fs"
import * as path from "path"

export const file: ValueFlag = {
    name: "file",
    shorthand: "f",
    description: "The path to a file or a folder with a fleet.json, js or ts file!",
    types: ["string"],
}

export const ignoreTypescript: BoolFlag = {
    name: "ignoreTs",
    alias: ["ignoreTypescript"],
    description: "Don't compile typescript files/projects if found at target file/folder.",
}

export const ignoreJson: BoolFlag = {
    name: "ignoreJson",
    description: "Don't parse json files if found at target file.",
}

export const namePrefix: ValueFlag = {
    name: "namePrefix",
    alias: ["pre", "prefix"],
    description: "Set the container and network prefix (default: 'ff_').",
    types: ["string"],
    default: "ff_"
}

export const renew: ValueFlag = {
    name: "renew",
    alias: ["re", "ren", "rene"],
    shorthand: "r",
    description: "Define containers that should be renewed.",
    types: ["string"]
}

export const updateDelayDays: ValueFlag = {
    name: "updateDelayDays",
    alias: ["upid"],
    description: "Update all images every x days.",
    types: ["number"]
}

export const updateDelayHours: ValueFlag = {
    name: "updateDelayHours",
    alias: ["upih"],
    description: "Update all images every x hours.",
    types: ["number"]
}

export const updateDelayMinutes: ValueFlag = {
    name: "updateDelayMinutes",
    alias: ["upim"],
    description: "Update all images every x minutes.",
    types: ["number"]
}

export const updateDelaySeconds: ValueFlag = {
    name: "updateDelaySeconds",
    alias: ["upis"],
    description: "Update all images every x seconds.",
    types: ["number"]
}

export const cacheTsOutput: BoolFlag = {
    name: "cacheTsOutput",
    alias: ["cto", "cacheTs"],
    shorthand: "c",
    description: "Don't delete typescript compile output files after loading them.",
}

export const dontPruneImages: BoolFlag = {
    name: "dontPruneImages",
    alias: ["dontPruneImage", "dp", "dontPrune"],
    shorthand: "p",
    description: "Don't prune unused images after work.",
}

const secretStore: KeyValueObject = {}

export const secretStorePath: ValueFlag = {
    name: "secretStorePath",
    alias: ["secretStore", "secretPath", "varPath"],
    description: "The path of a string key value object json file for fleetform variables.",
    shorthand: "s",
    types: ["string"],
    exe: async (cmd, value) => {
        if (!value.startsWith("/")) {
            value = path.join(process.cwd(), "/", value)
        }
        const secretStore2 = prepareSecretStore(
            JSON.parse(
                await fs.readFile(
                    value,
                    {
                        encoding: "utf8"
                    }
                )
            )
        )
        for (const key of Object.keys(secretStore2)) {
            if (typeof secretStore[key] == "string") {
                console.warn(
                    "WARNING: Overwrite secret-store variable '" + key +
                    "' with a new value from the file '" + value + "'"
                )
            }
            secretStore[key] = secretStore2[key]
        }

    }
}

export const secretStoreVar: ValueFlag = {
    name: "secretStoreVar",
    alias: ["var", "secret", "secretVar"],
    shorthand: "v",
    description: "A key value string seperated with '=' that is set to the secret-store",
    types: ["string"],
    exe: async (cmd, value) => {
        const index = value.indexOf("=")
        if (index == -1) {
            throw new Error("A manual set secret-store variable flag not containes a value seperated with '='")
        }
        const key = parseSecretStoreKey(value.substring(0, index))
        const value2 = value.substring(index + 1)
        if (typeof secretStore[key] == "string") {
            console.warn(
                "WARNING: Overwrite secret-store variable '" + key +
                "' with a new value from the file '" + value + "'"
            )
        }
        secretStore[key] = value2
    }
}

export const applyDefinition: CmdDefinition = {
    name: "apply",
    alias: ["appl", "app", "pply", "ap"],
    description: "Applys the fleetplan container infrstructure.",
    details: "Load and validate the fleet-config, creates and print a fleet-plan, test the defined host connections and applys the infrasturcture.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        namePrefix,
        renew,
        cacheTsOutput,
        updateDelayDays,
        updateDelayHours,
        updateDelayMinutes,
        updateDelaySeconds,
        dontPruneImages,
    ],
    cmds: [
    ],
    exe: async (cmd) => {
        const applyVars = await prepareAppyVars(cmd)

        if (applyVars.tasks.length > 0) {
            applyVars.verbose && console.debug("TASKS:\n", applyVars.tasks)
            console.info("===== START TASKS =====")
            !applyVars.verbose && applyVars.tasks.forEach(
                (parallelTasks) => parallelTasks.forEach(
                    () => process.stdout.write("O")
                )
            )
            !applyVars.verbose && process.stdout.write(unescapeUnicode("\\u001b[1000D"))
            for (let index = 0; index < applyVars.tasks.length; index++) {
                const parallelTasks = applyVars.tasks[index]
                applyVars.verbose && console.debug("START PARALLEL TASK SET (" + parallelTasks.length + "):")
                applyVars.verbose && parallelTasks.forEach(
                    (task: Task) => console.info(
                        " - " +
                        task.type.toUpperCase() + " '" +
                        task.name +
                        (
                            (task as any).target ?
                                "<-'" + (task as any).target :
                                "'"
                        ) +
                        "'..."
                    )
                )
                applyVars.verbose && console.debug("WAIT FOR PARALLEL TASK SET:")
                await Promise.all(parallelTasks.map(async (task: Task) => {
                    await handleTask(
                        applyVars.executer,
                        task
                    )
                    applyVars.verbose ?
                        console.info(
                            " - " +
                            task.type.toUpperCase() + " '" +
                            task.name +
                            "'" +
                            (
                                (task as any).target ?
                                    "<-'" + (task as any).target + "'" :
                                    ""
                            ) +
                            "!"
                        ) :
                        process.stdout.write("X")
                }))
            }
            !applyVars.verbose && console.debug(" ")
            console.info("===== TASKS FINISHED =====")
        } else {
            console.info("Nothing to do...")
        }

        if (!dontPruneImages) {
            console.info("Prune unused images...")
            await cleanDocker(applyVars.executer)
            console.info("Unused images pruned!")
        }

        if (cmd.cmd.name == "api") {
            return
        }
        let updateDelayMillis: number = 0
        if (!isNaN(applyVars.updateDelayDays)) {
            updateDelayMillis += applyVars.updateDelayDays * 1000 * 60 * 60 * 24
        }
        if (!isNaN(applyVars.updateDelayHours)) {
            updateDelayMillis += applyVars.updateDelayHours * 1000 * 60 * 60
        }
        if (!isNaN(applyVars.updateDelayMinutes)) {
            updateDelayMillis += applyVars.updateDelayMinutes * 1000 * 60
        }
        if (!isNaN(applyVars.updateDelaySeconds)) {
            updateDelayMillis += applyVars.updateDelaySeconds * 1000
        }
        if (updateDelayMillis > 0) {
            const date = new Date(updateDelayMillis)
            let day = Math.round(date.getHours() / 24)
            let hours = date.getHours() % 24
            const time = (
                (day > 0 ? day + "d " : "") +
                (
                    hours > 0 || date.getMinutes() > 0 ?
                        (hours < 10 ? "0" + hours : hours) + ":" +
                        (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()) :
                        ""
                ) +
                (date.getSeconds() > 0 ? " " + date.getSeconds() + "s" : "")
            )
            if (updateDelayMillis < 60 * 1000) {
                throw new Error("The value of 'updateDelay' needs to be minimum 1 minute!\nThe current value is: " + time)
            }
            console.info("FleetForm is running in update interval mode!")
            console.info("Interval time: " + time)
            const pullInterval = async () => {
                for (let index = 0; index < applyVars.neededImages.length; index++) {
                    await printAndPullImage(
                        applyVars.executer,
                        applyVars.neededImages[index],
                    )
                }
                console.info("FleetForm is running in update interval mode!")
                console.info("Interval time: " + time)
                setTimeout(() => pullInterval(), updateDelayMillis)
            }
            setTimeout(() => pullInterval(), updateDelayMillis)
        }
    },
}

export interface ApplyPrepareVars {
    tasks: TaskSet,
    executer: DockerExecuter,
    neededImages: string[],
    verbose: boolean,
    dontPruneImages: boolean,
    updateDelayDays: number,
    updateDelayHours: number,
    updateDelayMinutes: number,
    updateDelaySeconds: number,
}

export async function prepareAppyVars(
    cmd: CmdResult
): Promise<ApplyPrepareVars> {
    let file = process.cwd()
    if (
        cmd.valueFlags.file &&
        typeof cmd.valueFlags.file == "string"
    ) {
        file = cmd.valueFlags.file
    }
    file = formatPath(file)
    const ignoreTypescript = cmd.flags.includes("ignorets")
    const ignoreJson = cmd.flags.includes("ignorejson")
    const verbose = cmd.flags.includes("verbose")
    const cacheTsOutput = cmd.flags.includes("cachetsoutput")
    const dontPruneImages = cmd.flags.includes("dontpruneimages")
    const namePrefix = cmd.valueFlags.nameprefix
    const renewContainers = cmd.arrayFlags.renew
    const updateDelayDays = Number(cmd.valueFlags.updatedelaydays)
    const updateDelayHours = Number(cmd.valueFlags.updatedelayhours)
    const updateDelayMinutes = Number(cmd.valueFlags.updatedelayminutes)
    const updateDelaySeconds = Number(cmd.valueFlags.updatedelayseconds)

    const data = await importData(
        verbose,
        cmd,
        file,
        ignoreTypescript,
        ignoreJson,
        !cacheTsOutput
    )

    const settings = validateFleetSettings(
        data,
        secretStore,
        namePrefix,
    )
    //TODO multihost feature for apply
    const executer = await DockerExecuter.createExecuter()
    const res = await getHostResourceInfo(
        executer,
        namePrefix,
    )
    const renew: string[] = [
        ...renewContainers,
        ...(
            (
                cmd && typeof (cmd as any).task == "function"
            ) ?
                await (
                    (cmd as any).task(
                        settings.container,
                        executer
                    )
                ) :
                []
        ),
    ]
    const neededImages = getNeededImages(
        settings.container
    )
    verbose && console.debug("Pull images: ", neededImages)
    for (let index = 0; index < neededImages.length; index++) {
        await printAndPullImage(
            executer,
            neededImages[index]
        )
    }

    const imageHashs = await getImageHashs(
        executer,
        neededImages
    )

    const tasks = generateApplyTaskSet(
        res,
        settings.container,
        imageHashs,
        renew,
        [],
        namePrefix,
    )

    return {
        tasks: tasks,
        executer: executer,
        neededImages: neededImages,
        verbose: verbose,
        dontPruneImages: dontPruneImages,
        updateDelayDays: updateDelayDays,
        updateDelayHours: updateDelayHours,
        updateDelayMinutes: updateDelayMinutes,
        updateDelaySeconds: updateDelaySeconds,
    }
}

export async function importData(
    verbose: boolean,
    cmd: CmdResult,
    file: string,
    ignoreTypescript: boolean,
    ignoreJson: boolean,
    deleteCompiledOutput: boolean,
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
        deleteCompiledOutput: deleteCompiledOutput,
    })
    console.info("# FLEET CONFIG FOUND #")
    if (data.default) {
        data = data.default
    }
    return data
}

export default applyDefinition
