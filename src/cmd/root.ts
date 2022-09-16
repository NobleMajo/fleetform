import { CmdDefinition, CmdParserOptions, BoolFlag } from "cmdy"
import applyDefinition from "./apply"
import apiDefinition from "./api";
import deleteDefinition from "./delete"
import planDefinition from "./plan";

export const verbose: BoolFlag = {
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
        planDefinition,
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