import { Flag, CmdDefinition, CmdParserOptions } from "cmdy"
import apply from "./apply"
import destroy from "./destroy"
import plan from "./plan"

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


const root: CmdDefinition = {
    name: "fleetform",
    description: "Fleetform is a tool to deploy docker infrastructure on multiple hosts.",
    details: "You can use Fleetform to deploy a whole infrasturcture on multiple host/servers with one command.",
    flags: [
    ],
    cmds: [
        apply,
        destroy,
        plan
    ],
}

export default {
    cmd: root,
    globalFlags: [
        file,
        ignoreTypescript,
        ignoreJson,
        verbose,
        printData,
        watch,
        timeout,
        outFile
    ],
    globalHelpMsg: "! Fleetform by CoreUnit.NET !",
} as CmdParserOptions