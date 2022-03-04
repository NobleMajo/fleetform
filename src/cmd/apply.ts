import { Flag, CmdDefinition } from "cmdy"
import { formatPath } from "../lib/fs"
import { applyPlan, importData, loadFleetPlan, watchConfig } from './assets';

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

export const destroy: Flag = {
    name: "destroy",
    alias: ["force", "clear", "clean", "overwrite", "disassemble"],
    shorthand: "d",
    description: "Destroys the whole container infrstructure before creating it.",
}

export const renew: Flag = {
    name: "renew",
    alias: ["re", "ren", "rene"],
    shorthand: "r",
    description: "Define containers that should be renewed.",
    types: ["string"]
}

export const applyDefinition: CmdDefinition = {
    name: "apply",
    alias: ["a", "ap", "app", "appl"],
    description: "Applys the fleetplan container infrstructure.",
    details: "Load and validate the fleet-config, creates and print a fleet-plan and test the defined host connections.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        currentHost,
        namePrefix,
        watch,
        timeout,
        outFile,
        printData,
        renew,
        destroy,
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
        const destroy = cmd.flags.includes("destroy")
        const watch = cmd.flags.includes("watch")
        const namePrefix = cmd.valueFlags.nameprefix[0]
        const outFile = cmd.valueFlags.outfile[0]
        let currentHost = cmd.valueFlags.currenthost[0]
        const renewContainers = cmd.valueFlags.renew
        if (typeof currentHost != "string") {
            currentHost = undefined
        }
        let timeout = Number(cmd.valueFlags.timeout[0])
        if (timeout == NaN || typeof timeout != "number") {
            timeout = -1
        }

        const data = await importData(
            verbose,
            cmd,
            file,
            ignoreTypescript,
            ignoreJson,
        )

        const plan = await loadFleetPlan(
            data,
            currentHost,
            namePrefix,
            printData,
        )

        await applyPlan(
            plan,
            outFile,
            renewContainers,
            destroy,
        )

        if (watch) {
            let reload: boolean = false
            let loading: boolean = false
            console.log("# Press CTRL + C to quit FleetForm! #")
            const stream = watchConfig(file)
            stream.forEach(async (value) => {
                if (reload) {
                    return
                }
                if (loading) {
                    reload = true
                    return
                }
                loading = true
                while (reload) {
                    reload = false
                    console.log("# Reload FleetForm... #")
                    const data = await importData(
                        verbose,
                        cmd,
                        file,
                        ignoreTypescript,
                        ignoreJson,
                    )

                    const plan = await loadFleetPlan(
                        data,
                        currentHost,
                        namePrefix,
                        printData,
                    )

                    await applyPlan(
                        plan,
                        outFile,
                        renewContainers,
                        destroy,
                    )
                    console.log("# FleetForm reloaded! #")
                }
                loading = false
            })
        }
    }
}

export default applyDefinition