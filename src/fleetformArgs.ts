import { copyFileSync } from "fs"
import { OutgoingMessage } from "http"
import { CmdResult, Flag, RootCmdDefinition } from "./args"
import { formatPath, formatUrl, getFileType, watchChanges, writeJson } from "./files"
import { parseFleetData } from "./fleetformFunc"
import { importModule } from "./node"
import { shell } from "./shell"
import { printLogVarStream } from "./varstream"

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

export const importVerbose: Flag = {
    name: "importVerbose",
    shorthand: "i",
    description: "Show all import informations instand of import target module/json.",
}

export const verbose: Flag = {
    name: "verbose",
    shorthand: "v",
    description: "Show infrasturcture data instand of deploy container on hosts.",
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
    types: ["string"]
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

export const rootCmdDefinition: RootCmdDefinition = {
    name: "fleetform",
    description: "Fleetform is a tool to deploy docker infrastructure on multiple hosts.",
    details: "You can use Fleetform to deploy a whole infrasturcture on multiple host/servers with one command.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        verbose,
        importVerbose,
        watch,
        outFile
    ],
    cmds: [
    ],
    globalFlags: [
    ],
    globalHelpMsg: "! Fleetform by CoreUnit.NET !",
    exe: async (cmd) => {
        let target = process.cwd()
        const watch = cmd.data.flags.includes("watch")
        await processCmd(cmd)
        if (watch) {
            console.log("Waiting for changes...")
            const watcher = await watchChanges(target)
            watcher.onData = async (file) => {
                console.log("Change in file: '" + file + "'!")
                await processCmd(cmd)
            }
            watcher.onClose = () => {
                console.error("Watcher closed!")
            }
            watcher.onError = (err) => {
                console.error("Fleetform error: ", err)
            }
        }
    }
}

export async function processCmd(cmd: CmdResult): Promise<void> {
    let target = process.cwd()
    if (
        cmd.data.valueFlags.target &&
        typeof cmd.data.valueFlags.target[0] == "string"
    ) {
        target = cmd.data.valueFlags.target[0]
    }
    target = formatPath(target)
    const ignoreTypescript = cmd.data.flags.includes("ignoreTs")
    const ignoreJson = cmd.data.flags.includes("ignoreJson")
    const importVerbose = cmd.data.flags.includes("importVerbose")
    const verbose = cmd.data.flags.includes("verbose")
    const outFile = cmd.data.valueFlags.outFile ? cmd.data.valueFlags.outFile[0] ?? undefined : undefined
    let verboseData: any = {}
    if (importVerbose) {
        verboseData = {
            target,
            ignoreTypescript,
            ignoreJson,
            importVerbose,
            verbose,
        }
        if (!verbose) {
            console.log("# VERBOSE #\n", verboseData)
            return
        }
    }
    let data = await importModule(target, {
        allowJson: !ignoreJson,
        compileTs: !ignoreTypescript,
    })
    if (data.default) {
        data = data.default
    }
    let fleetData = parseFleetData(data)
    if (verbose) {
        if (Object.keys(verboseData).length > 0) {
            verboseData = {
                fleetData: fleetData,
                ...verboseData
            }
        } else {
            verboseData = fleetData
        }
        console.log("# VERBOSE #\n", verboseData)
        if (!outFile) {
            return
        }
    }
    if (outFile) {
        await writeJson(formatPath(outFile), fleetData as any)
        console.log("Output file ready!")
        return
    }
    console.log("WIP: Implement the fleetform docker deploy feature.")
}