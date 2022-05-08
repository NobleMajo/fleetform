/// <reference types="node" />
export interface ContainerCreateOptions {
    name: string;
    image: string;
    publish?: {
        [key: string]: [string, number];
    };
    expose?: string[];
    envs?: {
        [key: string]: string;
    };
    volumes?: {
        [key: string]: string;
    };
    labels?: {
        [key: string]: string;
    };
    args?: string[];
    tty?: boolean;
}
export interface ContainerCreateSetting {
    name: string;
    image: string;
    publish: {
        [key: string]: [string, number];
    };
    expose: string[];
    envs: {
        [key: string]: string;
    };
    volumes: {
        [key: string]: string;
    };
    labels: {
        [key: string]: string;
    };
    args: string[];
    tty: boolean;
}
export declare const defaultContainerCreateSetting: {
    publish: {};
    expose: any[];
    envs: {};
    volumes: {};
    labels: {};
    args: any[];
    tty: boolean;
};
export declare function getContainerCreateSetting(options: ContainerCreateOptions): ContainerCreateSetting;
export interface DockerodeOptions {
    socketPath?: string | undefined;
    host?: string | undefined;
    port?: number | string | undefined;
    username?: string | undefined;
    password?: string | undefined;
    ca?: string | string[] | Buffer | Buffer[] | undefined;
    cert?: string | string[] | Buffer | Buffer[] | undefined;
    key?: string | string[] | Buffer | Buffer[] | undefined;
    protocol?: "https" | "http" | "ssh" | undefined;
    timeout?: number | undefined;
    version?: string | undefined;
}
export interface DockerGlobalOptions {
    protocol: "https" | "http" | "ssh" | undefined;
    timeout?: number | undefined;
    version?: string | undefined;
}
export interface DockerSshOptions extends DockerGlobalOptions {
    protocol: "ssh";
    host?: string | undefined;
    port?: number | string | undefined;
    username?: string | undefined;
    password?: string | undefined;
    privateKey?: string | undefined;
}
export interface DockerHttpOptions extends DockerGlobalOptions {
    protocol: "https" | "http";
    host?: string | undefined;
    port?: number | string | undefined;
    ca?: string | string[] | Buffer | Buffer[] | undefined;
    cert?: string | string[] | Buffer | Buffer[] | undefined;
}
export interface DockerSockOptions extends DockerGlobalOptions {
    protocol: undefined;
    socketPath: string;
}
export declare type DockerConnectionOptions = DockerSshOptions | DockerHttpOptions | DockerSockOptions;
export interface DockerExecuterOptions {
    connection: DockerConnectionOptions;
}
export interface DockerExecuterSettings extends DockerExecuterOptions {
    connection: DockerConnectionOptions;
}
export declare const defaultDockerExecutersSettings: DockerExecuterSettings;
