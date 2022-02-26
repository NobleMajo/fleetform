
export class UnhandledVarStreamError extends Error {
    constructor(
        public readonly err: Error | any
    ) {
        super("Unhandled error in varstream!")
    }
}

export interface StreamDataMeta {
    [key: string]: any
}

export interface StreamCloseMeta {
    err?: undefined
    [key: string]: any
}

export interface StreamErrorMeta {
    err: Error | any,
    [key: string]: any
}

export class MetaError extends Error {
    constructor(message: string,) {
        super(message)
    }
}

export type DataCallback<T> =
    (
        value: T,
        meta: StreamDataMeta,
        stream: VarStream<T>
    ) => Promise<any> | any
export type FilterCallback<T> =
    (
        value: T,
        meta: StreamDataMeta,
        stream: VarInputStream<T>
    ) => Promise<boolean> | boolean
export type MapCallback<T, R> =
    (
        value: T,
        meta: StreamDataMeta,
        stream: VarInputStream<T>
    ) => Promise<R> | R
export type CloseCallback<T> =
    (
        meta: StreamCloseMeta,
        stream: VarStream<T>
    ) => Promise<any> | any
export type ErrorCallback<T> =
    (
        meta: StreamErrorMeta,
        stream: VarStream<T>
    ) => Promise<any> | any
export type FinallyCallback<T> =
    (
        meta: StreamCloseMeta | StreamErrorMeta,
        stream: VarStream<T>
    ) => Promise<any> | any

export interface VarInputStream<T> {
    //MAIN
    isClosed(): boolean
    getClosedMeta(): StreamCloseMeta | StreamErrorMeta | undefined

    //CALLBACKS
    getDataCallbacks(): DataCallback<T>[]
    setDataCallbacks(callbacks: CloseCallback<T>[]): void
    clearDataCallback(): void
    getCloseCallbacks(): CloseCallback<T>[]
    setCloseCallbacks(callbacks: CloseCallback<T>[]): void
    clearCloseCallback(): void

    //READABLE
    destroy(err?: Error | any | undefined, meta?: StreamCloseMeta)
    pipe(output: VarOutputStream<T>): VarInputStream<T>
    unpipe(output: VarOutputStream<T>): VarInputStream<T>
    finally(finallyCallback: FinallyCallback<T>): VarInputStream<T>
    then(closeCallback: CloseCallback<T>): VarInputStream<T>
    catch(errorCallback: ErrorCallback<T>): VarInputStream<T>
    buffer(): Promise<[T, StreamDataMeta][]>
    bufferValues(): Promise<T[]>
    bufferMeta(): Promise<StreamDataMeta[]>
    collect(): Promise<[[T, StreamDataMeta][], StreamCloseMeta]>
    toPromise(): Promise<StreamCloseMeta>
    forEach(callback: DataCallback<T>): VarInputStream<T>
    filter(callback: FilterCallback<T>): VarStream<T>
    map<R>(callback: MapCallback<T, R>): VarInputStream<R>
    spread<R>(callback: MapCallback<T, R[]>): VarInputStream<R>
}

export interface VarOutputStream<T> {
    //MAIN
    isClosed(): boolean
    getClosedMeta(): StreamCloseMeta | StreamErrorMeta | undefined

    //WRITEABLE
    end(err?: Error | any | undefined, meta?: StreamCloseMeta | StreamErrorMeta): void
    write(value: T, meta?: StreamDataMeta): VarOutputStream<T>
    writeAll(values: T[], meta?: StreamDataMeta[]): VarOutputStream<T>
}

export class VarStream<T> implements VarInputStream<T>, VarOutputStream<T>{
    private closed: boolean = false
    private closeData: StreamCloseMeta | StreamErrorMeta | undefined = undefined
    private buf: [T, StreamDataMeta][] | undefined = undefined
    private onData: DataCallback<T>[] | undefined = undefined
    private onClose: CloseCallback<T>[] | undefined = undefined
    private promise: Promise<StreamCloseMeta> | undefined = undefined

