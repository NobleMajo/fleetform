import { spawn, SpawnOptionsWithoutStdio } from "child_process"
import process = require("process")
import { LogType, VarInputStream, VarStream } from "./varstream"
import * as fs from "fs"

export class ShellTimeoutError extends Error { }

export const defaultCmdTimeout: number = 1000 * 60 * 5

export function parseShellArgument(arg: string) {
    if (arg.includes(" ")) {
        if (arg.includes("\\")) {
            arg = arg.split("\\").join("\\\\")
        }
        if (arg.includes("\n")) {
            arg = arg.split("\n").join("\\n")
        }
        if (arg.includes("\"")) {
            arg = arg.split("\"").join("\\\"")
        }
        return '"' + arg + '"'
    }
    return arg
}

export interface ShellOptions extends SpawnOptionsWithoutStdio {
    pipeEnv?: boolean,
    timeoutMillis?: number,
}

export interface ShellSettings extends ShellOptions {
    pipeEnv: boolean,
    timeoutMillis: number,
}

export const defaultShellSettings: ShellSettings = {
    pipeEnv: false,
    timeoutMillis: defaultCmdTimeout,
}

export function shell(
    cmd: string | string[],
    options?: ShellOptions
): VarInputStream<LogType<Buffer>> {
    const settings: ShellSettings = {
        ...defaultShellSettings,
        ...options,
    }
    if (options && options.pipeEnv) {
        options.env = {
            ...process.env,
            ...options.env
        }
    }

    if (typeof cmd == "string") {
        const index = cmd.indexOf(" ")
        while (cmd.startsWith(" ")) {
            cmd = cmd.substring(1)
        }
        while (cmd.endsWith(" ")) {
            cmd = cmd.slice(0, -1)
        }
        if (index <= 0 && index >= cmd.length) {
            cmd = [cmd]
        } else {
            cmd = [cmd.substring(0, index), cmd.substring(index + 1)]
        }
    }
    if (!Array.isArray(cmd)) {
        throw new Error("Command for shell need to be a string or string array!")
    }
    if (cmd.length == 0) {
        throw new Error("Can't run shell with empty command!")
    }
    let args = [...cmd]
    args.shift()
    cmd = cmd[0]
    const varStream = new VarStream<LogType<Buffer>>()
    const task = spawn(cmd, args, options)
    let timeout: NodeJS.Timeout | undefined
    if (settings.timeoutMillis > 0) {
        timeout = setTimeout(
            () => {
                if (varStream.isClosed()) {
                    return
                }
                if (timeout) {
                    clearTimeout(timeout)
                }
                varStream.end(new ShellTimeoutError("Timeout for command '" + cmd + "' ('" + settings.timeoutMillis + "')!"))
            },
            settings.timeoutMillis
        )
    }
    task.stdout.on(
        'data',
        (data) => {
            if (!(data instanceof Buffer)) {
                data = Buffer.from(data)
            }
            varStream.write([false, data])
        }
    )
    task.stderr.on(
        'data',
        (data) => {
            if (!(data instanceof Buffer)) {
                data = Buffer.from(data)
            }
            varStream.write([true, data])
        }
    )
    task.on("error", (err) => {
        if (task.stdin) {
            task.stdin.end()
        }
        if (varStream.isClosed()) {
            return
        }
        if (timeout) {
            clearTimeout(timeout)
        }
        varStream.end(err)
    })
    task.on('close', (code) => {
        if (task.stdin) {
            task.stdin.end()
        }
        if (varStream.isClosed()) {
            return
        }
        if (timeout) {
            clearTimeout(timeout)
        }
        varStream.end(undefined, {
            code: code
        })
    }
    )
    return varStream.getInputVarStream()
}
