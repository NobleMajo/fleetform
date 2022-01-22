import {
    Container,
    ContainerMap,
    ContainerTask,
    FleetPlan,
    HostOptions,
    HostMapOptions,
    FleetSettings,
    FleetValidateError,
    Host,
    HostMap, HostRoutes,
    TaskMap
} from
    "./fleetformTypes"
import { DockerExecuterOptions } from "../docker/dockerTypes"
import { DockerExecuter } from "../docker/DockerExecuter"

export interface ConnectionInfo {
    type: "error" | "success",
    hostname: string,
    executer?: DockerExecuter,
    executerOptions?: DockerExecuterOptions,
    err?: Error | any,
    [key: string]: any
}

export interface ConnectionInfoMap {
    [hostname: string]: ConnectionInfo
}

export async function connectDocker(hostname: string, plan: FleetPlan, test: boolean = false): Promise<ConnectionInfo> {
    return new Promise<ConnectionInfo>(async (res, rej) => {
        const hostData = {
            ...plan.hosts[hostname].connection,
            host: plan.routes[plan.currentHost][hostname] as string
        }
        try {
            if (!plan.routes) {
                throw new Error("Routes not exist!")
            } else if (!plan.routes[plan.currentHost]) {
                throw new Error("Routes for '" + hostname + "' not exist!")
            } else if (!plan.routes[plan.currentHost][hostname]) {
                throw new Error("Values for '" + hostname + "'-route not exist!")
            }
            const executer = await DockerExecuter.createExecuter({
                connection: hostData
            })
            res({
                type: "success",
                hostname: hostname,
                executer: executer,
                hostData: hostData,
            })
        } catch (err) {
            if (!test) {
                rej(err)
                return
            }
            res({
                type: "error",
                hostname: hostname,
                hostData: hostData,
                err: err,
            })
        }
    })
}

export async function connectAllDockerHosts(plan: FleetPlan, test: boolean = false): Promise<ConnectionInfoMap> {
    const infos: ConnectionInfoMap = {}
    for (let index = 0; index < plan.usedHosts.length; index++) {
        const hostname = plan.usedHosts[index]
        infos[hostname] = await connectDocker(hostname, plan, test)
    }
    return infos
}

export const allowedKeys: string[] = ["enabled", "image", "tag", "publish", "expose", "envs", "volumes", "networks", "args", "host"]