    constructor(
        onData?: DataCallback<T> | DataCallback<T>[],
        onClose?: CloseCallback<T> | CloseCallback<T>[],
    ) {
        if (onData) {
            if (Array.isArray(onData)) {
                this.onData = onData
            } else {
                this.onData = [onData]
            }
        }
        if (onClose) {
            if (Array.isArray(onClose)) {
                this.onClose = onClose
            } else {
                this.onClose = [onClose]
            }
        }
    }

    private inputStream: VarInputStream<T> | undefined = undefined
    private outputStream: VarOutputStream<T> | undefined = undefined

    public getInputVarStream(): VarInputStream<T> {
        if (!this.inputStream) {
            this.inputStream = {
                isClosed: () => this.isClosed(),
                getClosedMeta: () => this.getClosedMeta(),

                getDataCallbacks: () => this.getDataCallbacks(),
                setDataCallbacks: (...params: any) => this.setDataCallbacks(params[0]),
                clearDataCallback: () => this.clearDataCallback(),
                getCloseCallbacks: () => this.getCloseCallbacks(),
                setCloseCallbacks: (...params: any) => this.setCloseCallbacks(params[0]),
                clearCloseCallback: () => this.clearCloseCallback(),

                destroy: (...params: any) => this.destroy(params[0], params[1]),
                pipe: (...params: any) => this.pipe(params[0]),
                unpipe: (...params: any) => this.unpipe(params[0]),
                finally: (...params: any) => this.finally(params[0]),
                then: (...params: any) => this.then(params[0]),
                catch: (...params: any) => this.catch(params[0]),
                buffer: () => this.buffer(),
                bufferMeta: () => this.bufferMeta(),
                bufferValues: () => this.bufferValues(),
                collect: () => this.collect(),
                toPromise: () => this.toPromise(),
                forEach: (...params: any) => this.forEach(params[0]),
                filter: (...params: any) => this.filter(params[0]),
                map: (...params: any) => this.map(params[0]),
                spread: (...params: any) => this.spread(params[0]),
            }
        }
        return this.inputStream
    }

    public getOutputVarStream(): VarOutputStream<T> {
        if (!this.outputStream) {
            this.outputStream = {
                isClosed: () => this.isClosed(),
                getClosedMeta: () => this.getClosedMeta(),
                end: (...params: any) => this.end(params[0], params[1]),
                write: (...params: any) => this.write(params[0], params[1]),
                writeAll: (...params: any) => this.writeAll(params[0], params[1]),
            }
        }
        return this.outputStream
    }

    //PRIVATE
    private executeBuffer(): void {
        while (this.buf && this.buf.length > 0) {
            const event = this.buf.shift()
            if (!event[0]) {
                break
            }
            this.onData.forEach((callback) => {
                try {
                    const promise = callback(event[0], event[1], this)
                    if (promise && typeof promise.catch == "function") {
                        promise.catch((err) => {
                            this.end(
                                new Error("Error while VarStream callback!"),
                                {
                                    origin: err,
                                    callbackType: "data",
                                    callback: callback,
                                    value: event[0],
                                    meta: event[1]
                                }
                            )
                        })
                    }
                } catch (err) {
                    this.end(
                        new Error("Error while VarStream callback!"),
                        {
                            origin: err,
                            callbackType: "data",
                            callback: callback,
                            value: event[0],
                            meta: event[1]
                        }
                    )
                }
            })
        }
        this.buf = undefined
        if (this.onClose) {
            if (this.buf && this.buf.length > 0) {
                if (this.closeData[0] == false) {
                    this.onClose.forEach((callback) => callback(this.closeData, this))
                }
            }
        }
        this.closeData = undefined
    }

    //MAIN
    public isClosed(): boolean {
        return this.closed
    }

