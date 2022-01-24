# fleetform

A Container IAC (Infrastructure as Code) deploy tool.

Fleetform is a cli tool which deploys Docker container infrastructures on multiple hosts.  

**Attention**: Its currently just a WIP (Work in progress) but you can already use it. 

# Benefit

Sometimes there is the point that you just want to start and manage 2-3 containers on 1-2 hosts without log into each host or create a kubernetes deployment.

For example i you just want to test some container or run a single instance of it.

# already working
 - A docker like cli tool
 - Rich, help, verbose and debug flags
 - "--file/-f" (default current working dir) defines the plan file / project dir
 - "--verbose" flag as global flag to analyse what fleetform is doing 
 - "destroy" sub command
    - remove all fleetform created and all plan networks and containers
    - and more flags...
 - "apply" sub command
    - auto check difference between plan and current containers and networks
    - pull needed images
    - create networks
    - create and start containe async
    - "--destroy" flag to recreate everything
    - and more flags...
 - "plan" sub command shows the plan date to the console
    - and more flags...
 - "--ignorets" ignore ts files or configs
 - "--ignorejson" ignore json files

# work in progress
 - Multihost functionality (currently just localhost)
 - "--timeout/-t" flag to set the connection timeout
 - "--testconnection" flag to test the host connections
 - "--watch/-w" flag to watch changes on a plan and apply changes if changed
 - Better docker network configuration

# How it work

It first loads a json, javascript or typescript infrastructure file that already contains your container IAC (Infrastructure as Code) in a json object format.  

Then a plan will be created that describes conntection informations, container-host relations.

Fleetform pulls needed images, stop all old containers and deploy the new plan.

# getting started

## requirements
 - Linux based operation system
 - Docker (Cli + Runtime) installed and started
 - nodejs 16+ (and npm 8+) installed
 - git

## install fleetform
This creates a "fleetform" folder
```sh
git clone git@github.com:HalsMaulMajo/FleetForm.git fleetform
cd fleetform && npm i && npm i -g .
```

## run fleetform (node)
```sh
ff -h
```

# development (tsnode)
You can also run fleetform with tsnode
```sh
ffdev -h
```

## uninstall fleetform
You also need to delete the "fleetform" folder.
```sh
npm un -g fleetform
```

# Cli Output

## ff (base command)
```sh
# FLEETFORM #

Usage: fleetform [OPTIONS] COMMAND

Fleetform is a tool to deploy docker infrastructure on multiple hosts.

Options:
  -v, --verbose Show basic flag adn target informations.
  -h, --help    Shows this help output

Commands:
apply   Applys the fleetplan container infrstructure.
destory Destorys the whole container infrasturcture.
plan    Load and validate the fleet-config and creates and print a fleet-plan.

Details:
You can use Fleetform to deploy a whole infrasturcture on multiple host/servers with one command.

! Fleetform by HalsMaulMajo (supported by CoreUnit.NET) !
```

## ff apply -h
```sh
# APPLY #

Usage: fleetform apply [OPTIONS]

Applys the fleetplan container infrstructure.

Options:
  -v, --verbose              Show basic flag adn target informations.
  -f, --file [string]        The path to a file or a folder with a fleet.json, js or ts file!
      --ignorets             Don't compile typescript files/projects if found at target file/folder.
      --ignorejson           Don't parse json files if found at target file.
  -c, --currenthost [string] Set the current host name (default: 'local').
      --nameprefix [string]  Set the container and network prefix (default: 'ff-').
  -w, --watch                Starts fleetform in watch mode.
  -t, --timeout [number]     Set timeout for apply the contianer
  -o, --outfile [string]     Export the parsed fleetform data json into a file.
  -p, --printdata            Print parsed fleetdata to console.
  -d, --destroy              Destroys the whole container infrstructure before creating it.
  -h, --help                 Shows this help output

Details:
Load and validate the fleet-config, creates and print a fleet-plan and test the defined host connections.

! Fleetform by HalsMaulMajo (supported by CoreUnit.NET) !
```

## ff destroy -h
```sh
# DESTORY #

Usage: fleetform destory [OPTIONS]

Destorys the whole container infrasturcture.

Options:
  -v, --verbose              Show basic flag adn target informations.
  -f, --file [string]        The path to a file or a folder with a fleet.json, js or ts file!
      --ignorets             Don't compile typescript files/projects if found at target file/folder.
      --ignorejson           Don't parse json files if found at target file.
  -c, --currenthost [string] Set the current host name (default: 'local').
      --nameprefix [string]  Set the container and network prefix (default: 'ff-').
  -t, --timeout [number]     Set timeout for apply the contianer
  -o, --outfile [string]     Export the parsed fleetform data json into a file.
  -p, --printdata            Print parsed fleetdata to console.
  -h, --help                 Shows this help output

Run 'fleetform destory --help' for more informations on a command.

! Fleetform by HalsMaulMajo (supported by CoreUnit.NET) !
```

# Naming

"Fleetform" forms and manages a Docker container infrastructure.
The word "fleet" from the name refers to ships, or rather container ships.
"from" is a verb with the context to form something.

---

*by HalsMaulMajo (supported by CoreUnit.NET)*




