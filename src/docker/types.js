"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
    return __assign(__assign({}, exports.defaultContainerCreateSetting), options);
}
exports.getContainerCreateSetting = getContainerCreateSetting;
exports.defaultDockerExecutersSettings = {
    connection: {
        protocol: undefined,
        socketPath: "/var/run/docker.sock",
    }
};
