//Instructions:
//require('special').specialInstruction('claim', [PathOfRooms]);
//require('special').specialInstruction('vandalize', [ArrayOfRooms], 'message');
//require('special').specialInstruction('construct', 'constructionID', [PathOfRooms]);
//require('special').specialInstruction('removeKebab', 'enemySpawnID', [PathOfRooms]);

//require('special').specialInstruction('construct', '58705347da857f0660495253', ['E3N60', 'E4N60', 'E4N61', 'E4N62'])

//require('special').specialInstruction('removeKebab', '58366a7b84afc9937e209535', ['E3N60', 'E2N60', 'E2N61', 'E1N61', 'E0N61', 'E0N62', 'E0N63', 'E1N63', 'E2N63']);

//Creeps
var creep_work = require('creep.work');
var creep_work5 = require('creep.work5');
var creep_farMining = require('creep.farMining');
var creep_combat = require('creep.combat');
var creep_claimer = require('creep.claimer');
var creep_vandal = require('creep.vandal');
var creep_constructor = require('creep.constructor');
var creep_Kebab = require('creep.removeKebab');

//Spawning
var spawn_BuildCreeps = require('spawn.BuildCreeps');
var spawn_BuildCreeps5 = require('spawn.BuildCreeps5');
var spawn_BuildInstruction = require('spawn.BuildInstruction');
var spawn_BuildFarCreeps = require('spawn.BuildFarCreeps');
var bestWorkerConfig = [WORK, CARRY, MOVE];
//var roomReference = Game.spawns['Spawn_Capital'].room;

//Expansion
var spawn_AutoExpand = require('spawn.AutoExpand');
var lastControllerLevel = 1;

//Towers
var tower_Operate = require('tower.Operate');

//Market
var market_buyers = require('market.FindBuyers');

Memory.IgnoreRoadRooms = "E1N63"

//const profiler = require('screeps-profiler');

//Ctrl+Alt+f to autoformat documents.

//Constants : http://support.screeps.com/hc/en-us/articles/203084991-API-Reference
//Creep calculator : http://codepen.io/findoff/full/RPmqOd/
//Profiler commands : https://github.com/gdborton/screeps-profiler
//Emoji Unicode converter : https://r12a.github.io/apps/conversion/