    public getClosedMeta(): StreamCloseMeta | StreamErrorMeta {
        return this.closeData
    }

    public end(err?: Error | any, meta: StreamCloseMeta | StreamErrorMeta = {}): void {
        if (this.closed) {
            return
        }
        if (err != undefined) {
            meta.err = err
        }
        this.closeData = meta
        this.closed = true
        if (!this.onClose) {
            return
        }
        this.onClose.forEach((callback) => {
            try {
                callback(meta, this)
            } catch (err) {
                this.end(new Error("Error while callback!"), {
                    origin: err,
                    callbackType: "close",
                    callback: callback,
                    meta: meta,
                    value: undefined
                })
            }
        })
    }

    public destroy(err?: Error | any, meta: StreamCloseMeta | StreamErrorMeta = {}): void {
        if (this.closed) {
            return
        }
        if (err != undefined) {
            meta.err = err
        }
        this.closeData = meta
        this.closed = true
        if (!this.onClose) {
            return
        }
        this.onClose.forEach((callback) => {
            try {
                callback(meta, this)
            } catch (err) {
                this.end(new Error("Error while callback!"), {
                    origin: err,
                    callbackType: "close",
                    callback: callback,
                    meta: meta,
                    value: undefined
                })
            }
        })
    }

    //CALLBACKS
    public getDataCallbacks(): DataCallback<T>[] {
        return this.onData
    }

    public setDataCallbacks(callbacks: CloseCallback<T>[]): void {
        this.onData = callbacks
    }

    public clearDataCallback(): void {
        this.onData = undefined
    }

    public getCloseCallbacks(): CloseCallback<T>[] {
        return this.onClose
    }

    public setCloseCallbacks(callbacks: CloseCallback<T>[]): void {
        this.onClose = callbacks
    }

    public clearCloseCallback(): void {
        this.onClose = undefined
    }

    //READABLE
    public pipe(output: VarOutputStream<T>): VarStream<T> {
        const dataCallback: DataCallback<T> = (value, meta) => output.write(value, meta);
        (dataCallback as any).output = output
        this.forEach(dataCallback)
        return this
    }

    public unpipe(output: VarOutputStream<T>): VarStream<T> {
        if (!this.onData) {
            return this
        }
        this.onData = this.onData.filter((c) => (c as any).output == output)
        return this
    }

    public finally(finallyCallback: FinallyCallback<T>): VarStream<T> {
        if (!this.onClose) {
            this.onClose = []
        }
        this.onClose.push((meta, stream) => finallyCallback(meta as StreamCloseMeta, stream))
        if (this.closeData) {
            finallyCallback(this.closeData, this)
        }
        return this
    }

    public then(closeCallback: CloseCallback<T>): VarStream<T> {
        if (!this.onClose) {
            this.onClose = []
        }
        this.onClose.push((meta, stream) => {
            if (!meta.err) {
                closeCallback(meta as StreamCloseMeta, stream)
            }
        })
        if (this.closeData) {
            if (!this.closeData.err) {
                closeCallback(this.closeData as StreamErrorMeta, this)
            }
        }
        return this
    }


    public catch(errorCallback: ErrorCallback<T>): VarStream<T> {
        if (!this.onClose) {
            this.onClose = []
        }
        this.onClose.push((meta, stream) => {
            if (meta.err) {
                errorCallback(meta as StreamErrorMeta, stream)
            }
        })
        if (this.closeData) {
            if (this.closeData.err) {
                errorCallback(this.closeData as StreamErrorMeta, this)
            }
        }
        return this
    }

    public bufferValues(): Promise<T[]> {
        return new Promise<T[]>((res, rej) => {
            const buf: T[] = []
            this.forEach((value) => {
                buf.push(value)
            })
            this.finally((meta) => {
                if (meta.err) {
                    rej(meta.err)
                    return
                }
                res(buf)
            })
        })
    }

