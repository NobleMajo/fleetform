import { CmdResult, Flag, CmdDefinition } from "cmdy"
import { DockerExecuter } from "../docker"
import { formatPath, getFileType, watchChanges, writeJson } from "../files"
import { connectAllDockerHosts, parseFleetPlan, validateFleetSettings } from "../fleetformFunc"
import { importModule } from "../node"
import { hostname } from "os"
import { FleetSettings } from "src/fleetformTypes"
import { createNetworks, pullNeededImages, removeContainer, removeNetworks, runAllContainer } from "src/dockerFunc"

export const file: Flag = {
    name: "file",
    shorthand: "f",
    description: "The path to a file or a folder with a fleet.json, js or ts file!",
    types: ["string"],
}

export const ignoreTypescript: Flag = {
    name: "ignoreTs",
    alias: ["ignoreTypescript"],
    description: "Don't compile typescript files/projects if found at target file/folder.",
}

export const ignoreJson: Flag = {
    name: "ignoreJson",
    description: "Don't parse json files if found at target file.",
}

export const verbose: Flag = {
    name: "verbose",
    shorthand: "v",
    description: "Show basic flag adn target informations.",
}

export const printData: Flag = {
    name: "printData",
    shorthand: "p",
    description: "Print parsed fleetdata to console.",
}

export const testConnection: Flag = {
    name: "testConnection",
    alias: ["con"],
    description: "Test the connection to all hosts and show errors.",
}

export const namePrefix: Flag = {
    name: "namePrefix",
    alias: ["pre", "prefix"],
    description: "Set the container and network prefix (default: 'ff-').",
    types: ["string"],
    default: "ff_"
}

export const currentHost: Flag = {
    name: "currentHost",
    shorthand: "c",
    description: "Set the current host name (default: 'local').",
    types: ["string"],
}

export const apply: Flag = {
    name: "apply",
    shorthand: "a",
    description: "Apply changes to hosts.",
}

export const disassemble: Flag = {
    name: "disassemble",
    shorthand: "d",
    description: "Stops all container and remove all networks (Also triggered by '--apply').",
}

export const watch: Flag = {
    name: "watch",
    shorthand: "w",
    description: "Starts fleetform in watch mode.",
}

export const timeout: Flag = {
    name: "timeout",
    shorthand: "t",
    description: "Set timeout for apply the contianer",
    types: ["number"],
}

export const outFile: Flag = {
    name: "outFile",
    shorthand: "o",
    description: "Export the parsed fleetform data json into a file.",
    types: ["string"],
}

export async function checkForScriptFile(path: string): Promise<void> {
    let type
    type = await getFileType(path + ".ts")
    if (type != "FILE") {
        type = await getFileType(path + ".js")
        if (type != "FILE") {
            path += "/fleet"
            type = await getFileType(path + ".ts")
            if (type != "FILE") {
                type = await getFileType(path + ".js")
                if (type != "FILE") {
                    path = path.slice(0, -6)
                    throw new Error("Paths '" + path + "'.[ts|js|/fleet.[ts|js]] not exist!")
                }
            }
        }
    }
}

export const root: CmdDefinition = {
    name: "fleetform",
    description: "Fleetform is a tool to deploy docker infrastructure on multiple hosts.",
    details: "You can use Fleetform to deploy a whole infrasturcture on multiple host/servers with one command.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        verbose,
        testConnection,
        currentHost,
        namePrefix,
        watch,
        disassemble,
        timeout,
        outFile,
        printData,
        apply,
    ],
    cmds: [
    ],
    exe: async (cmd) => {
        let target = process.cwd()
        const watch = cmd.flags.includes("watch")
        await processCmd(cmd)
        if (watch) {
            console.info("Waiting for changes...")
            const watcher = await watchChanges(target)
            watcher.onData = async (file) => {
                console.info("Change in file: '" + file + "'!")
                await processCmd(cmd)
            }
            watcher.onClose = (meta) => {
                if (meta.err) {
                    console.error("Fleetform watcher error: ", meta.err)
                } else {
                    console.error("Watcher closed!")
                }
            }
        }
    }
}

export default root

export async function processCmd(cmd: CmdResult): Promise<void> {
    let file = process.cwd()
    if (
        cmd.valueFlags.file &&
        typeof cmd.valueFlags.file[0] == "string"
    ) {
        file = cmd.valueFlags.file[0]
    }
    file = formatPath(file)
    const ignoreTypescript = cmd.flags.includes("ignorets")
    const ignoreJson = cmd.flags.includes("ignorejson")
    const verbose = cmd.flags.includes("verbose")
    const printData = cmd.flags.includes("printdata")
    const testConnection = cmd.flags.includes("testconnection")
    const apply = cmd.flags.includes("apply")
    const disassemble = cmd.flags.includes("disassemble")
    const namePrefix = cmd.valueFlags.nameprefix[0]
    const outFile = cmd.valueFlags.outfile[0]
    let currentHost = cmd.valueFlags.currenthost[0]
    if (typeof currentHost != "string") {
        currentHost = undefined
    }
    let timeout = Number(cmd.valueFlags.timeout[0])
    if (timeout == NaN || typeof timeout != "number") {
        timeout = -1
    }
    if (verbose) {
        console.info("# VERBOSE #", {
            file,
            ignoreTypescript,
            ignoreJson,
            verbose,
            testConnection,
            flags: cmd.flags,
            flagValues: cmd.valueFlags
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
    const fleetSettings: FleetSettings = validateFleetSettings(data, currentHost, namePrefix)
    console.info("# FLEET CONFIG VALID #")
    const plan = parseFleetPlan(fleetSettings)
    if (printData) {
        console.info("# FLEET SETTINGS #", plan)
    }
    if (outFile) {
        await writeJson(
            formatPath(outFile),
            plan as any
        )
        console.info("# OUTPUT FILE READY #")
    }
    const connections = await connectAllDockerHosts(plan, testConnection)
    if (testConnection) {
        console.info("# CONNECTION INFO #")
        Object.keys(connections).forEach((host) => {
            if (!connections[host].err) {
                console.info(" + '" + hostname + "' connected!")
            }
        })
        Object.keys(connections).forEach((host) => {
            if (connections[host].err) {
                console.error(" - '" + hostname + "': ", connections[host].err)
            }
        })
    } else if (!disassemble && !apply) {
        if (cmd.flags.length == 0) {
            console.error("Use '-h' for more infos and '-a' to apply a plan!'")
        }
        return
    }
    const usedHosts = Object.keys(plan.hostContainer)
    for (let index = 0; index < usedHosts.length; index++) {
        const hostName = usedHosts[index]
        const executer: DockerExecuter = connections[hostName].executer

        console.info("# REMOVE OLD #")
        await Promise.all([
            removeNetworks(
                executer,
                plan,
            ),
            removeContainer(
                executer,
                plan
            )
        ])

        if (apply) {
            console.info("# APPLY NETWORKS #")
            await createNetworks(
                executer,
                plan.dockerHostNetworks[hostName],
                plan.namePrefix
            )

            console.info("# PULL IMAGES #")
            await pullNeededImages(
                executer,
                plan
            )

            console.info("# APPLY CONTAINER #")
            await runAllContainer(
                executer,
                plan
            )
        }
    }
    console.log("finished!")
}
