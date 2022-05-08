import { CmdDefinition, CmdResult } from "cmdy"
import { formatPath } from "../lib/fs"
import {
    cleanDocker,
    generateDeleteTaskSet,
    getHostResourceInfo,
    handleTask,
    Task,
} from "../task";
import { DockerExecuter } from "../docker/executer";
import { validateFleetSettings } from "../func";
import { importModule } from "../lib/node";
import { unescapeUnicode } from "../docker/func";
import {
    file,
    ignoreTypescript,
    ignoreJson,
    namePrefix,
    cacheTsOutput,
    dontPruneImages,
} from "./apply";

export const deleteDefinition: CmdDefinition = {
    name: "delete",
    alias: ["delet", "dele", "del"],
    description: "Delete the fleetplan container infrstructure.",
    details: "Load and validate the fleet-config, creates and print a fleet-plan and test the defined host connections.",
    flags: [
        file,
        ignoreTypescript,
        ignoreJson,
        namePrefix,
        cacheTsOutput,
        dontPruneImages,
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
        const cacheTsOutput = cmd.flags.includes("cachetsoutput")
        const dontPruneImages = cmd.flags.includes("dontpruneimages")
        const namePrefix = cmd.valueFlags.nameprefix[0]

        const data = await importData(
            verbose,
            cmd,
            file,
            ignoreTypescript,
            ignoreJson,
            !cacheTsOutput
        )
        const settings = validateFleetSettings(
            data,
            namePrefix,
        )
        //TODO multihost feature for delete
        const executer = await DockerExecuter.createExecuter()
        const res = await getHostResourceInfo(
            executer,
            namePrefix,
        )

        const tasks = generateDeleteTaskSet(
            res,
            namePrefix,
        )
        if (tasks.length > 0) {
            verbose && console.log("TASKS:\n", tasks)
            console.log("===== START TASKS =====")
            !verbose && tasks.forEach(
                (parallelTasks) => parallelTasks.forEach(
                    () => process.stdout.write("O")
                )
            )
            !verbose && process.stdout.write(unescapeUnicode("\\u001b[1000D"))
            for (let index = 0; index < tasks.length; index++) {
                const parallelTasks = tasks[index]
                verbose && console.log("START PARALLEL TASK SET (" + parallelTasks.length + "):")
                verbose && parallelTasks.forEach(
                    (task: Task) => console.log(
                        " - " +
                        task.type.toUpperCase() + " '" +
                        task.name +
                        (
                            (task as any).target ?
                                "<-'" + (task as any).target :
                                "'"
                        ) +
                        "'..."
                    )
                )
                verbose && console.log("WAIT FOR PARALLEL TASK SET:")
                await Promise.all(parallelTasks.map(async (task: Task) => {
                    await handleTask(
                        executer,
                        task
                    )
                    verbose ?
                        console.log(
                            " - " +
                            task.type.toUpperCase() + " '" +
                            task.name +
                            "'" +
                            (
                                (task as any).target ?
                                    "<-'" + (task as any).target + "'" :
                                    ""
                            ) +
                            "!"
                        ) :
                        process.stdout.write("X")
                }))
            }
            !verbose && console.log(" ")
            console.log("===== TASKS FINISHED =====")
        } else {
            console.log("Nothing to do...")
        }

        if (!dontPruneImages) {
            console.log("Prune unused images...")
            await cleanDocker(executer)
            console.log("Unused images pruned!")
        }
    }
}

export async function importData(
    verbose: boolean,
    cmd: CmdResult,
    file: string,
    ignoreTypescript: boolean,
    ignoreJson: boolean,
    deleteCompiledOutput: boolean,
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
        deleteCompiledOutput: deleteCompiledOutput,
    })
    console.info("# FLEET CONFIG FOUND #")
    if (data.default) {
        data = data.default
    }
    return data
}

export default deleteDefinition