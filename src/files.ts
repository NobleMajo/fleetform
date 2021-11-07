import * as fs from "fs"
import * as path from "path"
import { JsonType } from "./json"
import { VarStream } from "./varstream"

export function formatPath(filePath: string, cwd: string = process.cwd()): string {
    filePath = filePath.split("\\").join("/")
    if (!filePath.startsWith("/")) {
        filePath = cwd + "/" + filePath
    }
    return formatUrl(filePath)
}

export function formatUrl(filePath: string): string {
    filePath = filePath.split("\\").join("/")
    while (filePath.startsWith("/")) {
        filePath = filePath.substring(1)
    }
    while (filePath.endsWith("/")) {
        filePath = filePath.slice(0, -1)
    }
    return "/" + path.join(...filePath.split("\\").join("/").split("/"))
}

export function getFileType(filePath: string): Promise<"FILE" | "DIR" | "NONE"> {
    return new Promise<"FILE" | "DIR" | "NONE">((res, rej) => fs.stat(filePath, (err, state) => {
        if (err) {
            res("NONE")
        } else if (state.isDirectory()) {
            res("DIR")
        } else if (state.isFile()) {
            res("FILE")
        } else {
            res("NONE")
        }
    }))
}

export function getFileTypeSync(filePath: string): "FILE" | "DIR" | "NONE" {
    try {
        const state = fs.statSync(filePath)
        if (state.isDirectory()) {
            return "DIR"
        } else if (state.isFile()) {
            return "FILE"
        } else {
            return "NONE"
        }
    } catch (error) {
        return "NONE"
    }
}

export function readFile(filePath: string): Promise<string> {
    return new Promise<string>((res, rej) => fs.readFile(filePath, (err, content) => {
        if (err) {
            return rej(err)
        }
        res(content.toString("utf-8"))
    }))
}

export function writeFile(filePath: string, content: string): Promise<void> {
    return new Promise<void>((res, rej) => fs.writeFile(filePath, content, (err) => {
        if (err) {
            return rej(err)
        }
        res()
    }))
}

export function readJson(filePath: string): Promise<JsonType> {
    return new Promise<string>((res, rej) => fs.readFile(filePath, (err, content) => {
        if (err) {
            return rej(err)
        }
        try {
            res(JSON.parse(content.toString("utf-8")))
        } catch (err) {
            rej(err)
        }
    }))
}

export function writeJson(filePath: string, data: JsonType, pretty: boolean = true): Promise<void> {
    return new Promise<void>((res, rej) => fs.writeFile(
        filePath,
        pretty ? JSON.stringify(data, null, 4) : JSON.stringify(data),
        (err) => {
            if (err) {
                return rej(err)
            }
            res()
        }
    ))
}

export async function watchChanges(filePath: string): Promise<VarStream<string>> {
    const type = await getFileType(filePath)
    if (type == "NONE") {
        throw new Error("Can't watch something that not exists!")
    }
    const varstream = new VarStream<string>()
    const watcher = fs.watch(
        filePath,
        {
            recursive: type == "DIR",
            persistent: false
        },
        (type, file) => varstream.write(file, {
            type: type
        })
    )
    watcher.on("error", (err: Error | any) => varstream.error(err))
    watcher.on("close", () => varstream.close())
    varstream.onClose = () => watcher.close()
    return varstream
}

//     langs: html, css, java, javascript, php, c, sql(mysql/mariadb), 
//         !: typescript, cpp, sass, 
//frameworks: spigot, papermc, cloudnet, swift, 
//         !: nodejs, angular/(alpinejs/vuejs/reactjs), tailwindcss, bootstrap, 
//     techs: git, docker, cloudnet, github, bitbukkit, gitea, gitbukkit, 
//         !: gitlab, github, kubernetes, 
//     ide's: eclipse, vsc, phpstorm, itellj, atom, pysham, breakit, npp, xcode, coda, 
//         !: 