export function parseContainer(container: string, obj: any, currentHost: string): Container {
    if (
        typeof obj != "object" ||
        Array.isArray(obj) ||
        obj == null
    ) {
        throw new FleetValidateError("Container '" + container + "' is not a object!")
    }
    const keys = Object.keys(obj)
    keys.forEach((key: string) => {
        if (!allowedKeys.includes(key)) {
            throw new FleetValidateError("The key '" + key + "' is not allowed for a container '" + container + "'!")
        }
    })
    if (typeof obj.enabled != "boolean") {
        obj.enabled = true
    }
    if (typeof obj.image != "string") {
        throw new FleetValidateError("The key 'image' of container '" + container + "' need to be a string!")
    }
    if (typeof obj.tag != "string") {
        obj.tag = "latest"
    }
    if (
        typeof obj.host != "string"
    ) {
        obj.host = currentHost
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
    return obj
}

export function parseContainerMap(obj: any, currentHost: string): ContainerMap {
    if (
        typeof obj != "object" ||
        Array.isArray(obj) ||
        obj == null
    ) {
        throw new FleetValidateError("'container' is not a object!")
    }
    const map: ContainerMap = {}
    Object.keys(obj).forEach((key: string) => {
        map[key.toLowerCase()] = parseContainer(key, obj[key], currentHost)
    })
    return map
}

export function parseHost(host: HostOptions): Host {
    if (
        typeof host["ip"] != "string" &&
        typeof host["netIp"] != "string" &&
        typeof host["localIp"] != "string"
    ) {
        throw new FleetValidateError("You need to specify minimum one of this host values: 'ip', 'localIp' or 'netIp'!")
    }

    return {
        ...host,
        ip: host["ip"] ?? undefined,
        net: host["net"] ? host["net"].toLowerCase() : undefined,
        netIp: host["netIp"] ?? undefined,
        localIp: host["localIp"] ?? "127.0.0.1",
    }
}

export function parseHostMap(hosts: HostMapOptions, currentHost: string): HostMap {
    if (
        typeof hosts != "object" ||
        Array.isArray(hosts) ||
        hosts == null
    ) {
        throw new FleetValidateError("'hosts' is not a object!")
    }
    const map: HostMap = {}
    Object.keys(hosts).forEach((key: string) => {
        map[key.toLowerCase()] = parseHost(hosts[key])
    })
    if (!map[currentHost]) {
        const currentHostData = hosts[currentHost] ?? {}
        map[currentHost] = {
            ip: currentHostData["ip"] ?? undefined,
            net: currentHostData["net"] ? currentHostData["net"].toLowerCase() : undefined,
            netIp: currentHostData["netIp"] ?? undefined,
            localIp: currentHostData["localIp"] ?? "127.0.0.1",
            connection: {
                protocol: undefined,
                socketPath: "/var/run/docker.sock"
            }
        }
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

export function parseHostRoutes(hosts: HostMap): HostRoutes {
    const routes: HostRoutes = {}
    Object.keys(hosts).forEach((hostName: string) => {
        routes[hostName] = {}
        Object.keys(hosts).forEach((hostName2: string) => {
            routes[hostName][hostName2] = findRoute(hostName, hostName2, hosts)
        })
    })
    return routes
}

export function validateFleetSettings(
    obj: any,
    currentHost?: string,
    namePrefix?: string
): FleetSettings {
    if (typeof currentHost != "string") {
        currentHost = obj["currentHost"]
    }
    if (typeof currentHost != "string") {
        currentHost = "local"
    }
    if (typeof namePrefix != "string") {
        namePrefix = obj["namePrefix"]
    }
    if (typeof namePrefix != "string") {
        namePrefix = "ff_"
    }
    currentHost = currentHost.toLowerCase()
    return {
        currentHost: currentHost,
        namePrefix: namePrefix,
        hosts: parseHostMap(obj["hosts"] ?? {}, currentHost),
        container: parseContainerMap(obj["container"], currentHost)
    }
}

export function filterPlannedContainer(plan: FleetPlan): void {
    Object.keys(plan.container).forEach((containerName: string) => {
        if (plan.container[containerName].enabled) {
            plan.plannedContainer.push(containerName)
        } else {
            plan.unusedContainer.push(containerName)
        }
    })
}

export function filterUsedHosts(plan: FleetPlan): void {
    plan.unusedHosts = Object.keys(plan.hosts)
    plan.unusedHosts = plan.unusedHosts.filter(
        (host) => host != plan.currentHost
    )
    plan.usedHosts.push(plan.currentHost)

    plan.plannedContainer.forEach((containerName: string) => {
        const container = plan.container[containerName]
        if (plan.unusedHosts.includes(container.host)) {
            plan.unusedHosts = plan.unusedHosts.filter(
                (host) => host != container.host
            )
            plan.usedHosts.push(container.host)
        }
    })
}

export function setHostNetworks(plan: FleetPlan): void {
    const hostNames: string[] = Object.keys(plan.hosts)
    for (let index = 0; index < hostNames.length; index++) {
        const hostName = hostNames[index]
        const net = plan.hosts[hostName].net
        if (typeof net == "undefined") {
            plan.noNetworkHosts.push(hostName)
        } else {
            if (!plan.hostNetworks[net]) {
                plan.hostNetworks[net] = []
            }
            plan.hostNetworks[net].push(hostName)
        }
    }
}

export function setContainerNetworks(plan: FleetPlan): void {
    for (let index = 0; index < plan.plannedContainer.length; index++) {
        const containerName = plan.plannedContainer[index]
        const containerHostName = plan.container[containerName].host =
            typeof plan.container[containerName].host == "string" ?
                plan.container[containerName].host :
                plan.currentHost
        if (typeof plan.hosts[containerHostName] != "object") {
            throw new FleetValidateError("Hostname '" + containerHostName + "' for container '" + containerName + "' is not defined!")
        }
        if (!plan.containerNetworks[containerHostName]) {
            plan.containerNetworks[containerHostName] = []
        }
        plan.containerNetworks[containerHostName].push(containerName)
    }
}

export function hostContainer(plan: FleetPlan): void {
    for (let index = 0; index < plan.plannedContainer.length; index++) {
        const containerName = plan.plannedContainer[index]
        const hostName = plan.container[containerName].host
        if (!plan.hostContainer[hostName]) {
            plan.hostContainer[hostName] = []
        }
        plan.hostContainer[hostName].push(containerName)
    }
}

export function setDockerHostNetworks(plan: FleetPlan): void {
    plan.plannedContainer.forEach(
        (containerName: string) => {
            const container = plan.container[containerName]
            if (!plan.dockerHostNetworks[container.host]) {
                plan.dockerHostNetworks[container.host] = container.networks
            } else {
                container.networks.forEach(
                    (network: string) => {
                        if (!container.networks.includes(network)) {
                            plan.dockerHostNetworks[container.host].push(network)
                        }
                    }
                )
            }
        }
    )
}

export function getImageName(container: Container): string {
    return container.image + (container.tag ? ":" + container.tag : "")
}

export function getHostImages(plan: FleetPlan): void {
    plan.plannedContainer.forEach(
        (containerName: string) => {
            const container = plan.container[containerName]
            if (!plan.hostImages) {
                plan.hostImages[container.host] = []
            }
            const imageName = getImageName(container)

            if (!plan.hostImages[container.host]) {
                plan.hostImages[container.host] = []
            }

            if (!plan.hostImages[container.host].includes(imageName)) {
                plan.hostImages[container.host].push(imageName)
            }
        }
    )
}

export function getNeededImages(plan: FleetPlan): void {
    plan.neededImages = plan.plannedContainer.map(
        (containerName) => {
            const container = plan.container[containerName]
            return container.image + ":" + container.tag
        }
    )
}

export function parseFleetPlan(
    settings: FleetSettings
): FleetPlan {
    const plan: FleetPlan = {
        ...settings,
        plannedContainer: [],
        unusedContainer: [],
        usedHosts: [],
        unusedHosts: [],
        noNetworkHosts: [],
        neededImages: [],
        hostNetworks: {},
        containerNetworks: {},
        routes: {},
        hostContainer: {},
        dockerHostNetworks: {},
        hostImages: {}
    }

    filterPlannedContainer(plan)
    filterUsedHosts(plan)
    setHostNetworks(plan)
    plan.routes = parseHostRoutes(plan.hosts)
    hostContainer(plan)
    setDockerHostNetworks(plan)
    getHostImages(plan)
    getNeededImages(plan)
    return plan
}