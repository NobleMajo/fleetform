import { VarInputStream, VarStream } from "../lib/varstream"
import { DockerExecuter } from "./executer"
import { ContainerInfo } from "dockerode"
import { IncomingMessage } from "http"
import { Network, Container } from "dockerode"
import {
    getContainerCreateSetting,
    ContainerCreateOptions
} from "./types"

export type RemoveResultName = "deleting" | "deleted" | "ignored" | "warning" | "error"
export type RemoveResult = [RemoveResultName, string | Error]

export interface PullDate {
    imageTag: string,
    id: string,
    status: string,
    progress: string,
    total: number,
    current: number,
}

export interface ContainerInfoMap {
    [key: string]: ContainerInfo
}

export async function pullNeededImages(
    executor: DockerExecuter,
    plannedImages: string[]
): Promise<void> {
    const currentImages = (await executor.listImages())
        .map((image) => image.RepoTags ? image.RepoTags.shift() : undefined)
        .filter((v) => v != "<none>:<none>" && v != undefined)

    for (let index = 0; index < plannedImages.length; index++) {
        const conImgTag: string = plannedImages[index]
        if (!currentImages.includes(conImgTag)) {
            try {
                await printAndPullImage(executor, conImgTag)
                console.info("Image '" + conImgTag + "' pulled!")
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

export async function createNetwork(
    executer: DockerExecuter,
    networkName: string,
    labels: {
        [key: string]: string
    }
): Promise<void> {
    await executer.createNetwork({
        Name: networkName,
        Labels: labels,
    })
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
        let reset = ""
        let i: number = 0
        while (i < lastLines) {
            reset += unescapeUnicode("\\u001b[2K") +
                unescapeUnicode("\\u001b[1A")
            i++
        }
        process.stdout.write(
            reset +
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

export async function createContainer(
    executer: DockerExecuter,
    options: ContainerCreateOptions,
): Promise<Container> {
    const settings = getContainerCreateSetting(options)
    const exposePorts: {
        [containerPort: string]: {}
    } = {}
    settings.expose.forEach(
        (port: string) => {
            exposePorts[port] = {}
        }
    )
    const publishPorts: {
        [containerPort: string]: {}
    } = {}
    Object.keys(settings.publish).forEach(
        (containerPort: string) => {
            const hostTarget = settings.publish[containerPort]
            publishPorts[containerPort] = [
                {
                    "HostIp": hostTarget[0],
                    "HostPort": "" + hostTarget[1],
                }
            ]
            exposePorts[containerPort] = {}
        }
    )

    const binds: string[] = []
    const volumes: {
        [volume: string]: {}
    } = {}

    const volumes2 = Object.keys(settings.volumes)
    volumes2.forEach((volume) => {
        volumes[volume] = {}
        binds.push(volume + ":" + settings.volumes[volume])
    })

    return await executer.createContainer({
        name: settings.name,
        Labels: settings.labels,
        Env: Object.keys(settings.envs).map(
            (key: string) => {
                return key + "=" + settings.envs[key]
            }
        ),
        Image: settings.image,
        Volumes: volumes,
        ExposedPorts: exposePorts,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        Tty: settings.tty,
        Cmd: settings.args,
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
    })
}

export async function disconnectAllNetworks(
    executer: DockerExecuter,
    info: ContainerInfo,
): Promise<void> {
    await Promise.all(
        Object.values(info.NetworkSettings.Networks).map(
            async (netInfo) => {
                if (netInfo.NetworkID.length < 1) {
                    return
                }
                await executer
                    .getNetwork(netInfo.NetworkID)
                    .disconnect({
                        "Container": info.Id,
                        "Force": true,
                    })
                    .catch(() => { })
            }

        )
    )
}

export async function connect(
    executer: DockerExecuter,
    containerName: string,
    networkName: string,
    labels: {
        [key: string]: string
    },
): Promise<void> {
    const keys = labels ? Object.keys(labels) : undefined
    const [containers, networks] = await Promise.all([
        executer.listContainers({
            all: true,
        }),
        executer.listNetworks(),
    ])
    await Promise.all(containers.map(async (conInfo) => {
        let conName = conInfo.Names[0]
        if (conName.startsWith("/")) {
            conName = conName.substring(1)
        }
        if (conName !== containerName) {
            return
        }
        if (keys) {
            for (let index = 0; index < keys.length; index++) {
                const key = keys[index]
                const value = labels[key]
                if (conInfo.Labels[key] !== value) {
                    return
                }
            }
        }
        await Promise.all(networks.map(async (netInfo) => {
            let netName = netInfo.Name
            if (netName.startsWith("/")) {
                netName = netName.substring(1)
            }
            if (netName !== networkName) {
                return
            }
            if (keys) {
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index]
                    const value = labels[key]
                    if (netInfo.Labels[key] !== value) {
                        return
                    }
                }
            }
            await executer
                .getNetwork(netInfo.Id)
                .connect({
                    "Container": conInfo.Id,
                })
        }))
    }))
}

export async function detachContainer(
    executer: DockerExecuter,
    name: string,
    labels?: {
        [key: string]: string
    }
): Promise<void> {
    const keys = labels ? Object.keys(labels) : undefined
    const containerInfo = await executer.listContainers({
        all: true,
    })

    await Promise.all(containerInfo.map(
        async (conInfo) => {
            let conName = conInfo.Names[0]
            if (conName.startsWith("/")) {
                conName = conName.substring(1)
            }
            if (conName !== name) {
                return
            }
            if (keys) {
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index]
                    const value = labels[key]
                    if (conInfo.Labels[key] !== value) {
                        return
                    }
                }
            }
            await disconnectAllNetworks(
                executer,
                conInfo,
            )
        }
    ))
}

export async function disconnectAllContainer(
    network: Network
): Promise<void> {
    const info = await network.inspect()
    if (!info.Containers) {
        return
    }
    await Promise.all(Object.keys(info.Containers).map(
        (containerId) => network.disconnect({
            "Container": containerId,
            "Force": true,
        }).catch(() => { })
    ))
}

export async function removeNetwork(
    executer: DockerExecuter,
    name: string,
    labels?: {
        [key: string]: string
    }
): Promise<void> {
    const keys = labels ? Object.keys(labels) : undefined
    const networkInfos = await executer.listNetworks()

    await Promise.all(networkInfos.map(
        async (netInfo) => {
            let netName = netInfo.Name
            if (netName.startsWith("/")) {
                netName = netName.substring(1)
            }
            if (netName !== name) {
                return
            }
            if (keys) {
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index]
                    const value = labels[key]
                    if (netInfo.Labels[key] !== value) {
                        return
                    }
                }
            }
            let network: Network = executer.getNetwork(netInfo.Id)
            await disconnectAllContainer(network)
            await network.remove()
        }
    ))
}

