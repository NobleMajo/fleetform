# fleetform

A Container IAC (Infrastructure as Code) deploy tool.

Fleetform is a cli tool which deploys Docker container infrastructures on multiple hosts.   

# Benefit

Sometimes there is the point that you just want to start and manage 2-3 containers on 1-2 hosts without log into each host or create a kubernetes deployment.

For example i you just want to test some container or run a single instance.

**Attention**: Its currently just a WIP (Work in progress) but you can already use it. 

## Work
 - A docker like cli tool
 - Rich, help, verbose and debug flags
 - "--file/-f" (default current working dir) defines the plan file / project dir
 - "--disassemble/-d" flag that stops all running flaged fleetform container on the local host
 - "--apply/-a" flag first disassemble everything and deploy then every planned container on the local host
 - "--ignorets" ignore ts files or configs
 - "--ignorejson" ignore json files

## Planned
 - Multihost functionality (currently just localhost)
 - "--timeout/-t" flag to set the connection timeout
 - "--testconnection" flag to test the host connections
 - "--watch/-w" flag to watch changes on a plan and apply changes if changed
 - "--sync" flag that allows to 
 - Better docker network configuration

# How it work

It first loads a json, javascript or typescript infrastructure file that already contains your container IAC (Infrastructure as Code) in a json object format.  

Then a plan will be created that describes conntection informations, container-host relations.

Fleetform pulls needed images, stop all old containers and deploy the new plan.

# getting started

## install fleetform
```sh

```

//TODO: WIP

# Naming

"Fleetform" forms and manages a Docker container infrastructure.
The word "fleet" from the name refers to ships, or rather container ships.
"from" is a verb with the context to form something.




