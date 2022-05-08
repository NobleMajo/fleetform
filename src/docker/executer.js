"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerExecuter = exports.sshAgent = void 0;
var Dockerode = require("dockerode");
var ssh2_1 = require("ssh2");
var http_1 = require("http");
var types_1 = require("./types");
function sshAgent(opt, callback) {
    var client = new ssh2_1.Client();
    var agent = new http_1.Agent();
    agent["createConnection"] = function (options, fn) {
        client.once("ready", function () {
            client.exec("docker system dial-stdio", function (err, stream) {
                if (err) {
                    client.end();
                    agent.destroy();
                    callback();
                    return;
                }
                fn(null, stream);
                stream.once("close", function () {
                    client.end();
                    agent.destroy();
                    callback();
                });
                stream.once("err", function (err) {
                    client.end();
                    agent.destroy();
                    callback(err);
                });
            });
        }).connect(opt);
        client.once("end", function () {
            agent.destroy();
            callback();
        });
        client.once("error", function (err) {
            agent.destroy();
            callback(err);
        });
    };
    return agent;
}
exports.sshAgent = sshAgent;
var DockerExecuter = (function (_super) {
    __extends(DockerExecuter, _super);
    function DockerExecuter(settings) {
        var _this = _super.call(this, settings.connection) || this;
        _this.settings = settings;
        return _this;
    }
    DockerExecuter.createExecuter = function (options) {
        var _this = this;
        return new Promise(function (res, rej) { return __awaiter(_this, void 0, void 0, function () {
            var settings, executer;
            return __generator(this, function (_a) {
                settings = __assign(__assign({}, types_1.defaultDockerExecutersSettings), options);
                if (typeof settings.connection["socketPath"] == "string") {
                    delete settings.connection["host"];
                }
                if (settings.connection.protocol == "ssh") {
                    settings["agent"] = sshAgent(settings.connection, function (err) {
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
                return [2];
            });
        }); });
    };
    return DockerExecuter;
}(Dockerode));
exports.DockerExecuter = DockerExecuter;
