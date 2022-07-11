import { CmdDefinition, CmdResult, ValueFlag, BoolFlag } from "cmdy"
import { formatPath } from "../lib/fs"
import {
    generateApplyTaskSet,
    getHostResourceInfo,
    getImageHashs,
    handleTask,
    getNeededImages,
    Task,
    cleanDocker,
} from "../task";
import { DockerExecuter } from "../docker/executer";
import { validateFleetSettings } from "../func";
import { importModule } from "../lib/node";
import { printAndPullImage, unescapeUnicode } from "../docker/func";

export const file: ValueFlag = {
    name: "file",
    shorthand: "f",
    description: "The path to a file or a folder with a fleet.json, js or ts file!",
    types: ["string"],
}

export const ignoreTypescript: BoolFlag = {
    name: "ignoreTs",
    alias: ["ignoreTypescript"],
    description: "Don't compile typescript files/projects if found at target file/folder.",
}

export const ignoreJson: BoolFlag = {
    name: "ignoreJson",
    description: "Don't parse json files if found at target file.",
}

export const namePrefix: ValueFlag = {
    name: "namePrefix",
    alias: ["pre", "prefix"],
    description: "Set the container and network prefix (default: 'ff_').",
    types: ["string"],
    default: "ff_"
}

export const renew: ValueFlag = {
    name: "renew",
    alias: ["re", "ren", "rene"],
    shorthand: "r",
    description: "Define containers that should be renewed.",
    types: ["string"]
}

export const updateDelayDays: ValueFlag = {
    name: "updateDelayDays",
    alias: ["upid"],
    description: "Update all images every x days.",
    types: ["number"]
}

export const updateDelayHours: ValueFlag = {
    name: "updateDelayHours",
    alias: ["upih"],
    description: "Update all images every x hours.",
    types: ["number"]
}

export const updateDelayMinutes: ValueFlag = {
    name: "updateDelayMinutes",
    alias: ["upim"],
    description: "Update all images every x minutes.",
    types: ["number"]
}

export const updateDelaySeconds: ValueFlag = {
    name: "updateDelaySeconds",
    alias: ["upis"],
    description: "Update all images every x seconds.",
    types: ["number"]
}

export const cacheTsOutput: BoolFlag = {
    name: "cacheTsOutput",
    alias: ["cto", "cacheTs"],
    shorthand: "c",
    description: "Don't delete typescript compile output files after loading them.",
}

export const dontPruneImages: BoolFlag = {
    name: "dontPruneImages",
    alias: ["dontPruneImage", "dp", "dontPrune"],
    shorthand: "p",
    description: "Don't prune unused images after work.",
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
        renew,
        cacheTsOutput,
        updateDelayDays,
        updateDelayHours,
        updateDelayMinutes,
        updateDelaySeconds,
        dontPruneImages,
    ],
    cmds: [
    ],
    exe: async (cmd) => {
        let file = process.cwd()
        if (
            cmd.valueFlags.file &&
            typeof cmd.valueFlags.file == "string"
        ) {
            file = cmd.valueFlags.file
        }
        file = formatPath(file)
        const ignoreTypescript = cmd.flags.includes("ignorets")
        const ignoreJson = cmd.flags.includes("ignorejson")
        const verbose = cmd.flags.includes("verbose")
        const cacheTsOutput = cmd.flags.includes("cachetsoutput")
        const dontPruneImages = cmd.flags.includes("dontpruneimages")
        const namePrefix = cmd.valueFlags.nameprefix
        const renewContainers = cmd.arrayFlags.renew
        const updateDelayDays = Number(cmd.valueFlags.updatedelaydays)
        const updateDelayHours = Number(cmd.valueFlags.updatedelayhours)
        const updateDelayMinutes = Number(cmd.valueFlags.updatedelayminutes)
        const updateDelaySeconds = Number(cmd.valueFlags.updatedelayseconds)

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
        //TODO multihost feature for apply
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

        const neededImages = getNeededImages(
            settings.container
        )
        verbose && console.debug("Pull images: ", neededImages)
        for (let index = 0; index < neededImages.length; index++) {
            await printAndPullImage(
                executer,
                neededImages[index]
            )
        }

        const imageHashs = await getImageHashs(
            executer,
            neededImages
        )

        const tasks = generateApplyTaskSet(
            res,
            settings.container,
            imageHashs,
            renew,
            [],
            namePrefix,
        )
        if (tasks.length > 0) {
            verbose && console.debug("TASKS:\n", tasks)
            console.info("===== START TASKS =====")
            !verbose && tasks.forEach(
                (parallelTasks) => parallelTasks.forEach(
                    () => process.stdout.write("O")
                )
            )
            !verbose && process.stdout.write(unescapeUnicode("\\u001b[1000D"))
            for (let index = 0; index < tasks.length; index++) {
                const parallelTasks = tasks[index]
                verbose && console.debug("START PARALLEL TASK SET (" + parallelTasks.length + "):")
                verbose && parallelTasks.forEach(
                    (task: Task) => console.info(
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
                verbose && console.debug("WAIT FOR PARALLEL TASK SET:")
                await Promise.all(parallelTasks.map(async (task: Task) => {
                    await handleTask(
                        executer,
                        task
                    )
                    verbose ?
                        console.info(
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
            !verbose && console.debug(" ")
            console.info("===== TASKS FINISHED =====")
        } else {
            console.info("Nothing to do...")
        }

        if (!dontPruneImages) {
            console.info("Prune unused images...")
            await cleanDocker(executer)
            console.info("Unused images pruned!")
        }

        if (cmd.cmd.name == "api") {
            return
        }
        let updateDelayMillis: number = 0
        if (!isNaN(updateDelayDays)) {
            updateDelayMillis += updateDelayDays * 1000 * 60 * 60 * 24
        }
        if (!isNaN(updateDelayHours)) {
            updateDelayMillis += updateDelayHours * 1000 * 60 * 60
        }
        if (!isNaN(updateDelayMinutes)) {
            updateDelayMillis += updateDelayMinutes * 1000 * 60
        }
        if (!isNaN(updateDelaySeconds)) {
            updateDelayMillis += updateDelaySeconds * 1000
        }
        if (updateDelayMillis > 0) {
            const date = new Date(updateDelayMillis)
            let day = Math.round(date.getHours() / 24)
            let hours = date.getHours() % 24
            const time = (
                (day > 0 ? day + "d " : "") +
                (
                    hours > 0 || date.getMinutes() > 0 ?
                        (hours < 10 ? "0" + hours : hours) + ":" +
                        (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()) :
                        ""
                ) +
                (date.getSeconds() > 0 ? " " + date.getSeconds() + "s" : "")
            )
            if (updateDelayMillis < 60 * 1000) {
                throw new Error("The value of 'updateDelay' needs to be minimum 1 minute!\nThe current value is: " + time)
            }
            console.info("FleetForm is running in update interval mode!")
            console.info("Interval time: " + time)
            const pullInterval = async () => {
                for (let index = 0; index < neededImages.length; index++) {
                    await printAndPullImage(
                        executer,
                        neededImages[index],
                    )
                }
                console.info("FleetForm is running in update interval mode!")
                console.info("Interval time: " + time)
                setTimeout(() => pullInterval(), updateDelayMillis)
            }
            setTimeout(() => pullInterval(), updateDelayMillis)
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

export default applyDefinition
