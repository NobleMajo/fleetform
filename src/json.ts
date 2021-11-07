export type JsonType = string | number | boolean | null | JsonObject | JsonType[]
export interface JsonObject {
    [key: string]: JsonType
}
