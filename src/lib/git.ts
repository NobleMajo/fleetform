import { defaultCmdTimeout, shell } from "./shell"
import { LogType, VarInputStream, VarStream } from "./varstream"

export function gitClone(
    repoUrl: string,
    newFolderName?: string | undefined,
    branch?: string | undefined,
    workDir: string = process.cwd(),
    cmdSuffix?: string | undefined,
    timeoutMillis: number = defaultCmdTimeout
): VarInputStream<LogType<Buffer>> {
    let cmd = `git clone ${repoUrl}`
    if (branch) {
        cmd += ` -b ${branch}`
    }
    if (newFolderName) {
        cmd += ` ${newFolderName}`
    }
    if (cmdSuffix) {
        cmd += cmdSuffix
    }
    return shell(
        cmd,
        {
            cwd: workDir,
            timeoutMillis: timeoutMillis
        }
    )
}

export function gitCheckout(
    branch: string,
    create: boolean = false,
    repoDir: string = process.cwd(),
    cmdSuffix?: string | undefined,
    timeoutMillis: number = defaultCmdTimeout
): VarInputStream<LogType<Buffer>> {
    let cmd = `git checkout ${branch}`
    if (create) {
        cmd += ` -b`
    }
    if (cmdSuffix) {
        cmd += cmdSuffix
    }
    return shell(
        cmd,
        {
            cwd: repoDir,
            timeoutMillis: timeoutMillis
        }
    )
}

export function gitStash(
    pop: boolean = false,
    repoDir: string = process.cwd(),
    cmdSuffix?: string | undefined,
    timeoutMillis: number = defaultCmdTimeout
): VarInputStream<LogType<Buffer>> {
    let cmd = `git stash`
    if (pop) {
        cmd += ` pop`
    }
    if (cmdSuffix) {
        cmd += cmdSuffix
    }
    return shell(
        cmd,
        {
            cwd: repoDir,
            timeoutMillis: timeoutMillis
        }
    )
}

export function gitPush(
    repoDir: string = process.cwd(),
    force: boolean = false,
    all: boolean = false,
    tags: boolean = false,
    cmdSuffix?: string | undefined,
    timeoutMillis: number = defaultCmdTimeout
): VarInputStream<LogType<Buffer>> {
    let cmd = `git push`
    if (tags) {
        cmd += ` --tags`
    }
    if (all) {
        cmd += ` --all`
    }
    if (force) {
        cmd += ` -f`
    }
    if (cmdSuffix) {
        cmd += cmdSuffix
    }
    return shell(
        cmd,
        {
            cwd: repoDir,
            timeoutMillis: timeoutMillis
        }
    )
}

export function gitPull(
    repoDir: string = process.cwd(),
    force: boolean = false,
    all: boolean = false,
    tags: boolean = false,
    cmdSuffix?: string | undefined,
    timeoutMillis: number = defaultCmdTimeout
): VarInputStream<LogType<Buffer>> {
    let cmd = `git pull`
    if (tags) {
        cmd += ` --tags`
    }
    if (all) {
        cmd += ` --all`
    }
    if (force) {
        cmd += ` -f`
    }
    if (cmdSuffix) {
        cmd += cmdSuffix
    }
    return shell(
        cmd,
        {
            cwd: repoDir,
            timeoutMillis: timeoutMillis
        }
    )
}

export function gitFetch(
    repoDir: string = process.cwd(),
    force: boolean = false,
    all: boolean = false,
    tags: boolean = false,
    cmdSuffix?: string | undefined,
    timeoutMillis: number = defaultCmdTimeout
): VarInputStream<LogType<Buffer>> {
    let cmd = `git fetch`
    if (tags) {
        cmd += ` --tags`
    }
    if (all) {
        cmd += ` --all`
    }
    if (force) {
        cmd += ` -f`
    }
    if (cmdSuffix) {
        cmd += cmdSuffix
    }
    return shell(
        cmd,
        {
            cwd: repoDir,
            timeoutMillis: timeoutMillis
        }
    )
}