import {
    ContainerPlan,
    ContainerMap,
    FleetSettings,
} from "./types"
import { DockerExecuterOptions } from "./docker/types"
import { DockerExecuter } from "./docker/executer"

export interface ConnectionInfo {
    type: "error" | "success",
    hostname: string,
    executer?: DockerExecuter,
    executerOptions?: DockerExecuterOptions,
    err?: Error | any,
    [key: string]: any,
}

export interface ConnectionInfoMap {
    [hostname: string]: ConnectionInfo,
}

export const allowedKeys: string[] = ["enabled", "image", "tag", "publish", "expose", "envs", "volumes", "networks", "args", "host", "tty"]

export function parseContainer(
    container: string,
    obj: any,
): ContainerPlan {
    if (
        typeof obj != "object" ||
        Array.isArray(obj) ||
        obj == null
    ) {
        throw new Error("Container '" + container + "' is not a object!")
    }
    const keys = Object.keys(obj)
    keys.forEach((key: string) => {
        if (!allowedKeys.includes(key)) {
            throw new Error("The key '" + key + "' is not allowed for a container '" + container + "'!")
        }
    })
    if (typeof obj.enabled != "boolean") {
        obj.enabled = true
    }
    if (typeof obj.image != "string") {
        throw new Error("The key 'image' of container '" + container + "' need to be a string!")
    }
    if (typeof obj.tag != "string") {
        obj.tag = "latest"
    }
    if (
        typeof obj.publish != "object" ||
        Array.isArray(obj.publish) ||
        obj.publish == null
    ) {
        obj.publish = {}
    }
    for (const key of Object.keys(obj.publish)) {
        const splittedKey: (number | string)[] = key.split("/")
        splittedKey[0] = Number(splittedKey[0])
        if (
            splittedKey.length != 2 ||
            isNaN(splittedKey[0]) ||
            typeof splittedKey[1] != "string" ||
            splittedKey[1].length < 1
        ) {
            throw new Error("The publish key '" + key + "' is not a valid key like: '80/tcp' (<port>/<protocol>)")
        }
        const value = obj.publish[key]
        let address: string = ""
        let port: number = -1
        if (!isNaN(value)) {
            port = value
        } else if (Array.isArray(value)) {
            address = value[0]
            port = Number(value[1])
            if (typeof address != "string") {
                throw new Error("The first tuple type of the publish port '" + key + "' needs to be a host as string ([host: string, port: number])")
            } else if (isNaN(port)) {
                throw new Error("The second tuple type of the publish port '" + key + "' needs to be a port as number ([host: string, port: number])")
            }
        } else if (typeof value == "string") {
            const index = value.lastIndexOf(":")
            if (index < 1) {
                throw new Error("The publish value of '" + key + "' has not port (<host: string>:<port: number>)")
            }
            address = value.substring(0, index)
            port = Number(value.substring(index + 1))
            if (typeof address != "string") {
                throw new Error("The first tuple type of the publish port '" + key + "' needs to be a host as string ([host: string, port: number])")
            } else if (isNaN(port)) {
                throw new Error("The second tuple type of the publish port '" + key + "' needs to be a port as number ([host: string, port: number])")
            }
        } else {
            throw new Error("The publish value '" + key + "' is not a number, string or tuple with address or/and port")
        }
        if (address.length == 0) {
            address = "0.0.0.0"
        }
        if (port < 0 || port > 65535) {
            throw new Error("The port is not a valid port: '" + port + "'")
        }
        obj.publish[key] = [address, port]
    }
    if (
        typeof obj.expose != "object" ||
        Array.isArray(obj.expose) ||
        obj.expose == null
    ) {
        obj.expose = []
    }
    if (
        typeof obj.envs != "object" ||
        Array.isArray(obj.envs) ||
        obj.envs == null
    ) {
        obj.envs = {}
    }
    if (
        typeof obj.volumes != "object" ||
        Array.isArray(obj.volumes) ||
        obj.volumes == null
    ) {
        obj.volumes = {}
    }
    if (!Array.isArray(obj.networks)) {
        obj.networks = []
    }
    if (!Array.isArray(obj.args)) {
        obj.args = []
    }
    if (typeof obj.tty != "boolean") {
        obj.tty = false
    }
    return obj
}

export function parseContainerMap(
    obj: any
): ContainerMap {
    if (
        typeof obj != "object" ||
        Array.isArray(obj) ||
        obj == null
    ) {
        throw new Error("'container' is not a object!")
    }
    const map: ContainerMap = {}
    Object.keys(obj).forEach((key: string) => {
        map[key.toLowerCase()] = parseContainer(key, obj[key])
    })
    return map
}

export function containerExists(name: string, container: ContainerMap): boolean {
    const containerNames = Object.keys(container)

    for (let index = 0; index < containerNames.length; index++) {
        const hostName = containerNames[index];
        if (hostName.toLowerCase() == name.toLowerCase()) {
            return true
        }
    }
    return false
}

export function getContainer(name: string, container: ContainerMap): ContainerPlan | undefined {
    const containerNames = Object.keys(container)

    for (let index = 0; index < containerNames.length; index++) {
        const containerName = containerNames[index];
        if (containerName.toLowerCase() == name.toLowerCase()) {
            return containerNames[containerName]
        }
    }
    return undefined
}

export function validateFleetSettings(
    obj: any,
    namePrefix?: string
): FleetSettings {
    if (typeof namePrefix != "string") {
        namePrefix = obj["namePrefix"]
    }
    if (typeof namePrefix != "string") {
        namePrefix = "ff_"
    }
    return {
        namePrefix: namePrefix,
        container: parseContainerMap(obj["container"])
    }
}
