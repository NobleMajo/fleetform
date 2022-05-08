import { ContainerPlan, ContainerMap, FleetSettings } from "./types";
import { DockerExecuterOptions } from "./docker/types";
import { DockerExecuter } from "./docker/executer";
export interface ConnectionInfo {
    type: "error" | "success";
    hostname: string;
    executer?: DockerExecuter;
    executerOptions?: DockerExecuterOptions;
    err?: Error | any;
    [key: string]: any;
}
export interface ConnectionInfoMap {
    [hostname: string]: ConnectionInfo;
}
export declare const allowedKeys: string[];
export declare function parseContainer(container: string, obj: any): ContainerPlan;
export declare function parseContainerMap(obj: any): ContainerMap;
export declare function containerExists(name: string, container: ContainerMap): boolean;
export declare function getContainer(name: string, container: ContainerMap): ContainerPlan | undefined;
export declare function validateFleetSettings(obj: any, namePrefix?: string): FleetSettings;
