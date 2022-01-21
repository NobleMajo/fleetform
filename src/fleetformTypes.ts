import { HostOptions, HostMapOptions, ContainerOptions, ContainerMapOptions } from "./fleetformOptions";

export class FleetValidateError extends Error {
}

export interface Container extends ContainerOptions {
    enabled: boolean,
    image: string,
    tag: string,
    host: string,
    publish: {
        [key: string]: number,
    },
    expose: string[],
    envs: {
        [key: string]: string,
    },
    volumes: {
        [key: string]: string,
    },
    networks: string[],
    args: string[],
    after: string | undefined
}

export interface ContainerMap extends ContainerMapOptions {
    [key: string]: Container,
}

export interface Host extends HostOptions {
    ip: string | undefined,
    net: string | undefined,
    netIp: string | undefined,
    localIp: string | undefined,
}

export interface HostMap extends HostMapOptions {
    [key: string]: Host,
}

export interface HostNetworks {
    [host: string]: string[],
}

export interface ContainerNetworks {
    [host: string]: string[],
}

export interface HostRoute {
    [host: string]: string | string[] | null,
}

export interface HostRoutes {
    [host: string]: HostRoute,
}

export interface HostContainer {
    [host: string]: string[],
}

export interface FleetSettings {
    currentHost: string,
    namePrefix: string,
    hosts: HostMap,
    container: ContainerMap
}

export interface ContainerTask {
    name: string,
    tasks: ContainerTask[]
}

export interface TaskMap {
    [key: string]: ContainerTask
}

export interface HostTasks {
    [hostName: string]: ContainerTask[]
}

export interface DockerHostNetworks {
    [hostName: string]: string[]
}

export interface HostImages {
    [hostName: string]: string[]
}

export interface FleetPlan extends FleetSettings {
    plannedContainer: string[],
    unusedContainer: string[],
    usedHosts: string[],
    unusedHosts: string[],
    noNetworkHosts: string[],
    hostNetworks: HostNetworks,
    containerNetworks: ContainerNetworks,
    routes: HostRoutes,
    hostContainer: HostContainer,
    tasks: HostTasks,
    dockerHostNetworks: DockerHostNetworks,
    hostImages: HostImages
}