//profiler.enable();
module.exports.loop = function() {
    //profiler.wrap(function() {
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            //console.log('Clearing non-existing creep memory:', name);
        }
    }

    //Use experimental PathFinder
    PathFinder.use(true);

    //Set defaults on various memory values
    memCheck();

    var roomDist = 999;
    var roomName = '';
    var instructionSpawn;

    //Loop through all spawns
    for (var i in Game.spawns) {
        var thisRoom = Game.spawns[i].room;
        var controllerLevel = thisRoom.controller.level;

        if (Memory.RoomsRun.indexOf(thisRoom.name) < 0) {
            //Display the remaining progress of the controller
            var remainingEnergy = thisRoom.controller.progressTotal - thisRoom.controller.progress;
            if (remainingEnergy > 0) {
                var formattedNumber = remainingEnergy.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                if (remainingEnergy == 420) {
                    thisRoom.visual.text("Blaze it fgt \uD83C\uDF41\uD83D\uDD25 \uD83D\uDC4C\uD83D\uDE38\uD83D\uDD95", thisRoom.controller.pos.x + 1, thisRoom.controller.pos.y, {
                        align: 'left',
                        size: 10,
                        color: '#7DE3B5'
                    });
                } else {
                    thisRoom.visual.text(formattedNumber, thisRoom.controller.pos.x + 1, thisRoom.controller.pos.y, {
                        align: 'left',
                        size: 1,
                        color: '#7DE3B5'
                    });
                }
            }
            //Execute special instruction written into console
            if (Game.flags["ClaimThis"]) {
                var theDistance = Game.map.getRoomLinearDistance(Game.flags["ClaimThis"].pos.roomName, thisRoom.name);
                if (theDistance < roomDist) {
                    roomDist = theDistance;
                    roomName = thisRoom.name;
                    instructionSpawn = Game.spawns[i];
                }
            }

            if (Game.flags["BuildThis"]) {
                var theDistance = Game.map.getRoomLinearDistance(Game.flags["BuildThis"].pos.roomName, thisRoom.name);
                if (theDistance < roomDist) {
                    roomDist = theDistance;
                    roomName = thisRoom.name;
                    instructionSpawn = Game.spawns[i];
                }
            }

            if (Memory.Instruction) {
                switch (Memory.Instruction) {
                    case 'claim':
                        spawn_BuildInstruction.run(Game.spawns[i], Memory.Instruction, Memory.InstructionOps, thisRoom);
                        delete Memory.Instruction;
                        delete Memory.InstructionOps;
                        break;
                    case 'vandalize':
                        spawn_BuildInstruction.run(Game.spawns[i], Memory.Instruction, Memory.InstructionOps, thisRoom, Memory.InstructionOps2);
                        delete Memory.Instruction;
                        delete Memory.InstructionOps;
                        delete Memory.InstructionOps2;
                        break;
                    case 'construct':
                        spawn_BuildInstruction.run(Game.spawns[i], Memory.Instruction, Memory.InstructionOps, thisRoom, Memory.InstructionOps2);
                        delete Memory.Instruction;
                        delete Memory.InstructionOps;
                        delete Memory.InstructionOps2;
                        break;
                    case 'removeKebab':
                        spawn_BuildInstruction.run(Game.spawns[i], Memory.Instruction, Memory.InstructionOps, thisRoom, Memory.InstructionOps2);
                        delete Memory.Instruction;
                        delete Memory.InstructionOps;
                        delete Memory.InstructionOps2;
                        break;
                }
            }

            //Check for hostiles in this room
            var hostiles = thisRoom.find(FIND_HOSTILE_CREEPS, {
                filter: (creep) => (creep.getActiveBodyparts(WORK) > 0 || creep.getActiveBodyparts(CARRY) > 0 || creep.getActiveBodyparts(ATTACK) > 0 || creep.getActiveBodyparts(RANGED_ATTACK) > 0 || creep.getActiveBodyparts(HEAL) > 0) || (creep.hits <= 500)
            });
            if (hostiles.length > 0 && Memory.roomsUnderAttack.indexOf(thisRoom.name) === -1) {
                Memory.roomsUnderAttack.push(thisRoom.name);
                if (hostiles[0].owner.username == 'Invader') {
                    Memory.roomsPrepSalvager.push(thisRoom.name);
                }
            } else if (hostiles.length == 0) {
                var UnderAttackPos = Memory.roomsUnderAttack.indexOf(thisRoom.name);
                var salvagerPos = Memory.roomsPrepSalvager.indexOf(thisRoom.name);
                if (UnderAttackPos >= 0) {
                    Memory.roomsUnderAttack.splice(UnderAttackPos, 1);
                }
                if (salvagerPos >= 0) {
                    Memory.roomsPrepSalvager.splice(salvagerPos, 1);
                }
            }

            //Keep the towerList object updated
            if (Game.time % 100 == 0 || !Memory.towerList[thisRoom.name]) {
                if (!Memory.towerList[thisRoom.name]) {
                    Memory.towerList[thisRoom.name] = [];
                }
                var roomTowers = thisRoom.find(FIND_MY_STRUCTURES, {
                    filter: {
                        structureType: STRUCTURE_TOWER
                    }
                });
                if (roomTowers) {
                    var towerCounter = 0;
                    while (roomTowers[towerCounter]) {
                        if (Memory.towerList[thisRoom.name].indexOf(roomTowers[towerCounter].id) == -1) {
                            Memory.towerList[thisRoom.name].push(roomTowers[towerCounter].id)
                        }
                        towerCounter++;
                    }
                }
            }

            //Get list of Sources
            if (Game.time % 1000 == 0 || !Memory.sourceList[thisRoom.name]) {
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

            //Get list of Links
            if (Game.time % 1000 == 0 || !Memory.linkList[thisRoom.name]) {
                Memory.linkList[thisRoom.name] = [];
                var roomLinks = thisRoom.find(FIND_MY_STRUCTURES, {
                    filter: {
                        structureType: STRUCTURE_LINK
                    }
                });
                var reverseFlag = false;
                if (roomLinks) {
                    var linkCounter = 0;
                    while (roomLinks[linkCounter]) {
                        if (Memory.linkList[thisRoom.name].indexOf(roomLinks[linkCounter].id) == -1) {
                            Memory.linkList[thisRoom.name].push(roomLinks[linkCounter].id)
                        }
                        //If there is no source nearby, this should not be #1
                        var nearSources = roomLinks[linkCounter].pos.findInRange(FIND_SOURCES, 3);
                        if (linkCounter == 0 && nearSources.length == 0) {
                            reverseFlag = true;
                        }
                        linkCounter++;
                    }
                    if (reverseFlag) {
                        Memory.linkList[thisRoom.name].reverse();
                    }
                }
            }

            //Get list of Storage Units
            if (Game.time % 250 == 0 || !Memory.storageList[thisRoom.name]) {
                Memory.storageList[thisRoom.name] = [];
                var storageUnits = thisRoom.find(FIND_MY_STRUCTURES, {
                    filter: {
                        structureType: STRUCTURE_STORAGE
                    }
                });
                if (storageUnits) {
                    if (storageUnits.length > 0) {
                        Memory.storageList[thisRoom.name].push(storageUnits[0].id);
                    }
                }
            }

            //Get list of Minerals
            if (!Memory.mineralList[thisRoom.name]) {
                Memory.mineralList[thisRoom.name] = [];
                var mineralLocations = thisRoom.find(FIND_MINERALS);
                if (mineralLocations) {
                    if (mineralLocations.length > 0) {
                        Memory.mineralList[thisRoom.name].push(mineralLocations[0].id);
                    }
                }
            }

            //Get list of Terminals
            if (Game.time % 800 == 0 || !Memory.terminalList[thisRoom.name]) {
                Memory.terminalList[thisRoom.name] = [];
                var terminalLocations = thisRoom.find(FIND_MY_STRUCTURES, {
                    filter: {
                        structureType: STRUCTURE_TERMINAL
                    }
                });
                if (terminalLocations) {
                    if (terminalLocations.length > 0) {
                        Memory.terminalList[thisRoom.name].push(terminalLocations[0].id);
                    }
                }
            }

            //Get list of extractors
            if (Game.time % 800 == 0 || !Memory.extractorList[thisRoom.name]) {
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

            //Get list of power spawns
            if (Game.time % 2000 == 0 || !Memory.powerSpawnList[thisRoom.name]) {
                Memory.powerSpawnList[thisRoom.name] = [];
                var powerSpawns = thisRoom.find(FIND_MY_STRUCTURES, {
                    filter: {
                        structureType: STRUCTURE_POWER_SPAWN
                    }
                });
                if (powerSpawns) {
                    if (powerSpawns.length > 0) {
                        Memory.powerSpawnList[thisRoom.name].push(powerSpawns[0].id);
                    }
                }
            }

            //Get list of nukers
            if (Game.time % 2000 == 0 || !Memory.nukerList[thisRoom.name]) {
                Memory.nukerList[thisRoom.name] = [];
                var theseNukes = thisRoom.find(FIND_MY_STRUCTURES, {
                    filter: {
                        structureType: STRUCTURE_NUKER
                    }
                });
                if (theseNukes) {
                    if (theseNukes.length > 0) {
                        Memory.nukerList[thisRoom.name].push(theseNukes[0].id);
                    }
                }
            }

            if (Memory.nukerList[thisRoom.name][0] && Memory.terminalList[thisRoom.name][0] && Game.time % 1000 == 0) {
                var thisNuker = Game.getObjectById(Memory.nukerList[thisRoom.name][0]);
                var thisTerminal = Game.getObjectById(Memory.terminalList[thisRoom.name][0]);

                if (thisNuker.ghodium < thisNuker.ghodiumCapacity && (thisTerminal.store[RESOURCE_GHODIUM] + thisNuker.ghodium) < thisNuker.ghodiumCapacity) {
                    //Buy more ghodium
                    var neededGhodium = thisNuker.ghodiumCapacity - (thisTerminal.store[RESOURCE_GHODIUM] + thisNuker.ghodium)
                    var terminalEnergy = thisTerminal.store[RESOURCE_ENERGY];
                    var FilteredOrders = Game.market.getAllOrders(order => order.resourceType == RESOURCE_GHODIUM && order.type == ORDER_SELL && Game.market.calcTransactionCost(neededGhodium, thisRoom.name, order.roomName) <= terminalEnergy);
                    if (FilteredOrders.length > 0) {
                        FilteredOrders.sort(orderPriceCompareBuying);
                        if (FilteredOrders[0].amount < neededGhodium) {
                            neededGhodium = FilteredOrders[0].amount;
                        }
                        Game.market.deal(FilteredOrders[0].id, neededGhodium, thisRoom.name);
                    }
                }
            }

            //Review market data and sell to buy orders
            if (Game.time % 1000 == 0 && Memory.terminalList[thisRoom.name][0]) {
                market_buyers.run(thisRoom, Game.getObjectById(Memory.terminalList[thisRoom.name][0]), Memory.mineralList[thisRoom.name]);
            }

            //Handle Links
            if (Memory.linkList[thisRoom.name][0]) {
                var roomLink = Game.getObjectById(Memory.linkList[thisRoom.name][0]);
                if (roomLink) {
                    if (roomLink.energy >= 50 && roomLink.cooldown == 0) {
                        var receiveLink = Game.getObjectById(Memory.linkList[thisRoom.name][1]);
                        if (receiveLink) {
                            roomLink.transferEnergy(receiveLink);
                        }
                    }
                }
            }

            //Handle Towers
            if (Memory.towerList[thisRoom.name]) {
                if (Memory.towerList[thisRoom.name].length > 0) {
                    Memory.towerList[thisRoom.name].forEach(function(thisTower) {
                        //tower_Operate.run(thisTower.id, RAMPART_HITS_MAX[controllerLevel], thisRoom);
                        if (thisTower) {
                            tower_Operate.run(thisTower, thisRoom);
                        }
                    });
                }
            }

            //Handle Power Spawn
            if (Memory.powerSpawnList[thisRoom.name][0]) {
                var thisPowerSpawn = Game.getObjectById(Memory.powerSpawnList[thisRoom.name][0]);
                if (thisPowerSpawn) {
                    if (thisPowerSpawn.energy >= 50 && thisPowerSpawn.power > 0) {
                        thisPowerSpawn.processPower();
                    }
                }
            }

            //Update advanced script rooms
            if ((Memory.storageList[thisRoom.name].length > 0 && Memory.linkList[thisRoom.name].length == 2) && Memory.RoomsAt5.indexOf(thisRoom.name) == -1) {
                Memory.RoomsAt5.push(thisRoom.name)
            } else if ((Memory.storageList[thisRoom.name].length == 0 && Memory.linkList[thisRoom.name].length < 2) && Memory.RoomsAt5.indexOf(thisRoom.name) != -1) {
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

            //Check through flags to see if far mining has been requested
            if (Game.flags[thisRoom.name + "FarMining"]) {
                if (!Memory.FarClaimerNeeded[Game.flags[thisRoom.name + "FarMining"].pos.roomName]) {
                    Memory.FarClaimerNeeded[Game.flags[thisRoom.name + "FarMining"].pos.roomName] = false;
                }
            }
            if (Game.flags[thisRoom.name + "FarMining2"]) {
                if (!Memory.FarClaimerNeeded[Game.flags[thisRoom.name + "FarMining2"].pos.roomName]) {
                    Memory.FarClaimerNeeded[Game.flags[thisRoom.name + "FarMining2"].pos.roomName] = false;
                }
            }
            if (Game.flags[thisRoom.name + "FarMining3"]) {
                if (!Memory.FarClaimerNeeded[Game.flags[thisRoom.name + "FarMining3"].pos.roomName]) {
                    Memory.FarClaimerNeeded[Game.flags[thisRoom.name + "FarMining3"].pos.roomName] = false;
                }
            }

            //if (Game.flags[thisRoom.name + "FarGuard"]) {
            //Memory.FarGuardNeeded[thisRoom.name] = true;
            //}
        }

        if (Memory.RoomsAt5.indexOf(thisRoom.name) == -1) {
            spawn_BuildCreeps.run(Game.spawns[i], bestWorkerConfig, thisRoom);
        } else {
            spawn_BuildCreeps5.run(Game.spawns[i], thisRoom);
        }

        if (Game.flags[thisRoom.name + "FarMining"]) {
            //Run farMining spawn
            spawn_BuildFarCreeps.run(Game.spawns[i], thisRoom);
        }

        Memory.RoomsRun.push(thisRoom.name);
    }

    Memory.RoomsRun = [];
    //Memory.creepInQue = [];

    if (Game.flags["ClaimThis"]) {
        spawn_BuildInstruction.run(instructionSpawn, 'claim', Game.flags["ClaimThis"].pos.roomName);
    }

    if (Game.flags["BuildThis"]) {
        var sitesOnTile = Game.flags["BuildThis"].pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (sitesOnTile.length) {
            spawn_BuildInstruction.run(instructionSpawn, 'construct', sitesOnTile[0].id, '', Game.flags["BuildThis"].pos.roomName);
        }
    }

    if (Game.market.credits > 1500000 && Game.time % 1000 == 0) {
        //Periodically look for cheap subscription tokens
        var availableCredits = Game.market.credits
        if (availableCredits > 2500000) {
            availableCredits = 2500000;
        }
        var FilteredOrders = Game.market.getAllOrders(order => order.resourceType == SUBSCRIPTION_TOKEN && order.type == ORDER_SELL && order.price <= availableCredits);
        if (FilteredOrders.length > 0) {
            FilteredOrders.sort(orderPriceCompare);

            if (Game.market.deal(FilteredOrders[0].id, 1) == OK) {
                Game.notify('A subscription token was purchased for ' & FilteredOrders[0].price & ' credits');
            }
        }
    }

    //Globally controlls all creeps in all rooms
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.memory.priority == 'farClaimer' || creep.memory.priority == 'farMiner' || creep.memory.priority == 'farMule' || creep.memory.priority == 'farGuard' || creep.memory.priority == 'farClaimerNearDeath' || creep.memory.priority == 'farMinerNearDeath' || creep.memory.priority == 'farMuleNearDeath' || creep.memory.priority == 'farGuardNearDeath') {
            creep_farMining.run(creep);
        } else if (creep.memory.priority == 'claimer') {
            creep_claimer.run(creep);
        } else if (creep.memory.priority == 'vandal') {
            creep_vandal.run(creep);
        } else if (creep.memory.priority == 'constructor') {
            creep_constructor.run(creep);
        } else if (creep.memory.priority == 'removeKebab') {
            creep_Kebab.run(creep);
        } else if (creep.memory.priority == 'defender') {
            creep_combat.run(creep, thisRoom);
        } else {
            if (Memory.RoomsAt5.indexOf(creep.room.name) === -1) {
                creep_work.run(creep);
            } else {
                if (creep.memory.priority == 'harvester' || creep.memory.priority == 'builder') {
                    //In case of emergency
                    creep_work.run(creep);
                } else {
                    creep_work5.run(creep);
                }
            }
        }
    }
    //});

    //Log average CPU usage in memory.
    var thisTickCPU = Game.cpu.getUsed();
    //Average(new) = Average(old) + (value(new) - average(old)) / size(new)
    Memory.totalTicksRecorded = Memory.totalTicksRecorded + 1;
    Memory.averageUsedCPU = Memory.averageUsedCPU + ((thisTickCPU - Memory.averageUsedCPU) / Memory.totalTicksRecorded)

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
    while ((EnergyRemaining / 200) >= 1 || bestWorkerConfig.length >= 50) {
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
    if (!Memory.creepInQue) {
        Memory.creepInQue = [];
        console.log('creepInQue Defaulted');
    }
    if (!Memory.roomsUnderAttack) {
        Memory.roomsUnderAttack = [];
        console.log('roomsUnderAttack Defaulted');
    }
    if (!Memory.roomsPrepSalvager) {
        Memory.roomsPrepSalvager = [];
        console.log('roomsPrepSalvager Defaulted');
    }
    if (!Memory.RoomsAt5) {
        Memory.RoomsAt5 = [];
    }
    //Decimal
    if (!Memory.averageUsedCPU) {
        Memory.averageUsedCPU = 0.0;
    }
    //Integer
    if (!Memory.totalTicksRecorded) {
        Memory.totalTicksRecorded = 0;
    }
    //Object
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
    if (!Memory.towerList) {
        Memory.towerList = new Object();
    }
    if (!Memory.sourceList) {
        Memory.sourceList = new Object();
    }
    if (!Memory.linkList) {
        Memory.linkList = new Object();
    }
    if (!Memory.storageList) {
        Memory.storageList = new Object();
    }
    if (!Memory.mineralList) {
        Memory.mineralList = new Object();
    }
    if (!Memory.terminalList) {
        Memory.terminalList = new Object();
    }
    if (!Memory.extractorList) {
        Memory.extractorList = new Object();
    }
    if (!Memory.powerSpawnList) {
        Memory.powerSpawnList = new Object();
    }
    if (!Memory.nukerList) {
        Memory.nukerList = new Object();
    }
    if (!Memory.energyCap) {
        Memory.energyCap = new Object();
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