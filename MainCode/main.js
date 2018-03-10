//Creeps
var creep_work = require('creep.work');
var creep_work5 = require('creep.work5');
var creep_salvager = require('creep.salvager');

var creep_farMining = require('creep.farMining');
var creep_farMule = require('creep.farMule');
var creep_combat = require('creep.combat');
var creep_claimer = require('creep.claimer');
var creep_vandal = require('creep.vandal');
var creep_constructor = require('creep.constructor');
var creep_trump = require('creep.trump');
var creep_Kebab = require('creep.removeKebab');
var creep_Helper = require('creep.helper');
var creep_towerDrainer = require('creep.towerDrainer');
var creep_looter = require('creep.looter');
var creep_assattacker = require('creep.assattacker');
var creep_asshealer = require('creep.asshealer');
var creep_distractor = require('creep.distractor');
var creep_powerAttack = require('creep.powerAttack');
var creep_powerHeal = require('creep.powerHeal');
var creep_powerCollect = require('creep.powerCollect');
var creep_scraper = require('creep.scraper');

//Spawning
var spawn_BuildCreeps = require('spawn.BuildCreeps');
var spawn_BuildCreeps5 = require('spawn.BuildCreeps5');
var spawn_BuildInstruction = require('spawn.BuildInstruction');
var spawn_BuildFarCreeps = require('spawn.BuildFarCreeps');
var Traveler = require('traveler');
var bestWorkerConfig = [WORK, CARRY, MOVE, MOVE];
//var roomReference = Game.spawns['Spawn_Capital'].room;

//Towers
var tower_Operate = require('tower.Operate');

//Market
var market_buyers = require('market.FindBuyers');

//const profiler = require('screeps-profiler');

//Ctrl+Alt+f to autoformat documents.

//Constants : http://support.screeps.com/hc/en-us/articles/203084991-API-Reference
//Creep calculator : http://codepen.io/findoff/full/RPmqOd/
//Profiler commands : https://github.com/gdborton/screeps-profiler
//Emoji Unicode converter : https://r12a.github.io/apps/conversion/
//Traveler API : https://github.com/bonzaiferroni/Traveler/wiki/Traveler-API

global.lastMemoryTick = undefined;