    public bufferMeta(): Promise<StreamDataMeta[]> {
        return new Promise<StreamDataMeta[]>((res, rej) => {
            const buf: StreamDataMeta[] = []
            this.forEach((value, meta) => buf.push(meta))
            this.finally((meta) => {
                if (meta.err) {
                    rej(meta.err)
                    return
                }
                res(buf)
            })
        })
    }

    public buffer(): Promise<[T, StreamDataMeta][]> {
        return new Promise<[T, StreamDataMeta][]>((res, rej) => {
            const buf: [T, StreamDataMeta][] = []
            this.forEach((value, meta) => buf.push([value, meta]))
            this.finally((meta) => {
                if (meta.err) {
                    rej(meta.err)
                    return
                }
                res(buf)
            })
        })
    }

    public collect(): Promise<[[T, StreamDataMeta][], StreamCloseMeta]> {
        return new Promise<[[T, StreamDataMeta][], StreamCloseMeta]>((res, rej) => {
            const buf: [T, StreamDataMeta][] = []
            this.forEach((value, meta) => {
                buf.push([value, meta])
            })
            this.finally((meta) => {
                if (meta.err) {
                    rej(meta.err)
                    return
                }
                res([buf, meta])
            })
        })
    }

    public toPromise(): Promise<StreamCloseMeta> {
        if (!this.promise) {
            this.promise = new Promise<StreamCloseMeta>((res, rej) => {
                if (!this.onClose) {
                    this.onClose = []
                }
                this.finally((meta) => {
                    if (meta.err) {
                        rej(meta.err)
                        return
                    }
                    res(meta)
                })
            })
        }

        return this.promise
    }

    public filter(
        callback: FilterCallback<T>,
    ): VarStream<T> {
        const newStream = new VarStream<T>()
        const promises: Promise<void>[] = []
        this.forEach((data, meta) => {
            const data2 = callback(data, meta, this)
            if (
                typeof (data2 as any).then === 'function' &&
                typeof (data2 as any).catch === 'function'
            ) {
                promises.push((async () => {
                    if (await (data2 as Promise<boolean>)) {
                        newStream.write(
                            data,
                            meta
                        )
                    }
                })())
            } else if (data2) {
                newStream.write(
                    data,
                    meta
                )
            }
        })
        this.finally(
            async (meta) => {
                while (promises.length > 0) {
                    await promises.shift()
                }
                newStream.end(meta.err, meta)
            }
        )
        return newStream
    }

    public map<R>(
        callback: MapCallback<T, R>,
    ): VarStream<R> {
        const newStream = new VarStream<R>()
        const promises: Promise<void>[] = []
        this.forEach((data, meta) => {
            const data2 = callback(data, meta, this)
            if (
                typeof (data2 as any).then === 'function' &&
                typeof (data2 as any).catch === 'function'
            ) {
                promises.push((async () => {
                    newStream.write(
                        await (data2 as Promise<R>),
                        meta
                    )
                })())
            } else {
                newStream.write(data2 as R, meta)
            }
        })
        this.finally(
            async (meta) => {
                while (promises.length > 0) {
                    await promises.shift()
                }
                newStream.end(meta.err, meta)
            }
        )
        return newStream
    }

    public spread<R>(
        callback: MapCallback<T, R[]>,
    ): VarStream<R> {
        const newStream = new VarStream<R>()
        this.forEach((data, meta) => {
            const data2 = callback(data, meta, this)
            if (Array.isArray(data2)) {
                newStream.writeAll(
                    data2.filter((v) => v != undefined),
                    meta
                )
            }
        })
        this.then((meta) => newStream.end(undefined, meta))
        this.catch((err, meta) => newStream.end(err, meta))
        return newStream
    }

    public forEach(
        callback: DataCallback<T>,
    ): VarStream<T> {
        if (!this.onData) {
            this.onData = []
            this.onData.push(callback)
            this.executeBuffer()
        } else {
            this.onData.push(callback)
        }
        return this
    }