export async function removeContainer(
    executer: DockerExecuter,
    name: string,
    labels?: {
        [key: string]: string
    }
): Promise<void> {
    const keys = labels ? Object.keys(labels) : undefined
    const containerInfo = await executer.listContainers({
        all: true,
    })

    await Promise.all(containerInfo.map(
        async (conInfo) => {
            let conName = conInfo.Names[0]
            if (conName.startsWith("/")) {
                conName = conName.substring(1)
            }
            if (conName !== name) {
                return
            }
            if (keys) {
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index]
                    const value = labels[key]
                    if (conInfo.Labels[key] !== value) {
                        return
                    }
                }
            }
            await disconnectAllNetworks(
                executer,
                conInfo
            )
            const container = executer.getContainer(conInfo.Id)
            //await container.stop().catch()
            await container.remove({
                force: true
            })
        }
    ))
}

export async function startContainer(
    executer: DockerExecuter,
    name: string,
    labels?: {
        [key: string]: string
    }
): Promise<void> {
    const keys = labels ? Object.keys(labels) : undefined
    const containerInfo = await executer.listContainers({
        all: true,
    })
    await Promise.all(containerInfo.map(
        async (conInfo) => {
            let conName = conInfo.Names[0]
            if (conName.startsWith("/")) {
                conName = conName.substring(1)
            }
            if (conName !== name) {
                return
            }
            if (keys) {
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index]
                    const value = labels[key]
                    if (conInfo.Labels[key] !== value) {
                        return
                    }
                }
            }
            await executer.getContainer(conInfo.Id).start()
        }
    ))
}
