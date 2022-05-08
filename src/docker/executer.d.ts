import * as Dockerode from "dockerode";
import { DockerExecuterOptions, DockerExecuterSettings } from "./types";
export declare function sshAgent(opt: any, callback: (err?: Error | any) => void): any;
export declare class DockerExecuter extends Dockerode {
    readonly settings: DockerExecuterSettings;
    private constructor();
    static createExecuter(options?: DockerExecuterOptions): Promise<DockerExecuter>;
}
