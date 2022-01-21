export interface DockerodeOptions {
    socketPath?: string | undefined,
    host?: string | undefined,
    port?: number | string | undefined,
    username?: string | undefined,
    password?: string | undefined,
    ca?: string | string[] | Buffer | Buffer[] | undefined,
    cert?: string | string[] | Buffer | Buffer[] | undefined,
    key?: string | string[] | Buffer | Buffer[] | undefined,
    protocol?: "https" | "http" | "ssh" | undefined,
    timeout?: number | undefined,
    version?: string | undefined,
}

export interface DockerGlobalOptions {
    protocol: "https" | "http" | "ssh" | undefined,
    timeout?: number | undefined,
    version?: string | undefined,
}

export interface DockerSshOptions extends DockerGlobalOptions {
    protocol: "ssh",
    host?: string | undefined,
    port?: number | string | undefined,
    username?: string | undefined,
    password?: string | undefined,
    privateKey?: string | undefined,
}

export interface DockerHttpOptions extends DockerGlobalOptions {
    protocol: "https" | "http",
    host?: string | undefined,
    port?: number | string | undefined,
    ca?: string | string[] | Buffer | Buffer[] | undefined,
    cert?: string | string[] | Buffer | Buffer[] | undefined,
}

export interface DockerSockOptions extends DockerGlobalOptions {
    protocol: undefined,
    socketPath: string,
}

export type DockerConnectionOptions = DockerSshOptions | DockerHttpOptions | DockerSockOptions

export interface DockerExecuterOptions {
    connection: DockerConnectionOptions
}

export interface DockerExecuterSettings extends DockerExecuterOptions {
    connection: DockerConnectionOptions
}

export const defaultDockerExecutersSettings: DockerExecuterSettings = {
    connection: undefined as DockerConnectionOptions
}