    //WRITEABLE
    public write(value: T, meta: StreamDataMeta = {}): VarStream<T> {
        if (value == undefined) {
            throw new Error("Can't send 'undefined' into a stream!")
        }
        if (this.closed) {
            throw new Error("VarStream already closed!")
        }
        if (!this.onData) {
            if (!this.buf) {
                this.buf = []
            }
            this.buf.push([value, meta])
            return
        }
        this.onData.forEach((callback) => {
            try {
                callback(value, meta, this)
            } catch (err) {
                this.end(new Error("Error while callback!"), {
                    origin: err,
                    callbackType: "data",
                    callback: callback,
                    meta: meta,
                    value: value
                })
            }
        })
        return this
    }

    public writeAll(values: T[], meta?: StreamDataMeta[] | StreamDataMeta): VarStream<T> {
        if (this.closed) {
            throw new Error("VarStream already closed!")
        }
        values = values.filter((v) => v != undefined)
        if (!this.onData) {
            if (!this.buf) {
                this.buf = []
            }
            if (Array.isArray(meta)) {
                values.forEach((value, index) => {
                    this.buf.push([value, meta[index]])
                })
            } else {
                values.forEach((value) => {
                    this.buf.push([value, meta])
                })
            }
            return
        }
        if (Array.isArray(meta)) {
            values.forEach((value, index) => {
                this.onData.forEach((callback) => {
                    try {
                        callback(value, meta[index] ?? {}, this)
                    } catch (err) {
                        this.end(err, {
                            callbackType: "data",
                            callback: callback,
                            meta: meta,
                            value: value
                        })
                    }
                })
            })
        } else {
            values.forEach((value) => {
                this.onData.forEach((callback) => {
                    try {
                        callback(value, meta ?? {}, this)
                    } catch (err) {
                        this.end(err, {
                            callbackType: "data",
                            callback: callback,
                            meta: meta,
                            value: value
                        })
                    }
                })
            })
        }
        return this
    }
}

export async function asyncForeach<T, R>(
    arr: T[],
    func: (value: T, index: number) => R | Promise<R>,
    timeoutMillis: number = 1000 * 60 * 5,
    errorOnTimeout: boolean = true
): Promise<R[]> {
    const promises: Promise<R>[] = []
    for (let index = 0; index < arr.length; index++) {
        const index2 = index
        promises.push(new Promise<R>((res, rej) => {
            try {
                res(func(arr[index2], index2))
            } catch (err) {
                rej(err)
            }
        }))
    }
    return resolveAll(
        promises,
        timeoutMillis,
        errorOnTimeout
    )
}

export function resolveAll<T>(
    promises: Promise<T>[],
    timeoutMillis: number = 1000 * 60 * 5,
    errorOnTimeout: boolean = true,
    ignoreErrors: boolean = false,
): Promise<T[]> {
    return new Promise<T[]>(async (res, rej) => {
        const arr: T[] = []
        let finished: boolean = false
        if (timeoutMillis > 0) {
            setTimeout(
                () => {
                    if (finished) {
                        return
                    }
                    finished = true
                    if (!errorOnTimeout) {
                        res(arr)
                        return
                    }
                    rej(new Error("Promise resolveAll() timeout after " + timeoutMillis + "ms!"))
                },
                timeoutMillis
            )
        }
        for (let index = 0; index < promises.length; index++) {
            try {
                arr.push(await promises[index])
            } catch (err) {
                if (!ignoreErrors) {
                    throw err
                }
            }
            if (finished) {
                return
            }
        }

        return arr
    })
}

export interface NamedPromises<T> {
    [key: string]: Promise<T>
}

export interface SplittedPromiseResult<T> {
    res: {
        [key: string]: T
    },
    err: {
        [key: string]: (Error | any)
    },
}

