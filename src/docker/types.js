"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDockerExecutersSettings = exports.getContainerCreateSetting = exports.defaultContainerCreateSetting = void 0;
exports.defaultContainerCreateSetting = {
    publish: {},
    expose: [],
    envs: {},
    volumes: {},
    labels: {},
    args: [],
    tty: false,
};
function getContainerCreateSetting(options) {
    return {
        ...exports.defaultContainerCreateSetting,
        ...options
    };
}
exports.getContainerCreateSetting = getContainerCreateSetting;
exports.defaultDockerExecutersSettings = {
    connection: {
        protocol: undefined,
        socketPath: "/var/run/docker.sock",
    }
};
