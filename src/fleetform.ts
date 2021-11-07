
export interface FleetConfig {
    defaultHost?: string,
    hosts: RawHostMap,
    container: RawContainerMap,
}

export interface RawContainer {
    image: string,
    tag?: string,
    host?: string,
    publish?: {
        [key: string]: number,
    },
    expose?: {
        [key: string]: number,
    },
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
}

export interface RawHostMap {
    [key: string]: RawHost,
}