//profiler.enable();
module.exports.loop = function() {
    tryInitSameMemory();
    //profiler.wrap(function() {
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            //console.log('Clearing non-existing creep memory:', name);
        }
    }

    //Set defaults on various memory values
    if (Game.time % 10000 == 0 || Game.flags["CheckMemory"]) {
        memCheck();
        if (Game.flags["CheckMemory"]) {
            Game.flags["CheckMemory"].remove();
        }
    }

    //Reset average CPU usage records on request
    if (Game.flags["ResetAverages"] || Memory.CPUAverages.TotalCPU.ticks >= 50000) {
        Memory.CPUAverages = new Object();
        Memory.CPUAverages.TotalCPU = new Object();
        Memory.CPUAverages.TotalCPU.ticks = 0;
        Memory.CPUAverages.TotalCPU.CPU = 0;
        Memory.CPUAverages.CreepCPU = new Object();
        Memory.CPUAverages.CreepCPU.ticks = 0;
        Memory.CPUAverages.CreepCPU.CPU = 0;
        Memory.CPUAverages.RemoteMiningCPU = new Object();
        Memory.CPUAverages.RemoteMiningCPU.ticks = 0;
        Memory.CPUAverages.RemoteMiningCPU.CPU = 0;
        Memory.CPUAverages.Pre5CPU = new Object();
        Memory.CPUAverages.Pre5CPU.ticks = 0;
        Memory.CPUAverages.Pre5CPU.CPU = 0;
        Memory.CPUAverages.Post5CPU = new Object();
        Memory.CPUAverages.Post5CPU.ticks = 0;
        Memory.CPUAverages.Post5CPU.CPU = 0;
        Memory.CPUAverages.SpawnCPU = new Object();
        Memory.CPUAverages.SpawnCPU.ticks = 0;
        Memory.CPUAverages.SpawnCPU.CPU = 0;
        if (Game.flags["ResetAverages"]) {
            Game.flags["ResetAverages"].remove();
        }
    }

    if (Game.flags["ToggleWar"]) {
        Memory.warMode = !Memory.warMode;
        Game.flags["ToggleWar"].remove();
    }

    if (Game.flags["ResetAttackFlags"]) {
        Memory.roomsUnderAttack = [];
        Memory.attackDuration = 0;
        Game.flags["ResetAttackFlags"].remove();
    }

    //Clean up crappy construction sites
    if (Game.flags["RemoveSites"]) {
        for (var s in Game.constructionSites) {
            Game.constructionSites[s].remove();
        }
        Game.flags["RemoveSites"].remove();
    }

    //Note that warMode is on
    if (Memory.warMode) {
        new RoomVisual().text("War Mode", 0, 49, {
            align: 'left',
            font: '2 Courier New',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 0.15
        });
    }

    //Tick down SK Mineral Timers
    for (var x in Memory.SKMineralTimers) {
        if (Memory.SKMineralTimers[x] > 0) {
            Memory.SKMineralTimers[x] = Memory.SKMineralTimers[x] - 1;
        }
    }

    /*if (Game.time % 250 == 0) {
        //Reset Terminal Counts
        for (var z in Memory.TerminalCollection) {
            Memory.TerminalCollection[z] = 0;
        }
    }*/

    var roomDist = 999;
    var roomEnergy = 0;
    var roomName = '';
    var instructionSpawn;

    //Loop through all spawns

    //Log average CPU for spawn processes in memory.
    var preSpawnCPU = Game.cpu.getUsed();

    if (Game.time % 1000 == 0) {
        Memory.ordersFilled = [];
    }

    var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER);
    if (towers.length) {
        var alreadySearched = [];
        for (var y = 0; y < towers.length; y++) {
            if (towers[y].room.controller.owner) {
                if (Game.time % 1000 == 0) {
                    var found = towers[y].pos.lookFor(LOOK_STRUCTURES);
                    var hasRampart = false;
                    for (var building in found) {
                        if (found[building].structureType == STRUCTURE_RAMPART) {
                            hasRampart = true;
                            break;
                        }
                    }
                    if (!hasRampart) {
                        towers[y].room.createConstructionSite(towers[y].pos.x, towers[y].pos.y, STRUCTURE_RAMPART);
                    }
                }

                if (alreadySearched.indexOf(towers[y].room.name) < 0) {
                    var RampartDirection = ""
                    //Check for hostiles in this room
                    var hostiles = towers[y].room.find(FIND_HOSTILE_CREEPS, {
                        filter: (eCreep) => (!Memory.whiteList.includes(eCreep.owner.username))
                    });
                    if (hostiles.length > 0 && Memory.roomsUnderAttack.indexOf(towers[y].room.name) === -1) {
                        Memory.roomsUnderAttack.push(towers[y].room.name);
                        RampartDirection = "Closed";
                        if (hostiles[0].owner.username == 'Invader' || (hostiles[0].hitsMax <= 100 && hostiles.length == 1)) {
                            Memory.roomsPrepSalvager.push(towers[y].room.name);
                        } else if (Memory.RoomsAt5.indexOf(towers[y].room.name) == -1 && (hostiles[0].hits > 100 || hostiles.length > 1)) {
                            //No good combat code! SAFE MODE!
                            if (!towers[y].room.controller.safeMode && (hostiles[0].getActiveBodyparts(ATTACK) > 0 || hostiles[0].getActiveBodyparts(RANGED_ATTACK) > 0 || hostiles[0].getActiveBodyparts(WORK) > 0)) {
                                towers[y].room.controller.activateSafeMode();
                            }
                        }
                    } else if (hostiles.length == 0) {
                        var UnderAttackPos = Memory.roomsUnderAttack.indexOf(towers[y].room.name);
                        var salvagerPos = Memory.roomsPrepSalvager.indexOf(towers[y].room.name);
                        if (UnderAttackPos >= 0) {
                            Memory.roomsUnderAttack.splice(UnderAttackPos, 1);
                            RampartDirection = "Open"
                        }
                        if (salvagerPos >= 0) {
                            Memory.roomsPrepSalvager.splice(salvagerPos, 1);
                        }
                    }

                    if (Memory.roomsUnderAttack.indexOf(towers[y].room.name) > -1 && !towers[y].room.controller.safeMode) {
                        if (hostiles.length && (hostiles[0].owner.username != 'Invader')) {
                            Memory.attackDuration = Memory.attackDuration + 1;
                            if (Memory.attackDuration >= 250 && !Memory.warMode) {
                                Memory.warMode = true;
                                Game.notify('War mode was enabled due to a long attack at ' + towers[y].room.name + '.');
                            }
                        }
                    } else if (Memory.roomsUnderAttack.indexOf(towers[y].room.name) == -1 && Memory.attackDuration >= 250 && Memory.roomsUnderAttack.length > 0 && !Game.flags[towers[y].room.name + "eFarGuard"]) {
                        Game.rooms[Memory.roomsUnderAttack[0]].createFlag(25, 25, towers[y].room.name + "eFarGuard");
                    } else if (Memory.roomsUnderAttack.length == 0) {
                        Memory.attackDuration = 0;
                        if (Game.flags[towers[y].room.name + "eFarGuard"]) {
                            Game.flags[towers[y].room.name + "eFarGuard"].remove();
                        }
                    }

                    if (Game.time % 500 == 0) {
                        var nukes = towers[y].room.find(FIND_NUKES);
                        if (nukes.length) {
                            RampartDirection = "Closed";
                        }
                    }

                    if (RampartDirection == "Closed") {
                        var roomRamparts = towers[y].room.find(FIND_MY_STRUCTURES, {
                            filter: {
                                structureType: STRUCTURE_RAMPART
                            }
                        });
                        for (var n = 0; n < roomRamparts.length; n++) {
                            if (roomRamparts[n].isPublic) {
                                roomRamparts[n].setPublic(false);
                            }
                        }
                    } else if (RampartDirection == "Open") {
                        var nukes = towers[y].room.find(FIND_NUKES);
                        if (!nukes.length) {
                            var roomRamparts = towers[y].room.find(FIND_MY_STRUCTURES, {
                                filter: {
                                    structureType: STRUCTURE_RAMPART
                                }
                            });
                            for (var n = 0; n < roomRamparts.length; n++) {
                                if (!roomRamparts[n].isPublic) {
                                    roomRamparts[n].setPublic(true);
                                }
                            }
                        }
                    }
                    alreadySearched.push(towers[y].room.name);
                }
                tower_Operate.run(towers[y], Memory.attackDuration, y);
            }
        }
    }

    for (const i in Game.spawns) {
        var thisRoom = Game.spawns[i].room;
        if (thisRoom.controller.owner) {
            var controllerLevel = thisRoom.controller.level;

            //Ensure all spawns have a rampart
            if (Game.time % 1000 == 0) {
                var found = Game.spawns[i].pos.lookFor(LOOK_STRUCTURES);
                var hasRampart = false;
                for (var building in found) {
                    if (found[building].structureType == STRUCTURE_RAMPART) {
                        hasRampart = true;
                        break;
                    }
                }
                if (!hasRampart) {
                    Game.spawns[i].room.createConstructionSite(Game.spawns[i].pos.x, Game.spawns[i].pos.y, STRUCTURE_RAMPART);
                }
            }

            if (Memory.RoomsRun.indexOf(thisRoom.name) < 0) {
                //Gimme some pie graphs
                const vis = new RoomVisual(thisRoom.name);
                //GCL
                drawPie(vis, Math.round(Game.gcl.progress), Game.gcl.progressTotal, 'GCL ' + Game.gcl.level, getColourByPercentage(Game.gcl.progress / Game.gcl.progressTotal, true), 2, 0.5);

                //Bucket
                drawPie(vis, Game.cpu.bucket, 10000, 'Bucket', getColourByPercentage(Math.min(1, Game.cpu.bucket / 10000), true), 6, 0.5);

                //Controller Progress + Storage Amount
                if (thisRoom.controller.level < 8) {
                    drawPie(vis, Math.round(thisRoom.controller.progress), thisRoom.controller.progressTotal, 'RCL ' + thisRoom.controller.level, getColourByPercentage(thisRoom.controller.progress / thisRoom.controller.progressTotal, true), 2, 1.5);
                    if (thisRoom.storage) {
                        drawPie(vis, Math.round(thisRoom.storage.store[RESOURCE_ENERGY]), thisRoom.storage.storeCapacity, 'Energy', getColourByPercentage(thisRoom.storage.store[RESOURCE_ENERGY] / thisRoom.storage.storeCapacity, true), 2, 2.5);
                    }
                } else if (thisRoom.storage) {
                    drawPie(vis, Math.round(thisRoom.storage.store[RESOURCE_ENERGY]), thisRoom.storage.storeCapacity, 'Energy', getColourByPercentage(thisRoom.storage.store[RESOURCE_ENERGY] / thisRoom.storage.storeCapacity, true), 2, 1.5);
                }

                //Populate the room creeps memory.
                Memory.roomCreeps[thisRoom.name] = thisRoom.find(FIND_MY_CREEPS);

                //Ensure all storage units have a rampart
                if (thisRoom.storage && Game.time % 1000 == 0) {
                    var found = thisRoom.storage.pos.lookFor(LOOK_STRUCTURES);
                    var hasRampart = false;
                    for (var building in found) {
                        if (found[building].structureType == STRUCTURE_RAMPART) {
                            hasRampart = true;
                            break;
                        }
                    }
                    if (!hasRampart) {
                        thisRoom.storage.room.createConstructionSite(thisRoom.storage.pos.x, thisRoom.storage.pos.y, STRUCTURE_RAMPART);
                    }
                }

                //Ensure all terminals have a rampart
                if (thisRoom.terminal && Game.time % 1000 == 0) {
                    var found = thisRoom.terminal.pos.lookFor(LOOK_STRUCTURES);
                    var hasRampart = false;
                    for (var building in found) {
                        if (found[building].structureType == STRUCTURE_RAMPART) {
                            hasRampart = true;
                            break;
                        }
                    }
                    if (!hasRampart) {
                        thisRoom.terminal.room.createConstructionSite(thisRoom.terminal.pos.x, thisRoom.terminal.pos.y, STRUCTURE_RAMPART);
                    }
                }

                //Execute special instruction written into console
                //DEPRECIATED - ADD INSTRUCTION TO SPAWN BLOCK
                /*if (Game.flags["DrainTurret"]) {
                    var theDistance = Game.map.getRoomLinearDistance(Game.flags["DrainTurret"].pos.roomName, thisRoom.name);
                    if (theDistance < roomDist || (theDistance == roomDist && thisRoom.energyCapacityAvailable > roomEnergy)) {
                        roomDist = theDistance;
                        roomName = thisRoom.name;
                        roomEnergy = thisRoom.energyCapacityAvailable;
                        instructionSpawn = Game.spawns[i];
                    }
                }

                if (Game.flags["Loot"] && !Memory.lootSpawn) {
                    if (thisRoom.storage) {
                        var thisRoute = Game.map.findRoute(Game.flags["Loot"].pos.roomName, thisRoom.name, {
                            routeCallback(roomName, fromRoomName) {
                                if (Memory.blockedRooms.indexOf(roomName) > -1) { // avoid this room
                                    return Infinity;
                                }
                                return 1;
                            }
                        });
                        if (thisRoute != -2) {
                            var theDistance = _.size(thisRoute);
                            if (theDistance < roomDist || (theDistance == roomDist && thisRoom.energyCapacityAvailable > roomEnergy)) {
                                roomDist = theDistance;
                                roomName = thisRoom.name;
                                roomEnergy = thisRoom.energyCapacityAvailable;
                                instructionSpawn = Game.spawns[i];
                            }
                        }
                    }
                }

                if (Game.flags["SignThis"]) {
                    var theDistance = Game.map.getRoomLinearDistance(Game.flags["SignThis"].pos.roomName, thisRoom.name);
                    if (theDistance < roomDist || (theDistance == roomDist && thisRoom.energyCapacityAvailable > roomEnergy)) {
                        roomDist = theDistance;
                        roomName = thisRoom.name;
                        roomEnergy = thisRoom.energyCapacityAvailable;
                        instructionSpawn = Game.spawns[i];
                    }
                }

                if (Game.flags["WallThis"]) {
                    var theDistance = Game.map.getRoomLinearDistance(Game.flags["WallThis"].pos.roomName, thisRoom.name);
                    if (theDistance < roomDist || (theDistance == roomDist && thisRoom.energyCapacityAvailable > roomEnergy)) {
                        roomDist = theDistance;
                        roomName = thisRoom.name;
                        roomEnergy = thisRoom.energyCapacityAvailable;
                        instructionSpawn = Game.spawns[i];
                    }
                }*/

                //Get non-suppliers off the supplier spot
                if (Game.flags[thisRoom.name + "Supply"]) {
                    var creepCheck = Game.flags[thisRoom.name + "Supply"].pos.lookFor(LOOK_CREEPS);
                    if (thisRoom.controller.level >= 6 && creepCheck.length && creepCheck[0].owner.username == "Montblanc" && creepCheck[0].memory.priority != "supplier") {
                        //Get the fuck off!
                        if (creepCheck[0].memory.priority != "supplierNearDeath") {
                            creepCheck[0].travelTo(thisRoom.controller);
                        }
                    }
                }

                //Get list of Links
                if (Game.time % 1500 == 0 || !Memory.linkList[thisRoom.name]) {
                    Memory.linkList[thisRoom.name] = [];
                    var roomLinks = thisRoom.find(FIND_MY_STRUCTURES, {
                        filter: {
                            structureType: STRUCTURE_LINK
                        }
                    });
                    var reverseFlag = false;
                    if (roomLinks) {
                        var linkCounter = 0;
                        var upgraderLink = -1;
                        var minerLink = -1;
                        var minerLink2 = -1;
                        var storageLink = -1;
                        while (roomLinks[linkCounter]) {
                            //Determine what link is before it's placed.
                            //Miner link = 0, upgrader link = 1, Miner link 2 = 2, StorageLink = 3
                            var nearSources = roomLinks[linkCounter].pos.findInRange(FIND_SOURCES, 3);
                            if (nearSources.length) {
                                //This is a miner link
                                if (minerLink == -1) {
                                    minerLink = linkCounter
                                } else {
                                    var nearLink = roomLinks[linkCounter].pos.findInRange(FIND_STRUCTURES, 2, {
                                        filter: (structure) => (structure.structureType == STRUCTURE_LINK) && (structure.id != roomLinks[linkCounter].id)
                                    });
                                    if (nearLink.length) {
                                        //If next to another link, this is the secondary
                                        minerLink2 = linkCounter
                                    } else {
                                        //If not next to another link, this is the storage
                                        if (upgraderLink != -1) {
                                            storageLink = linkCounter
                                        } else {
                                            //This is possibly the upgrader?
                                            var nearUpgrader = roomLinks[linkCounter].pos.findInRange(FIND_STRUCTURES, 5, {
                                                filter: {
                                                    structureType: STRUCTURE_CONTROLLER
                                                }
                                            });
                                            if (nearUpgrader.length) {
                                                upgraderLink = linkCounter
                                            } else {
                                                storageLink = linkCounter
                                            }
                                        }
                                    }
                                }
                            } else {
                                var nearUpgrader = roomLinks[linkCounter].pos.findInRange(FIND_STRUCTURES, 5, {
                                    filter: {
                                        structureType: STRUCTURE_CONTROLLER
                                    }
                                });
                                if (nearUpgrader.length) {
                                    //This is the upgrader link
                                    if (upgraderLink == -1) {
                                        upgraderLink = linkCounter
                                    }
                                } else {
                                    //This is the storage link
                                    storageLink = linkCounter
                                }

                            }
                            /*if (Memory.linkList[thisRoom.name].indexOf(roomLinks[linkCounter].id) == -1) {
                                Memory.linkList[thisRoom.name].push(roomLinks[linkCounter].id)
                            }
                            //If there is no source nearby, this should not be #1
                            var nearSources = roomLinks[linkCounter].pos.findInRange(FIND_SOURCES, 3);
                            if (linkCounter == 0 && nearSources.length == 0) {
                                reverseFlag = true;
                            }*/

                            //Check and add rampart if missing
                            var found = roomLinks[linkCounter].pos.lookFor(LOOK_STRUCTURES);
                            var hasRampart = false;
                            for (var building in found) {
                                if (found[building].structureType == STRUCTURE_RAMPART) {
                                    hasRampart = true;
                                    break;
                                }
                            }
                            if (!hasRampart) {
                                roomLinks[linkCounter].room.createConstructionSite(roomLinks[linkCounter].pos.x, roomLinks[linkCounter].pos.y, STRUCTURE_RAMPART);
                            }

                            linkCounter++;
                        }

                        if (minerLink != -1) {
                            Memory.linkList[thisRoom.name].push(roomLinks[minerLink].id);
                        }
                        if (upgraderLink != -1) {
                            Memory.linkList[thisRoom.name].push(roomLinks[upgraderLink].id);
                        }
                        if (minerLink2 != -1) {
                            Memory.linkList[thisRoom.name].push(roomLinks[minerLink2].id);
                        }
                        if (storageLink != -1) {
                            Memory.linkList[thisRoom.name].push(roomLinks[storageLink].id);
                        }

                        //Add all links in their designated positions

                        /*if (reverseFlag) {
                            //Wipe sources to be rechecked too
                            Memory.sourceList[thisRoom.name] = undefined;
                            Memory.linkList[thisRoom.name].reverse();
                        }*/
                    }
                }

                //Get list of Sources
                if (Game.time % 5000 == 0 || !Memory.sourceList[thisRoom.name]) {
                    Memory.sourceList[thisRoom.name] = [];
                    var roomSources = thisRoom.find(FIND_SOURCES);
                    var reverseFlag = false;
                    if (roomSources) {
                        var sourceCounter = 0;
                        while (roomSources[sourceCounter]) {
                            if (Memory.sourceList[thisRoom.name].indexOf(roomSources[sourceCounter].id) == -1) {
                                Memory.sourceList[thisRoom.name].push(roomSources[sourceCounter].id)
                            }
                            //If there is no storage unit nearby, this should not be #1
                            var nearContainers = roomSources[sourceCounter].pos.findInRange(FIND_MY_STRUCTURES, 3, {
                                filter: {
                                    structureType: STRUCTURE_STORAGE
                                }
                            });
                            if (sourceCounter == 0 && nearContainers.length == 0) {
                                reverseFlag = true;
                            }
                            sourceCounter++;
                        }
                        if (reverseFlag) {
                            Memory.sourceList[thisRoom.name].reverse();
                        }
                    }
                }

                //Get list of Minerals
                if (!Memory.mineralList[thisRoom.name]) {
                    Memory.mineralList[thisRoom.name] = [];
                    var mineralLocations = thisRoom.find(FIND_MINERALS);
                    if (mineralLocations.length) {
                        Memory.mineralList[thisRoom.name].push(mineralLocations[0].id);
                    }
                }

                //Get list of extractors
                if (Game.time % 10000 == 0 || !Memory.extractorList[thisRoom.name]) {
                    Memory.extractorList[thisRoom.name] = [];
                    var extractorLocations = thisRoom.find(FIND_MY_STRUCTURES, {
                        filter: {
                            structureType: STRUCTURE_EXTRACTOR
                        }
                    });
                    if (extractorLocations) {
                        if (extractorLocations.length > 0) {
                            Memory.extractorList[thisRoom.name].push(extractorLocations[0].id);
                        }
                    }
                }

                //Get list of labs
                if (Game.time % 5000 == 0 || !Memory.labList[thisRoom.name]) {
                    Memory.labList[thisRoom.name] = [];
                    var labLocations = thisRoom.find(FIND_MY_STRUCTURES, {
                        filter: {
                            structureType: STRUCTURE_LAB
                        }
                    });
                    for (var thisLab in labLocations) {
                        if (Memory.labList[thisRoom.name].indexOf(labLocations[thisLab].id) == -1) {
                            Memory.labList[thisRoom.name].push(labLocations[thisLab].id);
                        }
                        //Check and add rampart if missing
                        var found = labLocations[thisLab].pos.lookFor(LOOK_STRUCTURES);
                        var hasRampart = false;
                        for (var building in found) {
                            if (found[building].structureType == STRUCTURE_RAMPART) {
                                hasRampart = true;
                                break;
                            }
                        }
                        if (!hasRampart) {
                            labLocations[thisLab].room.createConstructionSite(labLocations[thisLab].pos.x, labLocations[thisLab].pos.y, STRUCTURE_RAMPART);
                        }
                    }
                    Memory.labList[thisRoom.name].sort();
                }

                //Get list of power spawns
                if (Game.time % 5000 == 0 || !Memory.powerSpawnList[thisRoom.name]) {
                    Memory.powerSpawnList[thisRoom.name] = [];
                    var powerSpawns = thisRoom.find(FIND_MY_STRUCTURES, {
                        filter: {
                            structureType: STRUCTURE_POWER_SPAWN
                        }
                    });
                    if (powerSpawns) {
                        if (powerSpawns.length > 0) {
                            Memory.powerSpawnList[thisRoom.name].push(powerSpawns[0].id);

                            var found = powerSpawns[0].pos.lookFor(LOOK_STRUCTURES);
                            var hasRampart = false;
                            for (var building in found) {
                                if (found[building].structureType == STRUCTURE_RAMPART) {
                                    hasRampart = true;
                                    break;
                                }
                            }
                            if (!hasRampart) {
                                powerSpawns[0].room.createConstructionSite(powerSpawns[0].pos.x, powerSpawns[0].pos.y, STRUCTURE_RAMPART);
                            }
                        }
                    }
                }

                //Get list of observers
                if (Game.time % 5000 == 0 || !Memory.observerList[thisRoom.name]) {
                    Memory.observerList[thisRoom.name] = [];
                    var roomObservers = thisRoom.find(FIND_MY_STRUCTURES, {
                        filter: {
                            structureType: STRUCTURE_OBSERVER
                        }
                    });
                    if (roomObservers && roomObservers.length > 0) {
                        Memory.observerList[thisRoom.name].push(roomObservers[0].id);
                    }
                }

                //Get list of nukers
                if (Game.time % 5000 == 0 || !Memory.nukerList[thisRoom.name]) {
                    Memory.nukerList[thisRoom.name] = [];
                    var theseNukes = thisRoom.find(FIND_MY_STRUCTURES, {
                        filter: {
                            structureType: STRUCTURE_NUKER
                        }
                    });
                    if (theseNukes) {
                        if (theseNukes.length > 0) {
                            Memory.nukerList[thisRoom.name].push(theseNukes[0].id);

                            var found = theseNukes[0].pos.lookFor(LOOK_STRUCTURES);
                            var hasRampart = false;
                            for (var building in found) {
                                if (found[building].structureType == STRUCTURE_RAMPART) {
                                    hasRampart = true;
                                    break;
                                }
                            }
                            if (!hasRampart) {
                                theseNukes[0].room.createConstructionSite(theseNukes[0].pos.x, theseNukes[0].pos.y, STRUCTURE_RAMPART);
                            }
                        }
                    }
                }

                //Review market data and sell to buy orders
                if (Game.time % 50 == 0 && thisRoom.terminal) {
                    market_buyers.run(thisRoom, thisRoom.terminal, Memory.mineralList[thisRoom.name]);
                    /*for (var y in Object.keys(thisRoom.terminal.store)) {
                        Memory.TerminalCollection[Object.keys(thisRoom.terminal.store)[y]] = thisRoom.terminal.store[Object.keys(thisRoom.terminal.store)[y]] + Memory.TerminalCollection[Object.keys(thisRoom.terminal.store)[y]];
                    }*/
                }

                //Handle Links
                if (Memory.linkList[thisRoom.name][0]) {
                    var roomLink = Game.getObjectById(Memory.linkList[thisRoom.name][0]);
                    var receiveLink = Game.getObjectById(Memory.linkList[thisRoom.name][1]);
                    if (roomLink && receiveLink && roomLink.energy >= 400 && roomLink.cooldown == 0 && receiveLink.energy < 400) {
                        roomLink.transferEnergy(receiveLink);
                    }
                    if (Memory.linkList[thisRoom.name].length >= 4) {
                        var roomLink2 = Game.getObjectById(Memory.linkList[thisRoom.name][2]);
                        var receiveLink2 = Game.getObjectById(Memory.linkList[thisRoom.name][3]);
                        if (roomLink2 && receiveLink2 && roomLink2.energy >= 400 && roomLink2.cooldown == 0 && receiveLink2.energy < 800) {
                            roomLink2.transferEnergy(receiveLink2);
                        }
                    }
                }

                //Handle Power Spawn
                if (Memory.powerSpawnList[thisRoom.name][0] && thisRoom.storage && thisRoom.storage.store[RESOURCE_ENERGY] >= 100000) {
                    var thisPowerSpawn = Game.getObjectById(Memory.powerSpawnList[thisRoom.name][0]);
                    if (thisPowerSpawn) {
                        if (thisPowerSpawn.energy >= 50 && thisPowerSpawn.power > 0) {
                            thisPowerSpawn.processPower();
                        }
                    }
                }

                //Handle Labs
                if (Game.time % 5 == 0 && Memory.labList[thisRoom.name].length >= 6) {
                    var lab6 = Game.getObjectById(Memory.labList[thisRoom.name][5]);
                    if (lab6 && lab6.cooldown <= 0 && lab6.mineralAmount <= lab6.mineralCapacity - 5) {
                        var lab4 = Game.getObjectById(Memory.labList[thisRoom.name][3]);
                        var lab5 = Game.getObjectById(Memory.labList[thisRoom.name][4]);
                        if (lab4 && lab5 && lab4.mineralAmount >= 5 && lab5.mineralAmount >= 5) {
                            var response = lab6.runReaction(lab4, lab5);
                            if (response == -9) {
                                Game.notify('Lab not in range! ' + thisRoom.name + "-" + Memory.labList[thisRoom.name][3] + "|" + Memory.labList[thisRoom.name][4] + "|" + Memory.labList[thisRoom.name][5]);
                            }
                        }
                    }

                    if (Memory.labList[thisRoom.name].length >= 9) {
                        var lab9 = Game.getObjectById(Memory.labList[thisRoom.name][8]);
                        if (lab9 && lab9.cooldown <= 0 && lab9.mineralAmount <= lab9.mineralCapacity - 5) {
                            var lab7 = Game.getObjectById(Memory.labList[thisRoom.name][6]);
                            var lab8 = Game.getObjectById(Memory.labList[thisRoom.name][7]);
                            if (lab7 && lab8 && lab7.mineralAmount >= 5 && lab8.mineralAmount >= 5) {
                                var response = lab9.runReaction(lab7, lab8);
                                if (response == -9) {
                                    Game.notify('Lab not in range! ' + thisRoom.name + "-" + Memory.labList[thisRoom.name][6] + "|" + Memory.labList[thisRoom.name][7] + "|" + Memory.labList[thisRoom.name][8]);
                                }
                            }
                        }
                    }
                }

                //Handle Observers
                if (Memory.postObserveTick && Memory.powerCheckList[thisRoom.name] && Memory.powerCheckList[thisRoom.name].length > 0 && !Game.flags[thisRoom.name + "PowerGather"]) {
                    //Search observed room for power bank
                    if (Game.rooms[Memory.powerCheckList[thisRoom.name][0]]) {
                        var powerbanks = Game.rooms[Memory.powerCheckList[thisRoom.name][0]].find(FIND_STRUCTURES, {
                            filter: (eStruct) => (eStruct.structureType == STRUCTURE_POWER_BANK && eStruct.power >= 1650 && eStruct.ticksToDecay >= 4500)
                        });
                        if (powerbanks.length) {
                            Game.rooms[Memory.powerCheckList[thisRoom.name][0]].createFlag(powerbanks[0].pos.x, powerbanks[0].pos.y, thisRoom.name + "PowerGather");
                        }
                    }

                    //Move searched room to the back of the list
                    Memory.powerCheckList[thisRoom.name].push(Memory.powerCheckList[thisRoom.name].shift());
                }

                if (Game.time % 50 == 0 && Memory.observerList[thisRoom.name].length >= 1 && Memory.powerCheckList[thisRoom.name].length > 0 && !Game.flags[thisRoom.name + "PowerGather"] && thisRoom.storage && (!thisRoom.storage.store[RESOURCE_POWER] || thisRoom.storage.store[RESOURCE_POWER] < 50000)) {
                    var thisObserver = Game.getObjectById(Memory.observerList[thisRoom.name][0]);
                    if (thisObserver) {
                        thisObserver.observeRoom(Memory.powerCheckList[thisRoom.name][0]);
                        if (!Memory.postObserveTick) {
                            Memory.postObserveTick = true;
                        }
                    }
                }

                //Update advanced script rooms
                if (Memory.RoomsAt5.indexOf(thisRoom.name) == -1 && (thisRoom.storage && Memory.linkList[thisRoom.name].length == 2)) {
                    Memory.RoomsAt5.push(thisRoom.name)
                } else if ((!thisRoom.storage || Memory.linkList[thisRoom.name].length < 2) && Memory.RoomsAt5.indexOf(thisRoom.name) != -1) {
                    //This room shouldn't be on this list
                    var thisRoomIndex = Memory.RoomsAt5.indexOf(thisRoom.name)
                    Memory.RoomsAt5.splice(thisRoomIndex, 1);
                }

                //Update creep configs if energy cap has changed
                if (Memory.RoomsAt5.indexOf(thisRoom.name) == -1) {
                    Memory.energyCap[thisRoom.name] = [];
                    Memory.energyCap[thisRoom.name].push(thisRoom.energyCapacityAvailable);
                    recalculateBestWorker(Memory.energyCap[thisRoom.name][0]);
                }

                //if (Game.flags[thisRoom.name + "FarGuard"]) {
                //Memory.FarGuardNeeded[thisRoom.name] = true;
                //}
            }

            if (Memory.isSpawning == null) {
                Memory.isSpawning = false;
            }

            var delay = 10;
            if (thisRoom.controller.level == 8) {
                delay = 15;
            }

            if (Game.time % delay == 0 && Memory.NoSpawnNeeded.indexOf(thisRoom.name) < 0 && !Game.spawns[i].spawning) {
                if (Memory.creepInQue.indexOf(Game.spawns[i].name) >= 0) {
                    //Clear creep from que array
                    var queSpawnIndex = Memory.creepInQue.indexOf(Game.spawns[i].name);
                    Memory.creepInQue.splice(queSpawnIndex - 3, 4);
                }

                if (Game.flags["SignThis"] && Game.flags["SignThis"].pos.roomName == Game.spawns[i].pos.roomName) {
                    spawn_BuildInstruction.run(Game.spawns[i], 'vandalize', '', '', '');
                }

                if (Game.flags["ClaimThis"] && thisRoom.name == 'E21N58') {
                    if (Game.flags["UseDefinedRoute"]) {
                        spawn_BuildInstruction.run(Game.spawns[i], 'claim', Game.flags["ClaimThis"].pos.roomName, '', 'E28N57;E25N57;E25N58;E24N58');
                    } else {
                        spawn_BuildInstruction.run(Game.spawns[i], 'claim', Game.flags["ClaimThis"].pos.roomName);
                    }
                }

                if (Game.flags["BuildThis"] && thisRoom.name == 'E21N58') {
                    var sitesOnTile = Game.flags["BuildThis"].pos.lookFor(LOOK_CONSTRUCTION_SITES);
                    if (sitesOnTile.length) {
                        if (Game.flags["UseDefinedRoute"]) {
                            spawn_BuildInstruction.run(Game.spawns[i], 'construct', sitesOnTile[0].id, Game.flags["BuildThis"].pos.roomName, 'E28N57;E25N57;E25N58;E24N58');
                            //spawn_BuildInstruction.run(Game.spawns[i], 'construct', '', Game.flags["BuildThis"].pos.roomName, 'E33N44;E33N46;E32N46');
                        } else {
                            spawn_BuildInstruction.run(Game.spawns[i], 'construct', sitesOnTile[0].id, Game.flags["BuildThis"].pos.roomName);
                            //spawn_BuildInstruction.run(Game.spawns[i], 'construct', '', Game.flags["BuildThis"].pos.roomName);
                        }
                    }
                }

                if (Game.flags[thisRoom.name + "RunningAssault"]) {
                    var targetFlag = Game.flags[thisRoom.name + "Assault"];
                    if (!targetFlag) {
                        for (j = 2; j < 6; j++) {
                            targetFlag = Game.flags[thisRoom.name + "Assault" + j]
                            if (targetFlag) {
                                break;
                            }
                        }
                    }

                    if (targetFlag) {
                        spawn_BuildInstruction.run(Game.spawns[i], 'assault', targetFlag.pos.roomName, '', '');
                    } else {
                        console.log(thisRoom.name + " has assault running, but no target!");
                    }
                }

                if (Game.flags[thisRoom.name + "SendHelper"]) {
                    if (Game.flags["UseDefinedRoute"]) {
                        spawn_BuildInstruction.run(Game.spawns[i], 'helper', Game.flags[thisRoom.name + "SendHelper"].pos.roomName, '', 'E28N57;E25N57;E25N58;E24N58');
                    } else {
                        spawn_BuildInstruction.run(Game.spawns[i], 'helper', Game.flags[thisRoom.name + "SendHelper"].pos.roomName);
                    }
                }

                if (Game.flags[thisRoom.name + "Distract"]) {
                    spawn_BuildInstruction.run(Game.spawns[i], 'distract', Game.flags[thisRoom.name + "Distract"].pos.roomName, '', Game.flags[thisRoom.name + "Distract"].name);
                }

                if (Game.flags["RemoveKebab"] && thisRoom.name == 'E32N46') {
                    spawn_BuildInstruction.run(Game.spawns[i], 'removeKebab', Game.flags["RemoveKebab"].pos.roomName, '', 'E32N47;E31N47');
                }

                if (Game.flags[thisRoom.name + "PowerGather"]) {
                    spawn_BuildInstruction.run(Game.spawns[i], 'powerGather', Game.flags[thisRoom.name + "PowerGather"].pos.roomName, '', '');
                }

                if (Game.flags[thisRoom.name + "Loot"]) {
                    spawn_BuildInstruction.run(Game.spawns[i], 'loot', Game.flags[thisRoom.name + "Loot"].pos.roomName, '', Game.spawns[i].room.name);
                }

                if (Game.flags[thisRoom.name + "PowerCollect"]) {
                    //Mule capacity = 1650
                    if (Game.flags[thisRoom.name + "PowerGather"] && Game.flags[thisRoom.name + "PowerGather"].pos) {
                        //Calculate needed number of mules
                        var powerBanks = Game.flags[thisRoom.name + "PowerGather"].pos.lookFor(LOOK_STRUCTURES);
                        if (powerBanks.length) {
                            var muleNeed = Math.ceil(powerBanks[0].power / 1650);
                            if (muleNeed > 0) {
                                spawn_BuildInstruction.run(Game.spawns[i], 'powerCollect', Game.flags[thisRoom.name + "PowerCollect"].pos.roomName, '', muleNeed);
                            }
                        }
                    }
                }

                if (!Memory.isSpawning) {
                    if (Memory.RoomsAt5.indexOf(thisRoom.name) == -1) {
                        if (!Game.flags["DoNotBuild"]) {
                            spawn_BuildCreeps.run(Game.spawns[i], bestWorkerConfig, thisRoom, Memory.roomCreeps[thisRoom.name]);
                        }
                    } else {
                        spawn_BuildCreeps5.run(Game.spawns[i], thisRoom, Memory.roomCreeps[thisRoom.name]);
                    }
                }

                if (!Memory.isSpawning) {
                    if (Game.flags[thisRoom.name + "FarMining"] || Game.flags[thisRoom.name + "FarGuard"]) {
                        //Run farMining spawn
                        if (Game.flags[thisRoom.name + "RunningAssault"]) {
                            var attackers = _.filter(Game.creeps, (creep) => creep.memory.priority == 'assattacker' && creep.memory.homeRoom == thisRoom.name);
                            var healers = _.filter(Game.creeps, (creep) => creep.memory.priority == 'asshealer' && creep.memory.homeRoom == thisRoom.name);
                            if (attackers.length >= 3 && healers.length >= 3) {
                                spawn_BuildFarCreeps.run(Game.spawns[i], thisRoom);
                            }
                        } else {
                            spawn_BuildFarCreeps.run(Game.spawns[i], thisRoom);
                        }
                    }
                }

                if (!Memory.isSpawning) {
                    Memory.NoSpawnNeeded.push(thisRoom.name);
                    if (Game.spawns[i].energy >= 100) {
                        var nearbyCreeps = Game.spawns[i].pos.findInRange(FIND_MY_CREEPS, 1, {
                            filter: (thisCreep) => (thisCreep.ticksToLive <= CREEP_LIFE_TIME - 100)
                        });
                        if (nearbyCreeps.length) {
                            Game.spawns[i].renewCreep(nearbyCreeps[0]);
                        }
                    }
                }
            } else {
                if (Game.spawns[i].energy >= 100) {
                    var nearbyCreeps = Game.spawns[i].pos.findInRange(FIND_MY_CREEPS, 1, {
                        filter: (thisCreep) => (thisCreep.ticksToLive <= CREEP_LIFE_TIME - 100)
                    });
                    if (nearbyCreeps.length) {
                        Game.spawns[i].renewCreep(nearbyCreeps[0]);
                    }
                }
            }

            Memory.isSpawning = false;

            Memory.RoomsRun.push(thisRoom.name);
        }

    }

    //Clear observe tick, rooms have been checked.
    if (Memory.postObserveTick && Game.time % 50 != 0) {
        Memory.postObserveTick = false;
    }

    //Average(new) = Average(old) + (value(new) - average(old)) / size(new)
    Memory.CPUAverages.SpawnCPU.ticks = Memory.CPUAverages.SpawnCPU.ticks + 1;
    var totalSpawnCPU = Game.cpu.getUsed() - preSpawnCPU;
    Memory.CPUAverages.SpawnCPU.CPU = Memory.CPUAverages.SpawnCPU.CPU + ((totalSpawnCPU - Memory.CPUAverages.SpawnCPU.CPU) / Memory.CPUAverages.SpawnCPU.ticks)

    Memory.RoomsRun = [];
    Memory.NoSpawnNeeded = [];
    Memory.roomCreeps = new Object();

    if (Game.time % 1000 == 0) {
        //Periodically look for purchasable tokens
        var FilteredOrders = Game.market.getAllOrders(order => order.resourceType == SUBSCRIPTION_TOKEN && order.type == ORDER_SELL && order.price <= Game.market.credits);
        if (FilteredOrders.length > 0) {
            FilteredOrders.sort(orderPriceCompareBuying);
            if (Game.market.deal(FilteredOrders[0].id, 1) == OK) {
                Game.notify('A subscription token was purchased for ' + FilteredOrders[0].price + ' credits');
            }
        }
    }

    //Globally controlls all creeps in all rooms
    //Log average CPU for creep processes in memory.
    var preCreepCPU = Game.cpu.getUsed();
    var farMiningCPU = 0;
    var pre5CPU = 0;
    var post5CPU = 0;
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (!creep.spawning) {
            switch (creep.memory.priority) {
                case 'farMule':
                case 'farMuleNearDeath':
                    var pre = Game.cpu.getUsed();
                    var doExcessWork = true;
                    if (Game.cpu.bucket < 500) {
                        doExcessWork = false;
                    }
                    creep_farMule.run(creep, doExcessWork);
                    farMiningCPU = farMiningCPU + (Game.cpu.getUsed() - pre);
                    break;
                case 'farClaimer':
                case 'farMiner':
                case 'farGuard':
                case 'SKAttackGuard':
                case 'SKHealGuard':
                case 'farClaimerNearDeath':
                case 'farMinerNearDeath':
                case 'farGuardNearDeath':
                case 'SKAttackGuardNearDeath':
                case 'SKHealGuardNearDeath':
                case 'farMineralMiner':
                    var pre = Game.cpu.getUsed();
                    var doExcessWork = true;
                    if (Game.cpu.bucket < 500) {
                        doExcessWork = false;
                    }
                    creep_farMining.run(creep, doExcessWork);
                    farMiningCPU = farMiningCPU + (Game.cpu.getUsed() - pre);
                    break;
                case 'claimer':
                    creep_claimer.run(creep);
                    break;
                case 'TowerDrainer':
                    creep_towerDrainer.run(creep);
                    break;
                case 'constructor':
                    creep_constructor.run(creep);
                    break;
                case 'removeKebab':
                    creep_Kebab.run(creep);
                    break;
                case 'looter':
                    creep_looter.run(creep);
                    break;
                case 'vandal':
                    creep_vandal.run(creep);
                    break;
                case 'helper':
                    creep_Helper.run(creep);
                    break;
                case 'defender':
                    creep_combat.run(creep);
                    break;
                case 'trump':
                    creep_trump.run(creep);
                    break;
                case 'assattacker':
                    creep_assattacker.run(creep);
                    break;
                case 'asshealer':
                    creep_asshealer.run(creep);
                    break;
                case 'distractor':
                    creep_distractor.run(creep);
                    break;
                case 'powerAttack':
                case 'powerAttackNearDeath':
                    creep_powerAttack.run(creep);
                    break;
                case 'powerHeal':
                case 'powerHealNearDeath':
                    creep_powerHeal.run(creep);
                    break;
                case 'powerCollector':
                    creep_powerCollect.run(creep);
                    break;
                case 'scraper':
                case 'scraperNearDeath':
                    creep_scraper.run(creep);
                    break;
                case 'salvager':
                case 'salvagerNearDeath':
                    creep_salvager.run(creep);
                    break;
                default:
                    /*if (!creep.memory.priority) {
                        creep.memory.priority = 'constructor';
                        var creepPath = 'E38N40;E38N39'.split(";");
                        creep.memory.path = creepPath;
                        creep.memory.homeRoom = 'E38N40';
                        creep.memory.destination = 'E38N39';
                    }*/
                    if (Memory.RoomsAt5.indexOf(creep.room.name) === -1) {
                        var pre = Game.cpu.getUsed();
                        if (Game.cpu.bucket >= 500 || Memory.warMode) {
                            creep_work.run(creep, 25);
                            pre5CPU = pre5CPU + (Game.cpu.getUsed() - pre);
                        } else {
                            creep.say("\u2716\uFE0F", false);
                        }
                    } else {
                        if (creep.memory.priority == 'harvester' || creep.memory.priority == 'builder') {
                            //In case of emergency
                            creep_work.run(creep, 25);
                        } else {
                            var pre = Game.cpu.getUsed();
                            if ((Game.cpu.bucket >= 500 || Memory.warMode) || creep.memory.priority == 'upgrader' || creep.memory.priority == 'upgraderNearDeath' || creep.memory.priority == 'miner' || creep.memory.priority == 'minerNearDeath') {
                                creep_work5.run(creep);
                                post5CPU = post5CPU + (Game.cpu.getUsed() - pre);
                            } else {
                                creep.say("\u2716\uFE0F", false);
                            }
                        }
                    }
                    break;
            }
        }
    }

    //Creep - overall
    Memory.CPUAverages.CreepCPU.ticks = Memory.CPUAverages.CreepCPU.ticks + 1;
    var totalCreepCPU = Game.cpu.getUsed() - preCreepCPU;
    Memory.CPUAverages.CreepCPU.CPU = Memory.CPUAverages.CreepCPU.CPU + ((totalCreepCPU - Memory.CPUAverages.CreepCPU.CPU) / Memory.CPUAverages.CreepCPU.ticks);

    //Creep - Remote Miners
    if (farMiningCPU > 0) {
        Memory.CPUAverages.RemoteMiningCPU.ticks = Memory.CPUAverages.RemoteMiningCPU.ticks + 1;
        Memory.CPUAverages.RemoteMiningCPU.CPU = Memory.CPUAverages.RemoteMiningCPU.CPU + ((farMiningCPU - Memory.CPUAverages.RemoteMiningCPU.CPU) / Memory.CPUAverages.RemoteMiningCPU.ticks);
    }

    //Creep - Pre RCL5
    if (pre5CPU > 0) {
        Memory.CPUAverages.Pre5CPU.ticks = Memory.CPUAverages.Pre5CPU.ticks + 1;
        Memory.CPUAverages.Pre5CPU.CPU = Memory.CPUAverages.Pre5CPU.CPU + ((pre5CPU - Memory.CPUAverages.Pre5CPU.CPU) / Memory.CPUAverages.Pre5CPU.ticks);
    }

    //Creep - Post RCL5
    if (post5CPU > 0) {
        Memory.CPUAverages.Post5CPU.ticks = Memory.CPUAverages.Post5CPU.ticks + 1;
        Memory.CPUAverages.Post5CPU.CPU = Memory.CPUAverages.Post5CPU.CPU + ((post5CPU - Memory.CPUAverages.Post5CPU.CPU) / Memory.CPUAverages.Post5CPU.ticks);
    }

    //Total Usage
    Memory.CPUAverages.TotalCPU.ticks = Memory.CPUAverages.TotalCPU.ticks + 1;
    var totalCPU = Game.cpu.getUsed();
    Memory.CPUAverages.TotalCPU.CPU = Memory.CPUAverages.TotalCPU.CPU + ((totalCPU - Memory.CPUAverages.TotalCPU.CPU) / Memory.CPUAverages.TotalCPU.ticks);

    //});
}

