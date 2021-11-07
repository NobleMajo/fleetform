import { EventEmitter } from "stream";

export type VarStreamMeta = {
    [key: string]: any
}

export type VarStreamEvent<T> = ["data", T, VarStreamMeta] | ["error", Error, VarStreamMeta] | ["close", undefined, VarStreamMeta]

export type VarStreamData<T> = (value: T, meta: VarStreamMeta, stream: VarStream<T>) => Promise<void> | void
export type VarStreamClose<T> = (meta: VarStreamMeta, stream: VarStream<T>) => Promise<void> | void
export type VarStreamError<T> = (err: Error | any, meta: VarStreamMeta, stream: VarStream<T>) => Promise<void> | void

export class UnhandledVatStreamError extends Error { }

export class VarStream<T> {
    private static defaultErrorCb: VarStreamError<any> = (err: Error | any, meta) => typeof meta == "object" && Object.keys(meta).length > 0 ? console.error(err, "\nMeta:\n", meta) : console.error(err)

    private closed: boolean = false
    private buffer?: VarStreamEvent<T>[]
    private dataCb?: VarStreamData<T>[] = []
    private closeCb?: VarStreamClose<T>[] = []
    private errorCb?: VarStreamError<T>[] = []

    constructor(
        public readonly meta: VarStreamMeta = {},
        onData?: VarStreamData<T>,
        onClose?: VarStreamClose<T>,
        onError?: VarStreamError<T>
    ) {
        if (onData) {
            this.onData = onData
        }
        if (onClose) {
            this.onClose = onClose
        }
        if (onError) {
            this.onError = onError
        }
    }

    public set onData(data: VarStreamData<T>) {
        const dataSet: boolean = this.dataCb ? true : false
        this.dataCb.push(data)
        if (dataSet) {
            return
        }
        while (this.buffer && this.buffer.length > 0) {
            const event = this.buffer[0]
            if (event[0] != "data") {
                break
            }
            this.dataCb.forEach((cb) => cb(event[1], event[2], this))
        }
        if (this.buffer && this.buffer.length > 0) {
            const closeEvent = this.buffer[0]
            if (closeEvent[0] == "error" && this.errorCb) {
                this.errorCb.forEach(cb => (closeEvent[1], closeEvent[2], this))
            } else if (this.closeCb) {
                this.closeCb.forEach(element => (closeEvent[2], this))
            }
        }
    }

    public getOnDataCallbacks(): VarStreamData<T>[] {
        return this.dataCb
    }

    public clearOnDataCallbacks(): void {
        this.dataCb = []
    }

    public set onClose(close: VarStreamClose<T>) {
        const closeSet: boolean = this.closeCb ? true : false
        this.closeCb.push(close)
        if (closeSet) {
            return
        }
        if (this.buffer && this.buffer.length > 0) {
            const closeEvent = this.buffer[0]
            if (closeEvent[0] == "close" && this.closeCb) {
                this.closeCb.forEach((cb) => cb(closeEvent[2], this))
            }
        }
    }

    public getOnCloseCallbacks(): VarStreamClose<T>[] {
        return this.closeCb
    }

    public clearOnCloseCallbacks(): void {
        this.closeCb = []
    }

    public set onError(error: VarStreamError<T>) {
        const errorSet: boolean = this.errorCb ? true : false
        this.errorCb.push(error)
        if (errorSet) {
            return
        }
        if (this.buffer && this.buffer.length > 0) {
            const closeEvent = this.buffer[0]
            if (closeEvent[0] == "error" && this.errorCb) {
                this.errorCb.forEach((cb) => cb(closeEvent[1], closeEvent[2], this))
            }
        }
    }

    public getOnErrorCallbacks(): VarStreamError<T>[] {
        return this.errorCb
    }

    public clearOnErrorCallbacks(): void {
        this.errorCb = []
    }

    write(value: T, meta: VarStreamMeta = {}): void {
        if (this.closed) {
            throw new Error("VarStream already closed!")
        }
        if (!this.dataCb) {
            if (!this.buffer) {
                this.buffer = []
            }
            this.buffer.push(["data", value, meta])
            return
        }
        this.dataCb.forEach((cb) => cb(value, meta, this))
    }

    close(meta: VarStreamMeta = {}): void {
        if (this.closed) {
            return
        }
        this.closed = true
        if (!this.closeCb) {
            if (!this.buffer) {
                this.buffer = []
            }
            this.buffer.push(["close", undefined, meta])
            return
        }
        this.closeCb.forEach((cb) => cb(meta, this))
    }

