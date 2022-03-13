import { Flag, CmdDefinition } from "cmdy"
import { formatPath } from "../lib/fs"
import {
    generateHostTaskSet,
    getHostResourceInfo,
    handleTask,
    Task,
} from '../task';
import { DockerExecuter } from '../docker/DockerExecuter';
import { validateFleetSettings } from "../fleetform/fleetformFunc";
import { CmdResult } from 'cmdy';
import { importModule } from "../lib/node";

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

export const taskStat: Flag = {
    name: "taskStat",
    shorthand: "s",
    description: "Print if a task starts and stops.",
}

export const tasks: Flag = {
    name: "tasks",
    shorthand: "t",
    description: "Print needed apply tasks in the console.",
}

export const namePrefix: Flag = {
    name: "namePrefix",
    alias: ["pre", "prefix"],
    description: "Set the container and network prefix (default: 'ff-').",
    types: ["string"],
    default: "ff_"
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
    alias: ["appl", "app", "pply"],
    description: "Applys the fleetplan container infrstructure.",
    details: "Load and validate the fleet-config, creates and print a fleet-plan and test the defined host connections.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        namePrefix,
        outFile,
        tasks,
        taskStat,
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
        const printTasks = cmd.flags.includes("tasks")
        const taskStat = cmd.flags.includes("taskstat")
        const namePrefix = cmd.valueFlags.nameprefix[0]
        const renewContainers = cmd.valueFlags.renew

        const data = await importData(
            verbose,
            cmd,
            file,
            ignoreTypescript,
            ignoreJson,
        )
        const settings = validateFleetSettings(
            data,
            namePrefix,
        )
        const executer = await DockerExecuter.createExecuter()
        const res = await getHostResourceInfo(
            executer,
            namePrefix,
        )
        const renew: string[] = [
            ...renewContainers,
            ...(
                cmd && typeof (cmd as any).task == "function" ?
                    await ((cmd as any).task(settings.container, executer)) :
                    []
            )
        ]

        const task = generateHostTaskSet(
            res,
            settings.container,
            renew,
            [],
            namePrefix,
        )
        if (printTasks) {
            console.log("TASKS:\n", task)
        }
        for (let index = 0; index < task.length; index++) {
            const parallelTasks = task[index]
            await Promise.all(parallelTasks.map(async (task: Task) => {
                if (taskStat) {
                    console.log(
                        " + TASK: " + task.type + ": " +
                        task.name +
                        ((task as any).target ? " " + (task as any).target + "..." : "...")
                    )
                }
                await handleTask(
                    executer,
                    task
                )
                if (taskStat) {
                    console.log(
                        " - " + task.type + ": " +
                        task.name +
                        ((task as any).target ? " " + (task as any).target + " done!" : " done!")
                    )
                }
            }))
        }
    }
}

export async function importData(
    verbose: boolean,
    cmd: CmdResult,
    file: string,
    ignoreTypescript: boolean,
    ignoreJson: boolean,
): Promise<any> {
    if (verbose) {
        console.info("# VERBOSE #", {
            file,
            ignoreTypescript,
            ignoreJson,
            verbose,
            flags: cmd.flags,
            flagValues: cmd.valueFlags,
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
    return data
}

export default applyDefinition