function recalculateBestWorker(thisEnergyCap) {
    //Move : 50
    //Work : 100
    //Carry : 50 (50 resource/per)
    //Attack : 80
    //Ranged_Attack : 150
    //Heal : 250
    //Claim : 600 (Don't automate)
    //Tough : 10

    //1 Full balanced worker module : MOVE, CARRY, WORK - 200pts
    var EnergyRemaining = thisEnergyCap;
    bestWorkerConfig = [];
    while ((EnergyRemaining / 200) >= 1 || bestWorkerConfig.length >= 21) {
        bestWorkerConfig.push(MOVE, CARRY, WORK);
        if (bestWorkerConfig.length > 21) {
            while (bestWorkerConfig.length > 21) {
                bestWorkerConfig.splice(-1, 1)
            }
            break;
        }
        EnergyRemaining = EnergyRemaining - 200;
    }
    //Make the modules pretty
    bestWorkerConfig.sort();
}

function memCheck() {
    if (!Memory.RoomsRun) {
        Memory.RoomsRun = [];
        console.log('RoomsRun Defaulted');
    }
    if (!Memory.NoSpawnNeeded) {
        Memory.NoSpawnNeeded = [];
        console.log('NoSpawnNeeded Defaulted');
    }
    if (!Memory.creepInQue) {
        Memory.creepInQue = [];
        console.log('creepInQue Defaulted');
    }
    if (!Memory.roomsUnderAttack) {
        Memory.roomsUnderAttack = [];
        console.log('roomsUnderAttack Defaulted');
    }
    if (!Memory.SKRoomsUnderAttack) {
        Memory.SKRoomsUnderAttack = [];
    }
    if (!Memory.FarRoomsUnderAttack) {
        Memory.FarRoomsUnderAttack = [];
    }
    if (!Memory.roomsPrepSalvager) {
        Memory.roomsPrepSalvager = [];
        console.log('roomsPrepSalvager Defaulted');
    }
    if (!Memory.RoomsAt5) {
        Memory.RoomsAt5 = [];
    }
    if (!Memory.hasFired) {
        Memory.hasFired = [];
    }
    if (!Memory.ordersFilled) {
        Memory.ordersFilled = [];
    }
    if (!Memory.whiteList) {
        Memory.whiteList = ['DomNomNom', 'Kotarou', 'ICED_COFFEE', 'demawi', 'o4kapuk', 'ben2', 'Jibol', 'szumi', 'Xist', 'Xolym', 'SirFrump', 'ART999', 'ThyReaper']; //'ThyReaper'
    }
    if (!Memory.blockedRooms) {
        Memory.blockedRooms = ['E84N87', 'E83N88', 'E82N87', 'E83N86', 'E81N84', 'E82N83', 'E81N81', 'E84N82', 'E86N81', 'E88N81'];
    }
    //Boolean
    if (Memory.warMode == null) {
        Memory.warMode = false;
    }
    if (Memory.guardType == null) {
        Memory.guardType = false;
    }
    if (Memory.postObserveTick == null) {
        Memory.postObserveTick = false;
    }
    //Decimal
    if (!Memory.averageUsedCPU) {
        Memory.averageUsedCPU = 0.0;
    }
    if (!Memory.averageUsedSpawnCPU) {
        Memory.averageUsedSpawnCPU = 0.0;
    }
    if (!Memory.averageUsedCreepCPU) {
        Memory.averageUsedSpawnCPU = 0.0;
    }
    //Integer
    if (!Memory.totalTicksRecorded) {
        Memory.totalTicksRecorded = 0;
    }
    if (!Memory.totalTicksSpawnRecorded) {
        Memory.totalTicksSpawnRecorded = 0;
    }
    if (!Memory.totalTicksCreepRecorded) {
        Memory.totalTicksSpawnRecorded = 0;
    }
    if (!Memory.attackDuration) {
        Memory.attackDuration = 0;
    }
    //Object
    if (!Memory.SKMineralTimers) {
        Memory.SKMineralTimers = new Object();
    }
    /*if (!Memory.TerminalCollection) {
        Memory.TerminalCollection = new Object();
    }*/
    if (!Memory.FarClaimerNeeded) {
        Memory.FarClaimerNeeded = new Object();
    }
    if (!Memory.FarGuardNeeded) {
        Memory.FarGuardNeeded = new Object();
    }
    if (!Memory.FarCreeps) {
        Memory.FarCreeps = new Object();
    }
    if (!Memory.PriceList) {
        Memory.PriceList = new Object();
    }
    if (!Memory.sourceList) {
        Memory.sourceList = new Object();
    }
    if (!Memory.linkList) {
        Memory.linkList = new Object();
    }
    if (!Memory.mineralList) {
        Memory.mineralList = new Object();
    }
    if (!Memory.extractorList) {
        Memory.extractorList = new Object();
    }
    if (!Memory.powerSpawnList) {
        Memory.powerSpawnList = new Object();
    }
    Memory.powerCheckList = new Object();
    Memory.powerCheckList["E89N86"] = ["E90N87", "E90N86", "E90N85", "E90N88"];
    Memory.powerCheckList["E89N83"] = ["E90N84", "E90N83", "E90N82"];
    Memory.powerCheckList["E85N89"] = ["E84N90", "E85N90", "E86N90"];
    Memory.powerCheckList["E88N75"] = ["E90N74", "E90N75", "E90N76"];
    Memory.powerCheckList["E86N68"] = ["E85N70"];
    Memory.powerCheckList["E81N79"] = ["E82N80", "E81N80", "E80N80", "E80N79", "E80N78"];
    Memory.powerCheckList["E74N81"] = ["E73N80", "E74N80", "E75N80"];
    Memory.powerCheckList["E88N88"] = ["E89N90", "E90N90", "E90N89"];
    Memory.powerCheckList["E38N46"] = ["E40N47", "E40N46", "E40N45"];
    Memory.powerCheckList["E21N58"] = ["E20N59", "E20N58", "E20N57"];
    if (!Memory.observerList) {
        Memory.observerList = new Object();
    }
    if (!Memory.nukerList) {
        Memory.nukerList = new Object();
    }
    if (!Memory.energyCap) {
        Memory.energyCap = new Object();
    }
    if (!Memory.roomCreeps) {
        Memory.roomCreeps = new Object();
    }
    if (!Memory.towerNeedEnergy) {
        Memory.towerNeedEnergy = new Object();
    }
    if (!Memory.towerPickedTarget) {
        Memory.towerPickedTarget = new Object();
    }
    if (!Memory.mineralNeed) {
        Memory.mineralNeed = new Object();
    }
    if (!Memory.labList) {
        Memory.labList = new Object();
    }
    if (!Memory.CPUAverages) {
        Memory.CPUAverages = new Object();
        Memory.CPUAverages.TotalCPU = new Object();
        Memory.CPUAverages.TotalCPU.ticks = 0;
        Memory.CPUAverages.TotalCPU.CPU = 0;
        Memory.CPUAverages.CreepCPU = new Object();
        Memory.CPUAverages.CreepCPU.ticks = 0;
        Memory.CPUAverages.CreepCPU.CPU = 0;
        Memory.CPUAverages.RemoteMiningCPU = new Object();
        Memory.CPUAverages.RemoteMiningCPU.ticks = 0;
        Memory.CPUAverages.RemoteMiningCPU.CPU = 0;
        Memory.CPUAverages.Pre5CPU = new Object();
        Memory.CPUAverages.Pre5CPU.ticks = 0;
        Memory.CPUAverages.Pre5CPU.CPU = 0;
        Memory.CPUAverages.Post5CPU = new Object();
        Memory.CPUAverages.Post5CPU.ticks = 0;
        Memory.CPUAverages.Post5CPU.CPU = 0;
        Memory.CPUAverages.SpawnCPU = new Object();
        Memory.CPUAverages.SpawnCPU.ticks = 0;
        Memory.CPUAverages.SpawnCPU.CPU = 0;
    }
}

