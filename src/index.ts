import { parseCmd } from "cmdy"
import root from "./cmd/oldBackup"

parseCmd({
    cmd: root,
    globalHelpMsg: "! Fleetform by HalsMaulMajo (supported by CoreUnit.NET) !",
})
    .exe()
    .catch(
        (err: Error | any) => {
            let stack = "Stack: \n"
            if (err instanceof Error) {
                const stack2 = err.stack.split("\n")
                stack2.shift()
                stack += stack2.map((s) => {
                    while (s.startsWith(" ")) {
                        s = s.substring(1)
                    }
                    return " - " + s
                }).join("\n")
            } else if (err.path) {
                stack = "Path: " + err.path
            } else {
                stack = "No stack!"
            }
            console.error("# Fleetform #\n" + err.message + "\n" + stack)
        }
    )