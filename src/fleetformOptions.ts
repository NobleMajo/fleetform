import { DockerConnectionOptions } from "./dockerOptions";

export interface FleetOptions {
    defaultHost?: string,
    hosts: HostMapOptions,
    container: ContainerMapOptions,
}

export interface ContainerOptions {
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
    after?: string | undefined
}

export interface ContainerMapOptions {
    [key: string]: ContainerOptions,
}

export interface HostOptions {
    ip?: string,
    net?: string,
    netIp?: string,
    localIp?: string,
    connection: DockerConnectionOptions
}

export interface HostMapOptions {
    [key: string]: HostOptions,
}