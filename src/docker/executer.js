"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerExecuter = exports.sshAgent = void 0;
const Dockerode = require("dockerode");
const ssh2_1 = require("ssh2");
const http_1 = require("http");
const types_1 = require("./types");
function sshAgent(opt, callback) {
    const client = new ssh2_1.Client();
    const agent = new http_1.Agent();
    agent["createConnection"] = (options, fn) => {
        client.once("ready", () => {
            client.exec("docker system dial-stdio", (err, stream) => {
                if (err) {
                    client.end();
                    agent.destroy();
                    callback();
                    return;
                }
                fn(null, stream);
                stream.once("close", () => {
                    client.end();
                    agent.destroy();
                    callback();
                });
                stream.once("err", (err) => {
                    client.end();
                    agent.destroy();
                    callback(err);
                });
            });
        }).connect(opt);
        client.once("end", () => {
            agent.destroy();
            callback();
        });
        client.once("error", (err) => {
            agent.destroy();
            callback(err);
        });
    };
    return agent;
}
exports.sshAgent = sshAgent;
class DockerExecuter extends Dockerode {
    settings;
    constructor(settings) {
        super(settings.connection);
        this.settings = settings;
    }
    static createExecuter(options) {
        return new Promise(async (res, rej) => {
            const settings = {
                ...types_1.defaultDockerExecutersSettings,
                ...options,
            };
            if (typeof settings.connection["socketPath"] == "string") {
                delete settings.connection["host"];
            }
            let executer;
            if (settings.connection.protocol == "ssh") {
                settings["agent"] = sshAgent(settings.connection, (err) => {
                    if (err) {
                        rej(err);
                        return;
                    }
                    res(executer);
                });
            }
            executer = new DockerExecuter(settings);
            if (settings.connection.protocol != "ssh") {
                res(executer);
            }
        });
    }
}
exports.DockerExecuter = DockerExecuter;