export function resolveAllMarked<T>(
    promises: NamedPromises<T>,
    timeoutMillis: number = 1000 * 60 * 5,
    errorOnTimeout: boolean = true
): Promise<SplittedPromiseResult<T>> {
    return new Promise<SplittedPromiseResult<T>>(async (res, rej) => {
        const ret: SplittedPromiseResult<T> = {
            res: {},
            err: {},
        }
        let finished: boolean = false
        if (timeoutMillis > 0) {
            setTimeout(
                () => {
                    if (finished) {
                        return
                    }
                    finished = true
                    if (!errorOnTimeout) {
                        res(ret)
                        return
                    }
                    rej(new Error("Promise resolveAllMarked() timeout after " + timeoutMillis + "ms!"))
                },
                timeoutMillis
            )
        }
        const keys = Object.keys(promises)
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index]
            try {
                ret[key] = await promises[keys[index]]
            } catch (err) {
                ret[key] = err
            }
            if (finished) {
                return
            }
        }
        return ret
    })
}

export function debugValue<T>(name: string, valueFunc: () => T): T {
    const uuid = ("" + Date.now()).substring(3, 6)
    console.debug("=> => => '" + name + "'[" + uuid + "] => => =>")

    const value: T = valueFunc()
    if (value instanceof Promise) {
        return value.finally(() => {
            console.debug("<= <= <= '" + name + "'[" + uuid + "] <= <= <=")
        }) as any as T
    } else if (value instanceof VarStream) {
        value.catch(() => console.debug("<= <= <= '" + name + "'[" + uuid + "] <= <= <="))
        return value
    }

    try {
        return value
    } finally {
        console.debug("<= <= <= '" + name + "'[" + uuid + "] <= <= <=")
    }
}

export type Stringlike = string | Buffer | Stringlike[] | {
    toString(): string
}

export function toStringStringlike(some: Stringlike): string {
    if (Array.isArray(some)) {
        let save = ""
        while (some.length > 0) {
            save += toStringStringlike(some.shift())
        }
        return save
    }
    if (typeof some == "string") {
        return some
    }
    if (some instanceof Buffer) {
        return "" + some
    }
    if (typeof some.toString == "function") {
        return toStringStringlike(some.toString())
    }
    return "" + some
}

export type LogType<T> = [boolean, T]
export type BufferLogType = [boolean, Buffer]

export function printLogVarStream<T extends Stringlike>(
    stream: VarStream<LogType<T>[]>,
    errorMsg: boolean = true
): VarStream<LogType<T>[]> {
    const uuid = ("" + Date.now()).substring(3, 6)
    console.debug(uuid + " Logs started!")
    return stream
        .forEach((log) => printLog(log, uuid))
        .finally(() => console.debug(uuid + " Finished!"))
}

export function printLogPromise<T extends Stringlike>(
    promise: Promise<LogType<T>[]>
): Promise<LogType<T>[]> {
    return promise.then((data: LogType<T>[]) => printLogs(data))
}

export function printLogs<T extends Stringlike>(
    logs: LogType<T>[]
): LogType<T>[] {
    const uuid = ("" + Date.now()).substring(3, 6)
    console.debug(uuid + " Logs started!")
    logs.forEach(log => printLog(log, uuid))
    console.debug(uuid + " Finished!")
    return logs
}

export function printLog<T extends Stringlike>(
    log: T,
    uuid: string | number
): T {
    let msg = log[1]
    if (typeof msg != "string") {
        return log
    }
    while (
        msg.length > 0 &&
        (
            msg.startsWith("\n") ||
            msg.startsWith(" ")
        )
    ) {
        msg = msg.substring(1)
    }
    while (
        msg.length > 0 &&
        (
            msg.endsWith("\n") ||
            msg.endsWith(" ")
        )
    ) {
        msg = msg.slice(0, -1)
    }
    if (msg.length == 0) {
        return log
    }
    if (log[0]) {
        console.error(uuid + "_E|" + msg)
    } else {
        console.debug(uuid + "_I|" + msg)
    }
    return log
}