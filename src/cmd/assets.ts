import { CmdResult } from "cmdy"
import { importModule, isTsNode } from "../lib/node"
import { FleetSettings, FleetPlan, ContainerMap } from '../fleetform/fleetformTypes';
import { validateFleetSettings, parseFleetPlan, connectAllDockerHosts } from '../fleetform/fleetformFunc';
import { DockerExecuter } from '../docker/DockerExecuter';
import { writeJson, formatPath } from '../lib/fs';
import { VarInputStream, VarStream } from '../lib/varstream';
import * as fs from "fs"
import {
    removeContainers,
    removeNetworks,
    createContainers,
    pullNeededImages,
    createNetworks
} from '../docker/dockerFunc';

export function watchConfig(
    path: string
): VarInputStream<"rename" | "change"> {
    if (isTsNode) {
        throw new Error("Can't watch files in tsnode!")
    }
    const stream = new VarStream<"rename" | "change">()
    fs.watch(
        path,
        {
            recursive: true,
        },
        (event) => stream.write(event)
    )
    return stream.getInputVarStream()
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
    return data
}

export async function loadFleetPlan(
    data: any,
    currentHost: string,
    namePrefix: string,
    printData: boolean
): Promise<FleetPlan> {
    const fleetSettings: FleetSettings = validateFleetSettings(data, currentHost, namePrefix)
    console.info("# FLEET CONFIG VALID #")
    const plan = parseFleetPlan(fleetSettings)
    if (printData) {
        console.info("# FLEET SETTINGS #", plan)
    }
    return plan
}

export async function applyPlan(
    plan: FleetPlan,
    outFile: string | undefined,
    renewContainers: string[],
    destroy: boolean,
): Promise<void> {
    if (outFile) {
        await writeJson(
            formatPath(outFile),
            plan as any
        )
        console.info("# OUTPUT FILE READY #")
    }
    const connections = await connectAllDockerHosts(plan, false)
    const usedHosts = Object.keys(plan.hostContainer)
    for (const host of usedHosts) {
        await applyHost(
            connections[host].executer,
            plan,
            host,
            renewContainers,
            destroy,
        )
    }
}

export async function applyHost(
    executer: DockerExecuter,
    plan: FleetPlan,
    host: string,
    renewContainers: string[],
    destroy: boolean,
): Promise<void> {
    if (destroy) {
        console.info("# REMOVE NETWORKS AND CONTAINERS #")
        await Promise.all([
            removeContainers(
                executer,
                undefined,
                undefined,
                plan.namePrefix,
            )
                .map((result) => result[0] == "ignored" ? undefined : result)
                .forEach((result) => {
                    if (result[0] == "deleting") {
                        console.log(" - Delete '" + result[1] + "' container...")
                    } else {
                        console.log(" - Container '" + result[1] + "' " + result[0] + "!")
                    }
                })
                .toPromise(),
            removeNetworks(
                executer,
                undefined,
                undefined,
                plan.namePrefix,
            )
                .map((result) => result[0] == "ignored" ? undefined : result)
                .forEach((result) => {
                    if (result[0] == "deleting") {
                        console.log(" - Delete '" + result[1] + "' network...")
                    } else {
                        console.log(" - Network '" + result[1] + "' " + result[0] + "!")
                    }
                })
                .toPromise(),
        ])
    } else {
        if (renewContainers && renewContainers.length > 0) {
            await removeContainers(
                executer,
                renewContainers,
                undefined,
                plan.namePrefix,
            )
                .map((result) => result[0] == "ignored" ? undefined : result)
                .forEach((result) => {
                    if (result[0] == "deleting") {
                        console.log(" - Delete '" + result[1] + "' container...")
                    } else {
                        console.log(" - Container '" + result[1] + "' " + result[0] + "!")
                    }
                })
                .toPromise()
        }
        console.info("# REMOVE NETWORKS AND CONTAINERS #")
        await Promise.all([
            removeContainers(
                executer,
                undefined,
                plan.hostContainer[host],
                plan.namePrefix
            )
                .map((result) => result[0] == "ignored" ? undefined : result)
                .forEach((result) => {
                    if (result[0] == "deleting") {
                        console.log(" - Delete '" + result[1] + "' container...")
                    } else {
                        console.log(" - Container '" + result[1] + "' " + result[0] + "!")
                    }
                })
                .toPromise(),
            removeNetworks(
                executer,
                undefined,
                plan.dockerHostNetworks[host],
                plan.namePrefix,
            )
                .map((result) => result[0] == "ignored" ? undefined : result)
                .forEach((result) => {
                    if (result[0] == "deleting") {
                        console.log(" - Delete '" + result[1] + "' network...")
                    } else {
                        console.log(" - Network '" + result[1] + "' " + result[0] + "!")
                    }
                })
                .toPromise()
        ])
    }

    console.info("# APPLY NETWORKS #")
    let networks = plan.dockerHostNetworks[host]
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

    let plannedHostContainers = plan.hostContainer[host]
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
        plannedHostContainers = plannedHostContainers.filter(
            (n) => {
                return renewContainers.includes(n) && !realContainers.includes(n)
            }
        )
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