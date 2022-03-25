
export interface ContainerOptions {
    enabled?: boolean,
    image: string,
    tag?: string,
    host?: string,
    publish?: {
        [key: string]: number | string | [string, number],
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
    after?: string | undefined,
    tty?: boolean,
}

export interface ContainerMapOptions {
    [key: string]: ContainerOptions,
}


export interface FleetOptions {
    container: ContainerMapOptions,
}

export interface ContainerPlan extends ContainerOptions {
    enabled: boolean,
    image: string,
    tag: string,
    host: string,
    publish: {
        [key: string]: [string, number],
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
    after: string | undefined,
    tty: boolean,
}

export interface ContainerMap extends ContainerMapOptions {
    [key: string]: ContainerPlan,
}

export interface ContainerNetworks {
    [host: string]: string[],
}

export interface FleetSettings {
    namePrefix: string,
    container: ContainerMap,
}

export interface ContainerTask {
    name: string,
    tasks: ContainerTask[]
}

export interface TaskMap {
    [key: string]: ContainerTask
}