function orderPriceCompare(a, b) {
    if (a.price < b.price)
        return 1;
    if (a.price > b.price)
        return -1;
    return 0;
}

function orderPriceCompareBuying(a, b) {
    if (a.price < b.price)
        return -1;
    if (a.price > b.price)
        return 1;
    return 0;
}

function drawPie(vis, val, max, title, colour, centerx, centery, inner) {
    //const vis = new RoomVisual(from.roomName);
    if (!inner) inner = val;

    let p = 1;
    if (max !== 0) p = val / max;
    const r = 1; // radius
    var center = {
        x: centerx,
        y: centery * r * 4.5
    };
    vis.circle(center, {
        radius: r + 0.1,
        fill: '#000000',
        stroke: 'rgba(255, 255, 255, 0.8)',
    });
    var pfix = p;
    if (p >= 1) {
        pfix = pfix + 0.01;
    }
    const poly = [center];
    const tau = 2 * Math.PI;
    const surf = tau * (pfix);
    const offs = -Math.PI / 2;
    const step = tau / 32;
    for (let i = 0; i <= surf; i += step) {
        poly.push({
            x: center.x + Math.cos(i + offs),
            y: center.y - Math.cos(i),
        });
    }
    poly.push(center);
    vis.poly(poly, {
        fill: colour,
        opacity: 1,
        stroke: colour,
        strokeWidth: 0.05,
    });
    vis.text(Number.isFinite(inner) ? formatNumber(inner) : inner, center.x, center.y + 0.33, {
        color: '#FFFFFF',
        font: '1 monospace',
        align: 'center',
        stroke: 'rgba(0, 0, 0, 0.8)',
        strokeWidth: 0.08,
    });
    let yoff = 0.7;
    if (0.35 < p && p < 0.65) yoff += 0.3;
    vis.text(title, center.x, center.y + r + yoff, {
        color: '#FFFFFF',
        font: '0.6 monospace',
        align: 'center',
    });
    const lastpol = poly[poly.length - 2];
    vis.text('' + Math.floor(p * 100) + '%', lastpol.x + (lastpol.x - center.x) * 0.7, lastpol.y + (lastpol.y - center.y) * 0.4 + 0.1, {
        color: '#FFFFFF',
        font: '0.4 monospace',
        align: 'center',
    });
}

const getColourByPercentage = (percentage, reverse) => {
    const value = reverse ? percentage : 1 - percentage;
    const hue = (value * 120).toString(10);
    return `hsl(${hue}, 100%, 50%)`;
};

function formatNumber(number) {
    let ld = Math.log10(number) / 3;
    if (!number) return number;
    let n = number.toString();
    if (ld < 1) {
        return n;
    }
    if (ld < 2) {
        return n.substring(0, n.length - 3) + 'k';
    }
    if (ld < 3) {
        return n.substring(0, n.length - 6) + 'M';
    }
    if (ld < 4) {
        return n.substring(0, n.length - 9) + 'B';
    }
    return number.toString();
}

function tryInitSameMemory() {
    if (lastMemoryTick && global.LastMemory && Game.time == (lastMemoryTick + 1)) {
        delete global.Memory
        global.Memory = global.LastMemory
        RawMemory._parsed = global.LastMemory
    } else {
        Memory;
        global.LastMemory = RawMemory._parsed
    }
    lastMemoryTick = Game.time
}