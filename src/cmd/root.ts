import { Flag, CmdDefinition, CmdParserOptions } from "cmdy"
import apply from "./apply"
import destroy from "./destroy"
import plan from "./plan"

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
        apply,
        destroy,
        plan
    ],
}

export default {
    cmd: root,
    globalFlags: [
        verbose,
    ],
    globalHelpMsg: "! Fleetform |by majo418 |supported by CoreUnit.NET !",
} as CmdParserOptions