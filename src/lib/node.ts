
import { fork, ForkOptions } from "child_process"
import process = require("process")
import { formatPath, getFileType } from "./files"
import { LogType, VarInputStream, VarStream } from "./varstream"
import * as fs from "fs"
import { defaultCmdTimeout, ShellOptions, ShellTimeoutError } from "./shell"

export interface NodeOptions extends ForkOptions {
    pipeEnv?: boolean,
    timeoutMillis?: number
}

export interface NodeSettings extends NodeOptions {
    pipeEnv: boolean,
    timeoutMillis: number
}

export const defaultNodeSettings: NodeSettings = {
    pipeEnv: false,
    timeoutMillis: defaultCmdTimeout
}

export function node(
    script: string,
    args: string[],
    options?: NodeOptions
): VarInputStream<LogType<Buffer>> {
    const settings: NodeSettings = {
        ...defaultNodeSettings,
        ...options,
    }

    if (settings.pipeEnv) {
        settings.env = {
            ...process.env,
            ...settings.env
        }
    }

    const varStream = new VarStream<LogType<Buffer>>()
    const task = fork(
        script,
        args,
        {
            ...settings,
            silent: true,
        },
    )
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
                varStream.end(new ShellTimeoutError("Timeout for command 'node " + script + "' ('" + settings.timeoutMillis + "'ms)!"))
            },
            settings.timeoutMillis
        )
    }
    if (task.stdout) {
        task.stdout.on(
            'data',
            (data: Buffer | string) => {
                if (!(data instanceof Buffer)) {
                    data = Buffer.from(data)
                }
                varStream.write([false, data])
            }
        )
    }
    if (task.stderr) {
        task.stderr.on(
            'data',
            (data: Buffer | string) => {
                if (!(data instanceof Buffer)) {
                    data = Buffer.from(data)
                }
                varStream.write([false, data])
            }
        )
    }
    task.on(
        "error",
        (err) => {
            if (varStream.isClosed()) {
                return
            }
            if (timeout) {
                clearTimeout(timeout)
            }
            varStream.end(err)
        }
    )
    task.on(
        'close',
        (code) => {
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
    return varStream
}

export type esModule = 'none' | 'commonjs' | 'amd' | 'system' | 'umd' | 'es2015' | 'ESNext'
export type esLib = 'es5' | 'es6' | 'es2015' | 'es7' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'esnext' | 'dom' | string
export type esTarget = 'es3' | 'es5' | 'es6' | 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'esnext' | string

export type ExecuterOptions = NodeOptions & ShellOptions

export interface CompileOptions extends ExecuterOptions {
    forkNode?: boolean
    inFile?: string,
    project?: string,
    outDir?: string | boolean,
    outFile?: string | boolean,
    clean?: boolean,
    force?: boolean,
    dry?: boolean,
    verbose?: boolean,
    diagnostics?: boolean,
    module?: esModule | string,
    allowJs?: boolean,
    checkJs?: boolean,
    removeComments?: boolean,
    sourceMap?: boolean,
    declarationMap?: boolean,
    pretty?: boolean,
    emitDeclarationOnly?: boolean,
    esModuleInterop?: boolean,
    strict?: boolean,
    listFiles?: boolean,
    listEmittedFiles?: boolean,
    declaration?: boolean,
    noEmit?: boolean,
    libs?: esLib[],
    args?: string[],
    target?: esTarget,
    tsCompilePath?: string,
    tsSuffix?: string,
    jsSuffix?: string,
}

export interface CompileSettings extends CompileOptions {
    inFile: string | undefined,
    project: string | undefined,
    outDir: string | boolean,
    outFile: string | boolean,
    clean: boolean,
    force: boolean,
    dry: boolean,
    verbose: boolean,
    diagnostics: boolean,
    module: esModule | string | undefined,
    allowJs: boolean | undefined,
    checkJs: boolean | undefined,
    removeComments: boolean | undefined,
    sourceMap: boolean | undefined,
    declarationMap: boolean | undefined,
    pretty: boolean | undefined,
    emitDeclarationOnly: boolean | undefined,
    esModuleInterop: boolean | undefined,
    strict: boolean | undefined,
    listFiles: boolean | undefined,
    listEmittedFiles: boolean | undefined
    declaration: boolean | undefined,
    noEmit: boolean | undefined,
    libs: (esLib | string)[],
    args: string[],
    target: esTarget | undefined,
    tsCompilePath: string,
    tsSuffix: string,
    jsSuffix: string,
}

export const defaultCompileSettings: CompileSettings = {
    inFile: undefined,
    project: undefined,
    outDir: false,
    outFile: false,
    clean: false,
    force: false,
    dry: false,
    verbose: false,
    diagnostics: false,
    module: undefined,
    allowJs: undefined,
    checkJs: undefined,
    removeComments: undefined,
    sourceMap: undefined,
    declarationMap: undefined,
    pretty: undefined,
    emitDeclarationOnly: undefined,
    esModuleInterop: undefined,
    strict: undefined,
    listFiles: undefined,
    listEmittedFiles: undefined,
    declaration: undefined,
    noEmit: undefined,
    libs: [],
    args: [],
    target: undefined,
    tsCompilePath: "node_modules/typescript/bin/tsc",
    tsSuffix: ".ts",
    jsSuffix: ".js",
}

export function tsc(
    options: CompileOptions,
): VarInputStream<LogType<Buffer>> {
    const settings: CompileSettings = {
        ...defaultCompileSettings,
        ...options
    }
    const args: string[] = []
    if (settings.inFile) {
        args.push(settings.inFile)
    }
    if (settings.project) {
        args.push("--project")
        args.push(settings.project)
    }
    if (settings.module) {
        args.push("--module")
        args.push(settings.module)
    }
    if (typeof settings.outFile != "undefined") {
        if (typeof settings.outFile == "string") {
            args.push("--outFile")
            args.push(settings.outFile)
        } else if (
            settings.outFile == true
        ) {
            if (typeof settings.inFile != "string") {
                throw new Error("You need to set 'inFile' if you use 'outFile'")
            }
            let jsPath = settings.inFile
            if (jsPath.endsWith(settings.tsSuffix)) {
                jsPath = jsPath.slice(0, -3)
            }
            jsPath += settings.jsSuffix
            args.push("--outFile")
            args.push(jsPath)
        }
    }
    if (typeof settings.removeComments == "boolean") {
        args.push("--removeComments")
        args.push("" + settings.removeComments)
    }
    if (typeof settings.sourceMap == "boolean") {
        args.push("--sourceMap")
        args.push("" + settings.sourceMap)
    }
    if (typeof settings.declarationMap == "boolean") {
        args.push("--declarationMap")
        args.push("" + settings.declarationMap)
    }
    if (typeof settings.pretty == "boolean") {
        args.push("--pretty")
        args.push("" + settings.pretty)
    }
    if (typeof settings.esModuleInterop == "boolean") {
        args.push("--esModuleInterop")
        args.push("" + settings.esModuleInterop)
    }
    if (typeof settings.strict == "boolean") {
        args.push("--strict")
        args.push("" + settings.strict)
    }
    if (typeof settings.emitDeclarationOnly == "boolean") {
        args.push("--emitDeclarationOnly")
        args.push("" + settings.emitDeclarationOnly)
    }
    if (typeof settings.noEmit == "boolean") {
        args.push("--noEmit")
        args.push("" + settings.noEmit)
    }
    if (typeof settings.allowJs == "boolean") {
        args.push("--allowJs")
        args.push("" + settings.allowJs)
    }
    if (typeof settings.checkJs == "boolean") {
        args.push("--checkJs")
        args.push("" + settings.checkJs)
    }
    if (typeof settings.listEmittedFiles == "boolean") {
        args.push("--listEmittedFiles")
        args.push("" + settings.listEmittedFiles)
    }
    if (typeof settings.listFiles == "boolean") {
        args.push("--listFiles")
        args.push("" + settings.listFiles)
    }
    if (typeof settings.declaration == "boolean") {
        args.push("--declaration")
        args.push("" + settings.declaration)
    }
    if (settings.clean == true) {
        args.push("--clean")
    }
    if (settings.force == true) {
        args.push("--force")
    }
    if (settings.dry == true) {
        args.push("--dry")
    }
    if (settings.verbose == true) {
        args.push("--verbose")
    }
    if (settings.diagnostics == true) {
        args.push("--diagnostics")
    }
    if (Array.isArray(settings.libs)) {
        settings.libs.forEach((lib: string) => {
            args.push("--lib")
            args.push(lib)
        })
    }
    if (Array.isArray(settings.args)) {
        settings.args.forEach((arg: string) => args.push(arg))
    }
    return node(
        settings.tsCompilePath,
        args,
        options
    )
}

export function rmJsFileByTsFile(
    tsPath: string,
    tsSuffix: string = ".ts",
    jsSuffix: string = ".js"
): Promise<void> {
    return new Promise<void>((res, rej) => {
        if (tsPath.endsWith(tsSuffix)) {
            tsPath = tsPath.slice(0, -3)
        }
        fs.rm(tsPath + jsSuffix, (err) => {
            if (err) {
                return rej(err)
            }
            res()
        })
    })
}

const bin = process.env["_"].toLowerCase()
export const isTsNode: boolean | undefined = bin.includes("tsnode") || bin.includes("ts-node")

export interface TsNodeOptions extends NodeOptions {
    pipeEnv?: boolean,
    timeoutMillis?: number,
    tsNodePath?: string
}

export interface TsNodeSettings extends TsNodeOptions {
    pipeEnv: boolean,
    timeoutMillis: number
    tsNodePath: string
}

export const defaultTsNodeSettings: TsNodeSettings = {
    pipeEnv: false,
    timeoutMillis: defaultCmdTimeout,
    tsNodePath: "node_modules/ts-node/dist/bin.js"
}

export function tsnode(
    script: string,
    args: string[],
    options?: TsNodeOptions
): VarInputStream<LogType<Buffer>> {
    const settings: TsNodeSettings = {
        ...defaultTsNodeSettings,
        ...options,
    }

    if (settings.pipeEnv) {
        settings.env = {
            ...process.env,
            ...settings.env
        }
    }

    return node(
        settings.tsNodePath,
        [
            script,
            ...args
        ],
        settings
    )
}

export interface ImportModuleOptions extends CompileOptions {
    tsConfigName?: string,
    deleteCompiledFiles?: boolean,
    compileTs?: boolean,
    packageJsonName?: string,
    importPackageJson?: boolean,
    importSingleFile?: boolean,
    tsSuffix?: string,
    jsSuffix?: string,
    jsonSuffix?: string,
    allowJson?: boolean,
}

export interface ImportModuleSettings extends ImportModuleOptions {
    tsConfigName: string,
    deleteCompiledFiles: boolean,
    compileTs: boolean,
    packageJsonName: string,
    importPackageJson: boolean,
    importSingleFile: boolean,
    tsSuffix: string,
    jsSuffix: string,
    jsonSuffix: string,
    allowJson: boolean,
}

export const defaultImportModuleSettings: ImportModuleSettings = {
    tsConfigName: "tsconfig.json",
    deleteCompiledFiles: true,
    compileTs: true,
    packageJsonName: "package.json",
    importPackageJson: true,
    importSingleFile: true,
    tsSuffix: ".ts",
    jsSuffix: ".js",
    jsonSuffix: ".json",
    allowJson: true,
}

export async function importModule(
    modulePath: string,
    options?: ImportModuleOptions
): Promise<any> {
    const settings: ImportModuleSettings = {
        ...defaultImportModuleSettings,
        ...options
    }
    if (
        settings.importSingleFile == false &&
        settings.importPackageJson == false
    ) {
        throw new Error("Can't import something if 'importSingleFile' and 'importPackageJson' are disabled!")
    }
    if (settings.allowJson) {
        if (
            modulePath.endsWith(settings.jsonSuffix) &&
            await getFileType(modulePath) == "FILE"
        ) {
            return require(modulePath)
        } else if (
            await getFileType(modulePath + settings.jsonSuffix) == "FILE"
        ) {
            return require(modulePath)
        }
    }
    let type = await getFileType(modulePath)
    if (type == "DIR") {
        if (!settings.importPackageJson) {
            throw new Error("Can't import package folder if 'importPackageJson' it set to 'false'!")
        } else if (await getFileType(modulePath + "/" + settings.packageJsonName) != "FILE") {
            throw new Error("Can't find '" + modulePath + "/" + settings.packageJsonName + "'!")
        }
        const packageData = require(modulePath + "/" + settings.packageJsonName)
        let del: () => Promise<void> | undefined
        try {
            if (
                settings.compileTs &&
                await getFileType(modulePath + "/" + settings.tsConfigName) == "FILE"
            ) {
                let errorLines: string = ""
                const paths = await tsc({
                    ...options,
                    project: modulePath + "/" + settings.tsConfigName,
                    listEmittedFiles: true,
                })
                    .spread((log) => {
                        const line = "" + log[1]
                        return line.split("\n").map((v) => {
                            while (v.startsWith(" ")) {
                                v = v.substring(1)
                            }
                            while (v.endsWith(" ")) {
                                v = v.slice(0, -1)
                            }
                            return v.length == 0 ? undefined : v
                        })
                    })
                    .map((line: string) => {
                        if (
                            line.startsWith("TSFILE: ") &&
                            line.endsWith(settings.jsSuffix)
                        ) {
                            return line.substring(8)
                        } else if (line.includes(" error ")) {
                            errorLines += "\n" + line
                        }
                        return undefined
                    })
                    .bufferValues()

                if (settings.deleteCompiledFiles) {
                    del = () => Promise.all(
                        paths.map((path) => new Promise<void>((res, rej) => fs.rm(
                            path,
                            (err) => err ? rej(err) : res()
                        ))
                        )
                    ) as any
                }

                if (paths.length == 0) {
                    if (errorLines.length > 0) {
                        throw new Error("TypeScript Type Errors:" + errorLines)
                    } else {
                        throw new Error("Unknown TypeScript Compile Error!")
                    }
                }
            }
            return require(formatPath(packageData.main, modulePath))
        } finally {
            if (del) {
                del()
            }
        }
    } else {
        if (!settings.importSingleFile) {
            throw new Error("Can't import '" + modulePath + "' because it is not a folder!")
        }
        if (modulePath.endsWith(settings.tsSuffix)) {
            modulePath = modulePath.slice(0, -settings.tsSuffix.length)
        } else if (modulePath.endsWith(settings.jsSuffix)) {
            modulePath = modulePath.slice(0, -settings.jsSuffix.length)
        }
        let del: () => Promise<void> | undefined
        try {
            if (settings.compileTs && await getFileType(modulePath + settings.tsSuffix) == "FILE") {
                let errorLines: string = ""
                const paths = await tsc({
                    ...options,
                    inFile: modulePath + settings.tsSuffix,
                    listEmittedFiles: true,
                })
                    .spread((log) => {
                        const line = "" + log[1]
                        return line.split("\n").map((v) => {
                            while (v.startsWith(" ")) {
                                v = v.substring(1)
                            }
                            while (v.endsWith(" ")) {
                                v = v.slice(0, -1)
                            }
                            return v.length == 0 ? undefined : v
                        })
                    })
                    .map((line: string) => {
                        if (
                            line.startsWith("TSFILE: ") &&
                            line.endsWith(settings.jsSuffix)
                        ) {
                            return line.substring(8)
                        } else if (line.includes(" error ")) {
                            errorLines += "\n" + line
                        }
                        return undefined
                    })
                    .bufferValues()

                if (settings.deleteCompiledFiles) {
                    del = () => Promise.all(
                        paths.map((path) => new Promise<void>(
                            (res, rej) => fs.rm(
                                path,
                                (err) => err ? rej(err) : res()
                            )
                        ))
                    ) as any
                }

                if (paths.length == 0) {
                    if (errorLines.length > 0) {
                        throw new Error("TypeScript Type Errors:" + errorLines)
                    } else {
                        throw new Error("Unknown TypeScript Compile Error!")
                    }
                }
            }
            if (await getFileType(modulePath + settings.jsSuffix) != "FILE") {
                throw new Error("File '" + modulePath + settings.jsSuffix + "' not found!")
            }
            return require(formatPath(modulePath + settings.jsSuffix))
        } finally {
            if (del) {
                await del()
            }
        }
    }
}
