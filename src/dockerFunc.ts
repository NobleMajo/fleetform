import { VarInputStream, VarStream } from "./varstream"
import { DockerExecuter } from "./docker"
import { ContainerInfo, NetworkInspectInfo } from "dockerode"
import { Container, FleetPlan } from "src/fleetformTypes"
import { IncomingMessage } from "http"
import * as Dockerode from "dockerode"

export async function pullNeededImages(
    executor: DockerExecuter,
    plan: FleetPlan
): Promise<void> {
    const currentImmages = (await executor.listImages())
        .map((image) => image.RepoTags ? image.RepoTags.shift() : undefined)
        .filter((v) => v != "<none>:<none>" && v != undefined)

    for (let index = 0; index < plan.plannedContainer.length; index++) {
        const containerName = plan.plannedContainer[index]
        const container = plan.container[containerName]
        const conImgTag: string = container.image + ":" + container.tag
        if (!currentImmages.includes(conImgTag)) {
            try {
                await printAndPullImage(executor, conImgTag)
                console.log("Image '" + conImgTag + "' pulled!")
            } catch (err: Error | any) {
                if (typeof err.msg == "string") {
                    err.msg = "Error by pulling image '" + conImgTag + "':\n" + err.msg
                } else {
                    console.error("Unknown error by pulling image '" + conImgTag + "'!")
                }
            }
        }
    }
}

export async function createNetworks(
    executer: DockerExecuter,
    networks: string[],
    prefix: string = ""
): Promise<void> {
    await Promise.all(
        networks.map((networkName) => {
            return createNetwork(
                executer,
                networkName,
                prefix
            )
        })
    )
}

export async function createNetwork(
    executer: DockerExecuter,
    networkName: string,
    prefix: string = "",
): Promise<void> {
    await executer.createNetwork({
        Name: prefix + networkName,
        Labels: {
            name: networkName,
            source: "fleetform",
        },
    })
}

export interface PullDate {
    imageTag: string,
    id: string,
    status: string,
    progress: string,
    total: number,
    current: number,
}

export function stringifyPullDate(
    imageTag: string,
    dataStream: VarInputStream<PullDate>,
    waitTime: number = 300
): VarStream<string> {
    const msgStream: VarStream<string> = new VarStream()
    const msg: string = "# Pull '" + imageTag + "' #"
    let last: number = -1

    msgStream.write(
        msg + "\n" +
        "????????: \n" +
        "Prepare" + "... (0/-1)\n" +
        "...",
        { imageTag: imageTag }
    )

    dataStream.forEach((data) => {
        if (last + waitTime >= Date.now()) {
            return
        }
        last = Date.now()

        msgStream.write(
            msg + "\n" +
            data.id + ": \n" +
            (data.status ?? "Prepare") + "... (" + (data.current ?? 0) + "/" + (data.total ?? -1) + ")\n" +
            (data.progress ?? "..."),
            data
        )
    })

    dataStream.then((meta) => {
        msgStream.write("") //TODO
        msgStream.end(undefined, meta)
    })
    dataStream.catch((err, meta) => {
        msgStream.write("") //TODO
        msgStream.end(err, meta)
    })

    return msgStream
}

export function unescapeUnicode(str: string): string {
    return str.replace(/\\u([a-fA-F0-9]{4})/g, function (g, m1) {
        return String.fromCharCode(parseInt(m1, 16))
    })
}

export async function printAndPullImage(
    executer: DockerExecuter,
    imageTag: string,
): Promise<void> {
    const msgStream = stringifyPullDate(
        imageTag,
        pullImage(executer, imageTag)
    )

    let lastLines: number = 0
    msgStream.forEach((msg) => {
        process.stdout.write(
            unescapeUnicode("\\u001b[" + lastLines + "A") +
            msg + "\n"
        )
        lastLines = msg.split("\n").length
    })

    try {
        await msgStream.toPromise()
    } finally {
        process.stdout.write(
            unescapeUnicode("\\u001b[" + lastLines + "A") + "\n"
        )
    }
}

export function pullImage(
    executer: DockerExecuter,
    imageTag: string
): VarInputStream<PullDate> {
    const dataStream: VarStream<PullDate> = new VarStream()

    executer.pull(imageTag)
        .then((stream: IncomingMessage) => {
            executer.modem.followProgress(
                stream,
                (err) =>
                    err ?
                        dataStream.end(err, { imageTag: imageTag }) :
                        dataStream.end(undefined, { imageTag: imageTag }),
                (data) => dataStream.write({
                    imageTag: imageTag,
                    id: data.id,
                    status: data.status,
                    progress: data.progress,
                    total: data.progressDetail?.total,
                    current: data.progressDetail?.current,
                })
            )
        })

    return dataStream.getInputVarStream()
}

