import { DockerConnectionOptions } from "./dockerTypes";

export interface FleetConfig {
    defaultHost?: string,
    hosts: RawHostMap,
    container: RawContainerMap,
}

export interface RawContainer {
    enabled?: boolean,
    image: string,
    tag?: string,
    host?: string,
    publish?: {
        [key: string]: number,
    },
    expose?: string[],
    envs?: {
        [key: string]: string,
    },
    volumes?: {
        [key: string]: string,
    },
    networks?: string[],
    args?: string[],
}

export interface RawContainerMap {
    [key: string]: RawContainer,
}

export interface RawHost {
    ip?: string,
    net?: string,
    netIp?: string,
    localIp?: string,
    connection: DockerConnectionOptions
}

export interface RawHostMap {
    [key: string]: RawHost,
}