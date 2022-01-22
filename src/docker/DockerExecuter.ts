import * as Dockerode from "dockerode"
import { Client } from "ssh2"
import { Agent } from "http"
import { defaultDockerExecutersSettings, DockerExecuterOptions, DockerExecuterSettings } from "./dockerTypes"

export function sshAgent(opt: any, callback: (err?: Error | any) => void): any {
    const client = new Client()
    const agent = new Agent()
    agent["createConnection"] = (options: any, fn) => {
        client.once("ready", () => {
            client.exec("docker system dial-stdio", (err: Error | any, stream) => {
                if (err) {
                    client.end()
                    agent.destroy()
                    callback()
                    return
                }
                fn(null, stream);
                stream.once(
                    "close",
                    () => {
                        client.end()
                        agent.destroy()
                        callback()
                    }
                )
                stream.once(
                    "err",
                    (err) => {
                        client.end()
                        agent.destroy()
                        callback(err)
                    }
                )
            })
        }).connect(opt);
        client.once(
            "end",
            () => {
                agent.destroy()
                callback()
            }
        )
        client.once(
            "error",
            (err) => {
                agent.destroy()
                callback(err)
            }
        )
    };

    return agent;
}

export class DockerExecuter extends Dockerode {
    private constructor(
        public readonly settings: DockerExecuterSettings,
    ) {
        super(settings.connection)
    }

    public static createExecuter(
        options?: DockerExecuterOptions,
    ): Promise<DockerExecuter> {
        return new Promise<DockerExecuter>(async (res, rej) => {
            const settings = {
                ...defaultDockerExecutersSettings,
                ...options,
            }
            if (typeof settings.connection["socketPath"] == "string") {
                delete settings.connection["host"]
            }
            let executer: DockerExecuter
            if (settings.connection.protocol == "ssh") {
                settings["agent"] = sshAgent(
                    settings.connection,
                    (err) => {
                        if (err) {
                            rej(err)
                            return
                        }
                        res(executer)
                    }
                )
            }
            executer = new DockerExecuter(settings)
            if (settings.connection.protocol != "ssh") {
                res(executer)
            }
        })
    }
}
