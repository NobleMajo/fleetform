import env2 from "./env"

export type EnvType = "string" | "number" | "boolean"

const env = env2

Object.keys(process.env).forEach((key: string) => {
    env[key] = env[key] ?? process.env[key]
})

const req = (key: string, type: string, ...types: string[]): void => {
    types.push(type)
    const value = env[key]
    if (typeof value == "boolean") {
        if (types.includes("boolean")) {
            env[key] = value
        } else if (types.includes("string")) {
            env[key] = "" + value
        } else if (value == true) {
            env[key] = 1
        } else {
            env[key] = 0
        }
    } else if (typeof value == "number") {
        if (types.includes("number")) {
            env[key] = value
        } else if (types.includes("string")) {
            env[key] = "" + value
        } else if (value > 0) {
            env[key] = true
        } else {
            env[key] = false
        }
    } else {
        if (typeof value != "string") {
            throw new Error("Value is not a string, number or boolean: " + value)
        }
        if (types.includes("string")) {
            env[key] = value
        } else if (types.includes("number") && Number(value) != NaN) {
            env[key] = Number(value)
        } else if (value.toLowerCase() == "true") {
            env[key] = true
        } else {
            env[key] = false
        }
    }
}

req("PORT", "number")

Object.keys(env).forEach((key: string) => {
    process.env[key] = "" + env[key]
})

export default env