    error(err: Error | any, meta: VarStreamMeta = {}): void {
        if (this.closed) {
            return
        }
        this.closed = true
        if (!this.closeCb) {
            if (!this.buffer) {
                this.buffer = []
            }
            this.buffer.push(["error", err, meta])
            throw new UnhandledVatStreamError()
        }
        this.closeCb.forEach((cb) => cb(meta, this))
    }

    isClosed(): boolean {
        return this.closed
    }

    map<R>(
        cb: (value: T, meta: VarStreamMeta) => R | undefined,
    ): VarStream<R> {
        const newStream = new VarStream<R>()
        this.onData = (data, meta) => newStream.write(cb(data, meta))
        this.onClose = (meta) => newStream.close(meta)
        this.onError = (err, meta) => newStream.error(err, meta)
        return newStream
    }

    use<R>(
        cb: (value: T, meta: VarStreamMeta, stream: VarStream<T>) => R | undefined,
        closeCb: (meta: VarStreamMeta, stream: VarStream<T>) => undefined | void,
        errorCb: (err: Error | any, meta: VarStreamMeta, stream: VarStream<T>) => Error | any | undefined | void
    ): VarStream<R> {
        const newStream = new VarStream<R>()
        this.onData = (data, meta, stream) => {
            const data2 = cb(data, meta, this)
            if (data2 != undefined) {
                newStream.write(data2)
            }
        }
        this.onClose = (meta) => {
            closeCb(meta, this)
            newStream.close()
        }
        this.onError = (err, meta) => newStream.error(errorCb(err, meta, this) ?? err, meta)

        return newStream
    }

    forEach(
        cb: (value: T, meta: VarStreamMeta, stream: VarStream<T>) => void,
        closeCb?: (meta: VarStreamMeta, stream: VarStream<T>) => void,
        errorCb?: (err: Error | any, meta: VarStreamMeta, stream: VarStream<T>) => void
    ): Promise<void> {
        const stream = this
        return new Promise<void>((res, rej) => {
            stream.onData = (value, meta) => cb(value, meta, stream)
            stream.onClose = (meta) => {
                if (closeCb) {
                    closeCb(meta, stream)
                }
                res()
            }
            stream.onError = (err, meta) => {
                if (errorCb) {
                    errorCb(err, meta, stream)
                }
                rej(err)
            }
        })
    }

    toPromise(
        closeCb?: (meta: VarStreamMeta, stream: VarStream<T>) => void,
        errorCb?: (err: Error | any, meta: VarStreamMeta, stream: VarStream<T>) => void
    ): Promise<T[]> {
        const stream = this
        return new Promise<T[]>((res, rej) => {
            const buffer: T[] = []
            stream.onData = (value) => { buffer.push(value) }
            stream.onClose = (meta) => {
                if (closeCb) {
                    closeCb(meta, stream)
                }
                res(buffer)
            }
            stream.onError = (err, meta) => {
                if (errorCb) {
                    errorCb(err, meta, stream)
                }
                rej(err)
            }
        })
    }
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
        value.use(
            (v) => [v],
            () => {
                console.debug("<= <= <= '" + name + "'[" + uuid + "] <= <= <=")
            },
            (e) => {
                console.debug("<= <= <= '" + name + "'[" + uuid + "] <= <= <=")
                return [e]
            }
        )
        return value
    }

    try {
        return value
    } finally {
        console.debug("<= <= <= '" + name + "'[" + uuid + "] <= <= <=")
    }
}


export type LogType = [boolean, string]

export function printLogVarStream<T extends LogType>(stream: VarStream<T>, errorMsg: boolean = true): VarStream<T> {
    const uuid = ("" + Date.now()).substring(3, 6)
    console.debug(uuid + " Started!")
    return stream.use(
        (log) => {
            if (log[0]) {
                console.error(uuid + " E|" + log[1])
            } else {
                console.debug(uuid + " I|" + log[1])
            }
            return log
        },
        (m) => {
            console.debug(uuid + " Finished!")
            return m as any
        },
        (e) => {
            console.debug(uuid + " Error! " + (errorMsg && e.message ? e.message : ""))
            return [e]
        }
    )
}

export function printLogPromise(promise: Promise<LogType[]>): Promise<LogType[]> {
    const uuid = ("" + Date.now()).substring(3, 6)
    return promise.then((data: LogType[]) => {
        data.forEach(log => {
            if (log[0]) {
                console.error(uuid + " E|" + log[1])
            } else {
                console.debug(uuid + " I|" + log[1])
            }
        })
        console.debug(uuid + " Finished!")
        return data
    })
}