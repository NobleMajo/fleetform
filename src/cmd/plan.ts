import { Flag, CmdDefinition } from "cmdy"
import { formatPath, writeJson } from "../lib/files"
import { connectAllDockerHosts, parseFleetPlan, validateFleetSettings } from "../fleetform/fleetformFunc"
import { importModule } from "../lib/node"
import { FleetSettings } from "../fleetform/fleetformTypes"

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

export const watch: Flag = {
    name: "watch",
    shorthand: "w",
    description: "Starts fleetform in watch mode.",
}

export const outFile: Flag = {
    name: "outFile",
    shorthand: "o",
    description: "Export the parsed fleetform data json into a file.",
    types: ["string"],
}

export const testConnection: Flag = {
    name: "testConnection",
    alias: ["con"],
    description: "Test the connection to all hosts and show errors.",
}

export const planDefinition: CmdDefinition = {
    name: "plan",
    alias: ["p", "pl", "pla", "t", "te", "tes", "test", "valid", "validate"],
    description: "Load and validate the fleet-config and creates and print a fleet-plan.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        currentHost,
        namePrefix,
        watch,
        outFile,
        testConnection,
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
        const verbose = cmd.flags.includes("verbose")
        const ignoreTypescript = cmd.flags.includes("ignorets")
        const ignoreJson = cmd.flags.includes("ignorejson")
        const testConnection = cmd.flags.includes("testconnection")
        const namePrefix = cmd.valueFlags.nameprefix[0]
        const outFile = cmd.valueFlags.outfile[0]
        let currentHost = cmd.valueFlags.currenthost[0]
        if (typeof currentHost != "string") {
            currentHost = undefined
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
        if (outFile) {
            await writeJson(
                formatPath(outFile),
                plan as any
            )
            console.info("# OUTPUT FILE READY #")
        }
        console.info("# FLEET SETTINGS #\n", plan)

        if (testConnection) {
            console.info("# TEST CONNECTION #")
            const connections = await connectAllDockerHosts(plan, true)
            Object.keys(connections).forEach((host) => {
                if (!connections[host].err) {
                    console.info(" + '" + host + "' connected!")
                }
            })
            Object.keys(connections).forEach((host) => {
                if (connections[host].err) {
                    console.error(" - '" + host + "': ", connections[host].err)
                }
            })
        }
    }
}

export default planDefinition