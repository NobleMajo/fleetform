import { CmdDefinition } from "cmdy"
import apply from "./apply"
import { prepareAppyVars } from "./apply"

const planDefinition: CmdDefinition = {
    name: "plan",
    alias: ["pl", "pla"],
    description: "Plans the fleetplan container infrstructure.",
    details: "Load and validate the fleet-config, creates and print a fleet-plan.",
    exe: async (cmd) => {
        const applyVars = await prepareAppyVars(cmd)

        if (applyVars.tasks.length > 0) {
            console.info("===== TASKS =====")
            for (const parallelSet of applyVars.tasks) {
                for (const task of parallelSet) {
                    console.log("| " + task.type + "| " + task.name)
                }
            }
        } else {
            console.info("===== NO TASKS =====") 
        }
    },
    cmds: [
    ],
    flags: deepCopy(apply.flags)
}

export function deepCopy<T>(value: T): T {
    if (value === null) {
        return null
    } else if (Array.isArray(value)) {
        return value.map((value2) => deepCopy(value2)) as T
    } else if (typeof value == "object") {
        const value2: T = {} as T
        for (const key of Object.keys(value)) {
            value2[key] = deepCopy(value[key])
        }
        return value2
    }
    return value
}

export default planDefinition
