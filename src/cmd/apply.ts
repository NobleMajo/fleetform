import { Flag, CmdDefinition } from "cmdy"
import { DockerExecuter } from "../docker/DockerExecuter"
import { formatPath, writeJson } from "../lib/files"
import { connectAllDockerHosts, parseFleetPlan, validateFleetSettings } from "../fleetform/fleetformFunc"
import { importModule } from "../lib/node"
import { ContainerMap, FleetSettings } from "../fleetform/fleetformTypes"
import {
    createContainers,
    createNetworks,
    pullNeededImages,
    removeContainer,
    removeNetworks
} from "../docker/dockerFunc"

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
        const namePrefix = cmd.valueFlags.nameprefix[0]
        const outFile = cmd.valueFlags.outfile[0]
        let currentHost = cmd.valueFlags.currenthost[0]
        if (typeof currentHost != "string") {
            currentHost = undefined
        }
        let timeout = Number(cmd.valueFlags.timeout[0])
        if (timeout == NaN || typeof timeout != "number") {
            timeout = -1
        }
        if (verbose) {
            console.info("# VERBOSE #", {
                file,
                ignoreTypescript,
                ignoreJson,
                verbose,
                flags: cmd.flags,
                flagValues: cmd.valueFlags
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
        const fleetSettings: FleetSettings = validateFleetSettings(data, currentHost, namePrefix)
        console.info("# FLEET CONFIG VALID #")
        const plan = parseFleetPlan(fleetSettings)
        if (printData) {
            console.info("# FLEET SETTINGS #", plan)
        }
        if (outFile) {
            await writeJson(
                formatPath(outFile),
                plan as any
            )
            console.info("# OUTPUT FILE READY #")
        }
        const connections = await connectAllDockerHosts(plan, false)
        const usedHosts = Object.keys(plan.hostContainer)
        for (let index = 0; index < usedHosts.length; index++) {
            const hostName = usedHosts[index]
            const executer: DockerExecuter = connections[hostName].executer

            if (destroy) {
                console.info("# REMOVE NETWORKS AND CONTAINERS #")
                await Promise.all([
                    removeContainer(
                        executer,
                        plan.namePrefix,
                        plan.plannedContainer,
                    )
                        .forEach((container) => {
                            if (container[0]) {
                                console.log(" - Container '" + container[1] + "' deleted!")
                            } else {
                                console.log(" - Delete '" + container[1] + "' container...")
                            }
                        })
                        .toPromise(),
                    removeNetworks(
                        executer,
                        plan.namePrefix,
                    )
                        .forEach((network) => {
                            if (network[0]) {
                                console.log(" - Network '" + network[1] + "' deleted!")
                            } else {
                                console.log(" - Delete '" + network[1] + "' network...")
                            }
                        })
                        .toPromise()
                ])
            }

            console.info("# APPLY NETWORKS #")
            let networks = plan.dockerHostNetworks[hostName]
            if (!destroy) {
                const realNetworks: string[] = await executer
                    .listNetworks()
                    .then((networks) => {
                        return networks.map((network) => {
                            return network.Name
                        })
                    })
                networks = networks.filter((n) => !realNetworks.includes(n))
            }
            networks.forEach((network) => {
                console.log(" - Create network '" + network + "'...")
            })
            await createNetworks(
                executer,
                networks,
                plan.namePrefix,
            )
            networks.forEach((network) => {
                console.log(" - Network '" + network + "' created!")
            })

            console.info("# PULL IMAGES #")
            await pullNeededImages(
                executer,
                plan.neededImages,
            )

            console.info("# APPLY CONTAINER #")

            let plannedHostContainers = plan.hostContainer[hostName]
            if (!destroy) {
                const realContainers: string[] = []
                await executer
                    .listContainers()
                    .then((containers) => {
                        containers.forEach((container) => {
                            const names = container.Names
                                .map((name) => {
                                    if (name && name.startsWith("/")) {
                                        return name.substring(1)
                                    }
                                })
                            for (let index = 0; index < names.length; index++) {
                                let name = names[index]
                                if (
                                    !name ||
                                    name.length < 0 ||
                                    !name.startsWith(plan.namePrefix)
                                ) {
                                    continue
                                }
                                name = name.substring(plan.namePrefix.length)
                                realContainers.push(name)
                                return
                            }
                        })
                    })
                plannedHostContainers = plannedHostContainers.filter((n) => !realContainers.includes(n))
            }
            const containers: ContainerMap = {}
            plannedHostContainers.forEach((containerName) => {
                containers[containerName] = plan.container[containerName]
                console.log(" - Create container '" + containerName + "'...")
            })

            await createContainers(
                executer,
                containers,
                plan.namePrefix
            )
                .map(async (c) => {
                    const containerName = c[0]
                    const container = c[1]
                    console.log(" - Start '" + containerName + "'...")
                    await container.start()
                    return containerName
                })
                .forEach((containerName) => {
                    console.log(" - Container '" + containerName + "' started!")
                })
                .toPromise()
        }
    }
}

export default applyDefinition