declare global {
    function define(...params: any[]): any
    class System {
        register(): void
    }
}

export const moduleExports: {
    [key: string]: any
} = {}

export const moduleLoader: {
    [key: string]: () => void
} = {}

export function requireModule(moduleName: string): any {
    if (typeof moduleExports[moduleName] == "object") {
        return moduleExports[moduleName]
    }
    if (typeof moduleLoader[moduleName] == "function") {
        moduleLoader[moduleName]()
        return moduleExports[moduleName]
    }
    throw new Error("Module '" + moduleName + "' is not defined!")
}

export const define = (moduleName: string, functionValue: string[], func: Function): void => {
    moduleLoader[moduleName] = () => {
        const params: any[] = []
        moduleExports[moduleName] = {}
        functionValue.forEach(element => {
            if (element == "require") {
                params.push(requireModule)
            } else if (element == "exports") {
                params.push(moduleExports[moduleName])
            } else {
                throw new Error("Define value '" + element + "' is not defined!")
            }
        })
        func(...params)
    }
}

global.define = define
