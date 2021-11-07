import { RawHost, RawHostMap, RawContainer, RawContainerMap } from "./fleetform";

export class FleetDataError extends Error {
}

export interface Container extends RawContainer {
    image: string,
    tag: string,
    host: string,
    publish: {
        [key: string]: number,
    },
    expose: {
        [key: string]: number,
    },
    envs: {
        [key: string]: string,
    },
    volumes: {
        [key: string]: string,
    },
    networks: string[],
    args: string[],
}

export interface ContainerMap extends RawContainerMap {
    [key: string]: Container,
}

export interface Host extends RawHost {
    ip: string | undefined,
    net: string | undefined,
    netIp: string | undefined,
    localIp: string | undefined,
}

export interface HostMap extends RawHostMap {
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

export interface FleetData {
    defaultHost: string,
    hosts: HostMap,
    container: ContainerMap,
    unUsedHosts: string[],
    hostNetworks: HostNetworks,
    noNetworkHosts: string[],
    containerNetworks: ContainerNetworks,
    routes: HostRoutes,
}