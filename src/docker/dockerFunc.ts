import { VarInputStream, VarStream } from "../lib/varstream"
import { DockerExecuter } from "./DockerExecuter"
import { ContainerInfo } from "dockerode"
import { IncomingMessage } from "http"
import * as Dockerode from "dockerode"
import { Container } from "./dockerTypes"

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
    prefix: string
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
    prefix: string,
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

export function createContainers(
    executer: DockerExecuter,
    containerMap: {
        [key: string]: Container
    },
    prefix: string,
): VarInputStream<[string, Dockerode.Container]> {
    const varStream = new VarStream<[string, Dockerode.Container]>()

    const promises = Object.keys(containerMap)
        .map(
            async (containerName) =>
                varStream.write([
                    containerName,
                    await createContainer(
                        executer,
                        containerName,
                        containerMap[containerName],
                        prefix
                    )
                ])
        )

    Promise.all(promises)
        .then(() => varStream.end())
        .catch((err) => varStream.end(err))

    return varStream.getInputVarStream()
}

export async function createContainer(
    executer: DockerExecuter,
    name: string,
    containerConfig: Container,
    prefix: string,
): Promise<Dockerode.Container> {
    const exposePorts: {
        [containerPort: string]: {}
    } = {}
    containerConfig.expose.forEach(
        (port: string) => {
            exposePorts[port] = {}
        }
    )
    const publishPorts: {
        [containerPort: string]: {}
    } = {}
    Object.keys(containerConfig.publish).forEach(
        (containerPort: string) => {
            const hostTarget = containerConfig.publish[containerPort]
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

    const volumes2 = Object.keys(containerConfig.volumes)
    volumes2.forEach((volume) => {
        volumes[volume] = {}
        binds.push(volume + ":" + containerConfig.volumes[volume])
    })

    return await executer.createContainer({
        name: prefix + name,
        Labels: {
            name: name,
            prefix: prefix,
            source: "fleetform",
        },
        Env: Object.keys(containerConfig.envs).map(
            (key: string) => {
                return key + "=" + containerConfig.envs[key]
            }
        ),
        Image: containerConfig.image + ":" + containerConfig.tag,
        Volumes: volumes,
        ExposedPorts: exposePorts,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        Tty: containerConfig.tty,
        Cmd: containerConfig.args,
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

export interface ContainerInfoMap {
    [key: string]: ContainerInfo
}

export function removeContainers(
    executer: DockerExecuter,
    include?: string[] | undefined,
    exclude?: string[] | undefined,
    prefix?: string,
    labelKey: string | undefined = "source",
    labelValue: string | undefined = "fleetform"
): VarInputStream<[boolean, string]> {
    const varStream = new VarStream<[boolean, string]>()
    executer
        .listContainers({
            all: true
        })
        .then((containerInfos) => {
            let promises: Promise<void>[] = []

            for (
                let index = 0;
                index < containerInfos.length;
                index++
            ) {
                const containerInfo = containerInfos[index]
                if (containerInfo.Names.length == 0) {
                    break
                }
                let name = containerInfo.Names[0]
                if (name.startsWith("/")) {
                    name = name.substring(1)
                }
                if (name.length == 0) {
                    break
                }
                if (
                    labelKey &&
                    labelValue &&
                    containerInfo.Labels[labelKey] != labelValue
                ) {
                    continue
                }
                if (prefix) {
                    if (
                        !name.startsWith(prefix)
                    ) {
                        if (
                            !include ||
                            include.includes(
                                name.substring(prefix.length)
                            )
                        ) {
                            continue
                        }
                        if (
                            exclude &&
                            exclude.includes(
                                name.substring(prefix.length)
                            )
                        ) {
                            continue
                        }
                    }
                }
                varStream.write([false, name])
                const container = executer.getContainer(containerInfo.Id)
                promises.push((async () => {
                    await container.stop().catch(() => { })
                    await container.remove()
                    varStream.write([true, name])
                })())
            }

            Promise.all(promises)
                .then(() => varStream.end())
                .catch((err) => varStream.end(err))
        })

    return varStream.getInputVarStream()
}

export function removeNetworks(
    executer: DockerExecuter,
    include?: string[] | undefined,
    exclude?: string[] | undefined,
    prefix?: string,
    labelKey: string | undefined = "source",
    labelValue: string | undefined = "fleetform"
): VarInputStream<[boolean, string]> {
    const varStream = new VarStream<[boolean, string]>()
    executer
        .listNetworks({
            all: true
        })
        .then((networks) => {
            const promises: Promise<void>[] = []
            for (
                let index = 0;
                index < networks.length;
                index++
            ) {
                const networkInfo = networks[index]
                let name = networkInfo.Name
                if (name.startsWith("/")) {
                    name = name.substring(1)
                }
                if (name.length == 0) {
                    break
                }

                if (
                    labelKey &&
                    labelValue &&
                    networkInfo.Labels[labelKey] != labelValue
                ) {
                    continue
                }
                if (prefix) {
                    if (
                        !name.startsWith(prefix)
                    ) {
                        if (
                            !include ||
                            include.includes(
                                name.substring(prefix.length)
                            )
                        ) {
                            continue
                        }
                        if (
                            exclude &&
                            exclude.includes(
                                name.substring(prefix.length)
                            )
                        ) {
                            continue
                        }
                    }
                }
                varStream.write([false, name])
                promises.push((async () => {
                    await executer
                        .getNetwork(networkInfo.Id)
                        .remove().catch(() => { })
                    varStream.write([true, name])
                })())
            }
            Promise.all(promises)
                .then(() => varStream.end())
                .catch((err) => varStream.end(err))
        })


    return varStream.getInputVarStream()
}