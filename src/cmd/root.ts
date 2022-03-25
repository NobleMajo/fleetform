import { Flag, CmdDefinition, CmdParserOptions } from "cmdy"
import applyDefinition from "./apply"
import apiDefinition from "./api";
import deleteDefinition from "./delete"

export const verbose: Flag = {
    name: "verbose",
    shorthand: "v",
    description: "Show basic flag adn target informations.",
}

const root: CmdDefinition = {
    name: "fleetform",
    description: "Fleetform is a tool to deploy docker infrastructure on multiple hosts.",
    details: "You can use Fleetform to deploy a whole infrasturcture on multiple host/servers with one command.",
    flags: [
    ],
    cmds: [
        applyDefinition,
        apiDefinition,
        deleteDefinition,
    ],
}

export default {
    cmd: root,
    globalFlags: [
        verbose,
    ],
    globalHelpMsg: "! Fleetform | by majo418 | supported by CoreUnit.NET !",
} as CmdParserOptions