import { hostname } from "os"
import { Container, ContainerMap, FleetData, FleetDataError, Host, HostMap, HostRoutes } from "./fleetformType"

export const allowedKeys: string[] = ["image", "tag", "publish", "expose", "envs", "volumes", "networks", "args", "host"]

export function parseContainer(container: string, obj: any): Container {
    if (
        typeof obj != "object" ||
        Array.isArray(obj) ||
        obj == null
    ) {
        throw new FleetDataError("Container '" + container + "' is not a object!")
    }
    const keys = Object.keys(obj)
    keys.forEach((key: string) => {
        if (!allowedKeys.includes(key)) {
            throw new FleetDataError("The key '" + key + "' is not allowed for a container '" + container + "'!")
        }
    })
    if (typeof obj.image != "string") {
        throw new FleetDataError("The key 'image' of container '" + container + "' need to be a string!")
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
    if (
        typeof obj.expose != "object" ||
        Array.isArray(obj.expose) ||
        obj.expose == null
    ) {
        obj.expose = {}
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
    return obj
}

export function parseContainerMap(obj: any): ContainerMap {
    if (
        typeof obj != "object" ||
        Array.isArray(obj) ||
        obj == null
    ) {
        throw new FleetDataError("'container' is not a object!")
    }
    const map: ContainerMap = {}
    Object.keys(obj).forEach((key: string) => {
        map[key.toLowerCase()] = parseContainer(key, obj[key])
    })
    return map
}

export function parseHost(obj: any): Host {
    if (
        typeof obj["ip"] != "string" &&
        typeof obj["netIp"] != "string" &&
        typeof obj["localIp"] != "string"
    ) {
        throw new FleetDataError("You need to specify minimum one of this host values: 'ip', 'localIp' or 'netIp'!")
    }

    return {
        ip: obj["ip"] ?? undefined,
        net: obj["net"] ? obj["net"].toLowerCase() : undefined,
        netIp: obj["netIp"] ?? undefined,
        localIp: obj["localIp"] ?? "127.0.0.1"
    }
}

export function parseHostMap(obj: any): HostMap {
    if (
        typeof obj != "object" ||
        Array.isArray(obj) ||
        obj == null
    ) {
        throw new FleetDataError("'hosts' is not a object!")
    }
    const map: HostMap = {}
    Object.keys(obj).forEach((key: string) => {
        map[key.toLowerCase()] = parseHost(obj[key])
    })
    if (!map["local"]) {
        map["local"] = parseHost({
            localIp: "127.0.0.1",
        })
    }
    return map
}

export function hostExists(name: string, hosts: HostMap): boolean {
    const hostnames = Object.keys(hosts)

    for (let index = 0; index < hostnames.length; index++) {
        const host = hostnames[index];
        if (host.toLowerCase() == name.toLowerCase()) {
            return true
        }
    }
    return false
}

export function getHost(name: string, hosts: HostMap): Host | undefined {
    const hostNames = Object.keys(hosts)

    for (let index = 0; index < hostNames.length; index++) {
        const hostName = hostNames[index];
        if (hostName.toLowerCase() == name.toLowerCase()) {
            return hosts[hostName]
        }
    }
    return undefined
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

export function getContainer(name: string, container: ContainerMap): Container | undefined {
    const containerNames = Object.keys(container)

    for (let index = 0; index < containerNames.length; index++) {
        const containerName = containerNames[index];
        if (containerName.toLowerCase() == name.toLowerCase()) {
            return containerNames[containerName]
        }
    }
    return undefined
}

export function findRoute(fromHostName: string, targetHostName: string, hosts: HostMap): string | null {
    const fromHost = hosts[fromHostName]
    const targetHost = hosts[targetHostName]
    if (
        fromHostName == targetHostName
    ) {
        //compare with this/same container hostname
        return hosts[fromHostName].localIp
    } else if (
        typeof fromHost.net == "string" &&
        fromHost.net == targetHost.net
    ) {
        //in same network
        return targetHost.netIp
    } else if (
        typeof targetHost.ip == "string"
    ) {
        //reach over internet protocol address
        return targetHost.ip
    }
    //no connection directly possible without subroute
    return null
}

export function parseHostRoutes(obj: HostMap): HostRoutes {
    const routes: HostRoutes = {}
    Object.keys(obj).forEach((hostName: string) => {
        routes[hostName] = {}
        Object.keys(obj).forEach(hostName2 => {
            if (hostName == hostName2) {
                return
            }
            routes[hostName][hostName2] = findRoute(hostName, hostName2, obj)
        })
    })
    return routes
}

export function parseFleetData(obj: any): FleetData {
    const defaultHost = typeof obj["defaultHost"] == "string" ? obj["defaultHost"] : "local"
    const data: FleetData = {
        defaultHost: defaultHost,
        hosts: parseHostMap(obj["hosts"] ?? {}),
        container: parseContainerMap(obj["container"]),
        unUsedHosts: [],
        hostNetworks: {},
        noNetworkHosts: [],
        containerNetworks: {},
        routes: {},
    }
    const containerNames = Object.keys(data.container)
    let hostNames = Object.keys(data.hosts)
    data.unUsedHosts = [...hostNames]
    if (containerNames.length == 0) {
        throw new FleetDataError("You need to specify at least one container!")
    }

    //start ostNetworks
    for (let index = 0; index < hostNames.length; index++) {
        const hostName = hostNames[index]
        const net = data.hosts[hostName].net
        if (typeof net == "undefined") {
            data.noNetworkHosts.push(hostName)
        } else {
            if (!data.hostNetworks[net]) {
                data.hostNetworks[net] = []
            }
            data.hostNetworks[net].push(hostName)
        }
    }
    //end
    //start unUsedHosts
    for (let index = 0; index < containerNames.length; index++) {
        const containerName = containerNames[index]
        const containerHostName = data.container[containerName].host = typeof data.container[containerName].host == "string" ? data.container[containerName].host : data.defaultHost
        const containerHost = data.hosts[containerHostName]
        if (!hostNames.includes(containerHostName)) {
            throw new FleetDataError("The host '" + containerHost + "' for the container '" + containerName + "' is not specified!")
        }
        data.unUsedHosts = data.unUsedHosts.filter((h) => h != containerHostName)
    }
    data.unUsedHosts.forEach((hostName) => delete data.hosts[hostName])
    data.unUsedHosts = data.unUsedHosts.filter((h) => h != defaultHost)
    hostNames = Object.keys(data.hosts)
    //end
    //start ontainerNetworks
    for (let index = 0; index < containerNames.length; index++) {
        const containerName = containerNames[index]
        const containerHostName = data.container[containerName].host = typeof data.container[containerName].host == "string" ? data.container[containerName].host : data.defaultHost
        if (typeof data.hosts[containerHostName] != "object") {
            throw new FleetDataError("Hostname '" + containerHostName + "' for container '" + containerName + "' is not defined!")
        }
        if (!data.containerNetworks[containerHostName]) {
            data.containerNetworks[containerHostName] = []
        }
        data.containerNetworks[containerHostName].push(containerName)
    }
    //end
    data.routes = parseHostRoutes(data.hosts)
    return data
}