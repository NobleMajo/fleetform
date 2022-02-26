import { CmdDefinition, Flag } from "cmdy"
import { DockerExecuter } from "../docker/DockerExecuter"
import { formatPath, writeJson } from "../lib/fs"
import { connectAllDockerHosts, parseFleetPlan, validateFleetSettings } from "../fleetform/fleetformFunc"
import { importModule } from "../lib/node"
import { FleetSettings } from "../fleetform/fleetformTypes"
import { removeContainer, removeNetworks } from "../docker/dockerFunc"

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

export const printData: Flag = {
    name: "printData",
    shorthand: "p",
    description: "Print parsed fleetdata to console.",
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

export const destoryDefinition: CmdDefinition = {
    name: "destory",
    alias: ["d", "de", "des", "dest", "desto", "destor", "disassemble"],
    description: "Destorys the whole container infrasturcture.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        currentHost,
        namePrefix,
        timeout,
        outFile,
        printData,
    ],
    cmds: [
    ],
    exe: async (cmd) => {
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
        const connections = await connectAllDockerHosts(plan, false)
        const usedHosts = Object.keys(plan.hostContainer)
        for (let index = 0; index < usedHosts.length; index++) {
            const hostName = usedHosts[index]
            const executer: DockerExecuter = connections[hostName].executer

            console.info("# REMOVE NETWORKS AND CONTAINER #")
            await Promise.all([
                removeContainer(
                    executer,
                    plan.plannedContainer,
                    plan.namePrefix,
                    true,
                )
                    .forEach((container) => {
                        if (container[0]) {
                            console.log(" - '" + container[1] + "'-container deleted!")
                        } else {
                            console.log(" - Delete '" + container[1] + "'-container...")
                        }
                    })
                    .toPromise(),
                removeNetworks(
                    executer,
                    plan.namePrefix,
                    []
                )
                    .forEach((network) => {
                        if (network[0]) {
                            console.log(" - '" + network[1] + "'-network deleted!")
                        } else {
                            console.log(" - Delete '" + network[1] + "' network...")
                        }
                    })
                    .toPromise()
            ])
        }
        console.log("Fleet is disassembled!")
    }
}

export default destoryDefinition