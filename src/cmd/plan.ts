import { CmdResult, Flag, CmdDefinition } from "cmdy"
import { DockerExecuter } from "../docker"
import { formatPath, getFileType, watchChanges, writeJson } from "../files"
import { connectAllDockerHosts, parseFleetPlan, validateFleetSettings } from "../fleetformFunc"
import { importModule } from "../node"
import { hostname } from "os"
import { FleetSettings } from "src/fleetformTypes"
import { createNetworks, pullNeededImages, removeContainer, removeNetworks, runAllContainer } from "src/dockerFunc"


export const planDefinition: CmdDefinition = {
    name: "plan",
    alias: ["test", "validate"],
    description: "Load and validate the fleet-config and creates and print a fleet-plan.",
    flags: [
    ],
    cmds: [
    ],
    exe: async (cmd) => {
        let file = process.cwd()
        if (
            cmd.valueFlags.file &&
            typeof cmd.valueFlags.file[0] == "string"
        ) {
            file = cmd.valueFlags.file[0]
        }
        file = formatPath(file)
        const ignoreTypescript = cmd.flags.includes("ignorets")
        const ignoreJson = cmd.flags.includes("ignorejson")
        const verbose = cmd.flags.includes("verbose")
        const printData = cmd.flags.includes("printdata")
        const testConnection = cmd.flags.includes("testconnection")
        const apply = cmd.flags.includes("apply")
        const disassemble = cmd.flags.includes("disassemble")
        const namePrefix = cmd.valueFlags.nameprefix[0]
        const outFile = cmd.valueFlags.outfile[0]
        let currentHost = cmd.valueFlags.currenthost[0]
        if (typeof currentHost != "string") {
            currentHost = undefined
        }
        let timeout = Number(cmd.valueFlags.timeout[0])
        if (timeout == NaN || typeof timeout != "number") {
            timeout = -1
        }
        if (verbose) {
            console.info("# VERBOSE #", {
                file,
                ignoreTypescript,
                ignoreJson,
                verbose,
                testConnection,
                flags: cmd.flags,
                flagValues: cmd.valueFlags
            })
        }
        let data = await importModule(file, {
            allowJson: !ignoreJson,
            compileTs: !ignoreTypescript,
        })
        console.info("# FLEET CONFIG FOUND #")
        if (data.default) {
            data = data.default
        }
        const fleetSettings: FleetSettings = validateFleetSettings(data, currentHost, namePrefix)
        console.info("# FLEET CONFIG VALID #")
        const plan = parseFleetPlan(fleetSettings)
        if (printData) {
            console.info("# FLEET SETTINGS #", plan)
        }
        if (outFile) {
            await writeJson(
                formatPath(outFile),
                plan as any
            )
            console.info("# OUTPUT FILE READY #")
        }
        const connections = await connectAllDockerHosts(plan, testConnection)
        if (testConnection) {
            console.info("# CONNECTION INFO #")
            Object.keys(connections).forEach((host) => {
                if (!connections[host].err) {
                    console.info(" + '" + hostname + "' connected!")
                }
            })
            Object.keys(connections).forEach((host) => {
                if (connections[host].err) {
                    console.error(" - '" + hostname + "': ", connections[host].err)
                }
            })
        } else if (!disassemble && !apply) {
            if (cmd.flags.length == 0) {
                console.error("Use '-h' for more infos and '-a' to apply a plan!'")
            }
            return
        }
        const usedHosts = Object.keys(plan.hostContainer)
        for (let index = 0; index < usedHosts.length; index++) {
            const hostName = usedHosts[index]
            const executer: DockerExecuter = connections[hostName].executer
    
            console.info("# REMOVE OLD #")
            await Promise.all([
                removeNetworks(
                    executer,
                    plan,
                ),
                removeContainer(
                    executer,
                    plan
                )
            ])
    
            if (apply) {
                console.info("# APPLY NETWORKS #")
                await createNetworks(
                    executer,
                    plan.dockerHostNetworks[hostName],
                    plan.namePrefix
                )
    
                console.info("# PULL IMAGES #")
                await pullNeededImages(
                    executer,
                    plan
                )
    
                console.info("# APPLY CONTAINER #")
                await runAllContainer(
                    executer,
                    plan
                )
            }
        }
        console.log("finished!")
    }
}

export default planDefinition