export async function pullImages(
    async: boolean,
    plan: FleetPlan,
    hostName: string,
    executer: DockerExecuter
): Promise<void> {
    if (async) {
        await Promise.all(
            plan.hostImages[hostName].map(
                (imageName: string) => pullImage(executer, imageName)
            )
        )
    } else {
        const images = plan.hostImages[hostName]
        for (let index = 0; index < images.length; index++) {
            const imageName = images[index]
            await pullImage(executer, imageName)
        }
    }


}

export interface HostContainer {
    [host: string]: Container[]
}

export async function runAllContainer(
    executer: DockerExecuter,
    plan: FleetPlan,
): Promise<HostContainer> {
    const hostContainer: HostContainer = {};
    (
        await Promise.all(
            plan.usedHosts.map(
                async (host) => [
                    host,
                    await runHostContainer(
                        executer,
                        host,
                        plan
                    )
                ] as [string, [string, Dockerode.Container][]]
            )
        )
    ).forEach((hostContainer: [string, [string, Dockerode.Container][]]) => {
        const host = hostContainer[0]
        const cons = hostContainer[1]
        cons.forEach((container: [string, Dockerode.Container]) => {
            const containerName = container[0]
            const con = container[1]
            if (!hostContainer[host]) {
                hostContainer[host] = {}
            }
            hostContainer[host][containerName] = con
        })
    })

    return hostContainer
}

export async function createAllContainer(
    executer: DockerExecuter,
    plan: FleetPlan,
): Promise<HostContainer> {
    const hostContainer: HostContainer = {};
    (
        await Promise.all(
            plan.usedHosts.map(
                async (host) => [
                    host,
                    await createHostContainer(
                        executer,
                        host,
                        plan
                    )
                ] as [string, [string, Dockerode.Container][]]
            )
        )
    ).forEach((hostContainer: [string, [string, Dockerode.Container][]]) => {
        const host = hostContainer[0]
        const cons = hostContainer[1]
        cons.forEach((container: [string, Dockerode.Container]) => {
            const containerName = container[0]
            const con = container[1]
            if (!hostContainer[host]) {
                hostContainer[host] = {}
            }
            hostContainer[host][containerName] = con
        })
    })

    return hostContainer
}

export async function createHostContainer(
    executer: DockerExecuter,
    hostName: string,
    plan: FleetPlan,
): Promise<[string, Dockerode.Container][]> {
    const plannedContainer = plan.hostContainer[hostName]
    const container: [string, Promise<Dockerode.Container>][] = []
    for (let index = 0; index < plannedContainer.length; index++) {
        container.push(
            [
                plannedContainer[index],
                createContainer(
                    executer,
                    plannedContainer[index],
                    plan
                )
            ]
        )
    }
    const container2: [string, Dockerode.Container][] = []
    for (let index = 0; index < container.length; index++) {
        const containerData = container[index];
        container2.push([
            containerData[0],
            await containerData[1]
        ])
    }

    return container2
}

export async function runHostContainer(
    executer: DockerExecuter,
    hostName: string,
    plan: FleetPlan,
): Promise<[string, Dockerode.Container][]> {
    const plannedContainer = plan.hostContainer[hostName]
    const container: [string, Promise<Dockerode.Container>][] = []
    for (let index = 0; index < plannedContainer.length; index++) {
        container.push(
            [
                plannedContainer[index],
                runContainer(
                    executer,
                    plannedContainer[index],
                    plan
                )
            ]
        )
    }
    const container2: [string, Dockerode.Container][] = []
    for (let index = 0; index < container.length; index++) {
        const containerData = container[index];
        container2.push([
            containerData[0],
            await containerData[1]
        ])
    }

    return container2
}

