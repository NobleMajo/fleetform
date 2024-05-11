# fleetform (deprecated project)
![Docker](https://img.shields.io/docker/image-size/majo418/fleetform)
![CI/CD](https://github.com/majo418/fleetform/workflows/Image/badge.svg)
![CI/CD](https://github.com/majo418/fleetform/workflows/Publish/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)

![typescript](https://img.shields.io/badge/dynamic/json?style=plastic&color=blue&label=Typescript&prefix=v&query=devDependencies.typescript&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmajo418%2Ffleetform%2Fmain%2Fpackage.json)
![npm](https://img.shields.io/npm/v/fleetform.svg?style=plastic&logo=npm&color=red)
![github](https://img.shields.io/badge/dynamic/json?style=plastic&color=darkviolet&label=GitHub&prefix=v&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmajo418%2Ffleetform%2Fmain%2Fpackage.json)

![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ffleetform)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ffleetform)
![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ffleetform)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ffleetform)
![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ffleetform)

# table of contents
- [fleetform](#fleetform)
- [table of contents](#table-of-contents)
- [about](#about)
- [benefit](#benefit)
- [already working](#already-working)
- [work in progress](#work-in-progress)
- [glossary](#glossary)
- [example](#example)
- [how it work](#how-it-work)
- [getting started](#getting-started)
  - [requirements](#requirements)
  - [install fleetform](#install-fleetform)
  - [run fleetform (node)](#run-fleetform-node)
- [development (tsnode)](#development-tsnode)
  - [uninstall fleetform](#uninstall-fleetform)
- [Cli Output](#cli-output)
  - [ff (base command)](#ff-base-command)
  - [ff apply -h](#ff-apply--h)
  - [ff destroy -h](#ff-destroy--h)
- [Naming](#naming)
- [npm scripts](#npm-scripts)
  - [use](#use)
  - [base scripts](#base-scripts)
  - [watch mode](#watch-mode)
- [contribution](#contribution)

# about
A Container IAC (Infrastructure as Code) deploy tool.  
Fleetform is a cli tool which deploys Docker container infrastructures on multiple hosts.  
**Attention**: Its currently just a WIP (Work in progress) but you can already use it.

!!! WARNING !!!
!!! THIS README IS OuTDATED !!!

# benefit
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

# glossary
You need basic knowledge about docker and command line tools.
 - `fleet`: A container infrastructure defined by a json file or a typescript/javascript project.
 - `ff`: The command line tools command to run fleetform.
 - `ffdev`: The development command to run the fleetform typescript code directly with ts-node.

# example
[example-fleet](https://github.com/majo418/example-fleet) is a example fleetform fleet.

# how it work

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
git clone git@github.com:majo418/FleetForm.git fleetform
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

! Fleetform by majo418 (supported by CoreUnit.NET) !
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

! Fleetform by majo418 (supported by CoreUnit.NET) !
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

! Fleetform by majo418 (supported by CoreUnit.NET) !
```

# Naming

"Fleetform" forms and manages a Docker container infrastructure.
The word "fleet" from the name refers to ships, or rather container ships.
"from" is a verb with the context to form something.

# npm scripts
The npm scripts are made for linux but can also work on mac and windows.
## use
You can run npm scripts in the project folder like this:
```sh
npm run <scriptname>
```
Here is an example:
```sh
npm run test
```

## base scripts
You can find all npm scripts in the `package.json` file.
This is a list of the most important npm scripts:
 - test // test the app
 - build // build the app
 - exec // run the app
 - start // build and run the app

## watch mode
Like this example you can run all npm scripts in watch mode:
```sh
npm run start:watch
```

# contribution
 - 1. fork the project
 - 2. implement your idea
 - 3. create a pull/merge request
```ts
// please create seperated forks for different kind of featues/ideas/structure changes/implementations
```

---
**cya ;3**  
*by majo418*