export async function createContainer(
    executer: DockerExecuter,
    containerName: string,
    plan: FleetPlan,
): Promise<Dockerode.Container> {
    const containerData = plan.container[containerName]
    const exposePorts: {
        [containerPort: string]: {}
    } = {}
    containerData.expose.forEach(
        (port: string) => {
            exposePorts[port] = {}
        }
    )
    const publishPorts: {
        [containerPort: string]: {}
    } = {}
    Object.keys(containerData.publish).forEach(
        (containerPort: string) => {
            const hostPort = containerData.publish[containerPort]
            publishPorts[containerPort] = [
                {
                    "HostPort": "" + hostPort
                }
            ]
        }
    )

    const binds: string[] = []
    const volumes: {
        [volume: string]: {}
    } = {}

    const volumes2 = Object.keys(containerData.volumes)
    volumes2.forEach((volume) => {
        volumes[volume] = {}
        binds.push(volume + ":" + containerData.volumes[volume])
    })

    return await executer.createContainer({
        name: plan.namePrefix + containerName,
        Labels: {
            name: containerName,
            prefix: plan.namePrefix,
            source: "fleetform",
        },
        Env: Object.keys(containerData.envs).map(
            (key: string) => {
                return key + "=" + containerData.envs[key]
            }
        ),
        Image: containerData.image + ":" + containerData.tag,
        Volumes: volumes,
        ExposedPorts: exposePorts,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        Tty: false,
        Cmd: containerData.args,
        OpenStdin: false,
        StdinOnce: false,
        HostConfig: {
            Binds: binds,
            PortBindings: publishPorts,
            RestartPolicy: {
                Name: "unless-stopped"
            },
            AutoRemove: false
        },
        NetworkingConfig: {
        }
    })
}

export async function runContainer(
    executer: DockerExecuter,
    containerName: string,
    plan: FleetPlan,
): Promise<Dockerode.Container> {
    const con = await createContainer(
        executer,
        containerName,
        plan
    )
    await con.start()
    return con
}


export interface ContainerInfoMap {
    [key: string]: ContainerInfo
}

export interface NetworkInfoMap {
    [key: string]: NetworkInspectInfo
}

export async function getExistingContainer(
    executer: DockerExecuter
): Promise<ContainerInfoMap> {
    const existingContainers = await executer.listContainers({
        all: true
    })
    const existingContainerMap: ContainerInfoMap = {}
    for (let index = 0; index < existingContainers.length; index++) {
        const container = existingContainers[index]

        if (container.Names.length < 1) {
            break
        }
        let name = container.Names[0]
        if (name.startsWith("/")) {
            name = name.substring(1)
        }
        existingContainerMap[name] = container
    }
    return existingContainerMap
}

export async function getExistingNetworks(
    executer: DockerExecuter
): Promise<NetworkInfoMap> {
    const existingNetworks = await executer.listNetworks({
        all: true
    })
    const existingNetworksMap: NetworkInfoMap = {}
    for (let index = 0; index < existingNetworks.length; index++) {
        const network = existingNetworks[index]

        existingNetworksMap[network.Name] = network
    }
    return existingNetworksMap
}

export async function removeContainer(
    executer: DockerExecuter,
    plan: FleetPlan,
    existingContainerMap?: ContainerInfoMap,
) {
    if (!existingContainerMap) {
        existingContainerMap = await getExistingContainer(executer)
    }
    let p: Promise<void>[] = []

    let existingContainer: string[] = Object.keys(existingContainerMap)
    for (let index = 0; index < existingContainer.length; index++) {
        const containerName = existingContainer[index]
        const containerInfo = existingContainerMap[containerName]
        if (
            !containerName.startsWith(plan.namePrefix) &&
            !plan.plannedContainer.includes(containerName.substring(plan.namePrefix.length))
        ) {
            continue;
        }
        const container = executer.getContainer(containerInfo.Id)
        p.push((
            async () => {
                await container.stop().catch(() => { })
                await container.remove().catch(() => { })
            })()
        )
        delete existingContainerMap[containerName]
    }
    await Promise.all(p)

    existingContainer = Object.keys(existingContainerMap)
    for (let index = 0; index < existingContainer.length; index++) {
        const containerName = existingContainer[index]
        const containerInfo = existingContainerMap[containerName]
        if (containerInfo.Labels["source"] != "fleetform") {
            continue;
        }
        const container = executer.getContainer(containerInfo.Id)
        p.push((
            async () => {
                await container.stop().catch(() => { })
                await container.remove().catch(() => { })
            })()
        )
    }
    await Promise.all(p)
}

export async function removeNetworks(
    executer: DockerExecuter,
    plan: FleetPlan,
    existingNetworksMap?: NetworkInfoMap
) {
    if (!existingNetworksMap) {
        existingNetworksMap = await getExistingNetworks(executer)
    }

    const existingNetworks: string[] = Object.keys(existingNetworksMap)
    for (let index = 0; index < existingNetworks.length; index++) {
        const networkName = existingNetworks[index]

        const networkInfo = existingNetworksMap[networkName]

        if (
            !networkName.startsWith(plan.namePrefix) ||
            networkInfo.Labels["source"] != "fleetform"
        ) {
            continue;
        }
        const network = await executer.getNetwork(networkInfo.Id)
        await network.remove().catch(() => { })
    }
}