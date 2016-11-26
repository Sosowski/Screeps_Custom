//Creeps
var creep_work = require('creep.work');
var creep_combat = require('creep.combat');

//Spawning
var spawn_BuildCreeps = require('spawn.BuildCreeps');
var previousEnergyCap = -1;
var bestWorkerConfig = [WORK, CARRY, MOVE];
//var roomReference = Game.spawns['Spawn_Capital'].room;

//Expansion
var spawn_AutoExpand = require('spawn.AutoExpand');
var lastControllerLevel = 1;

//Towers
var tower_Operate = require('tower.Operate');

//Initalize Memory vars
Memory.roomsUnderAttack = [];

//Ctrl+Alt+f to autoformat documents.

//Constants : http://support.screeps.com/hc/en-us/articles/203084991-API-Reference
//Creep calculator : http://codepen.io/findoff/full/RPmqOd/

module.exports.loop = function() {
    //Loop through all spawns
    for (var i in Game.spawns) {
        var thisRoom = Game.spawns[i].room;
        var controllerLevel = thisRoom.controller.level;

        //Check for hostiles in this room
        var hostiles = thisRoom.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0 && Memory.roomsUnderAttack.indexOf(thisRoom.name) === -1) {
            Memory.roomsUnderAttack.push(thisRoom.name);
        } else if(hostiles.length == 0) {
            var UnderAttackPos = Memory.roomsUnderAttack.indexOf(thisRoom.name);
            if (UnderAttackPos >= 0) {
                Memory.roomsUnderAttack.splice(UnderAttackPos, 1);
            }
        }

        //Update creep configs if energy cap has changed
        if (thisRoom.energyCapacityAvailable != previousEnergyCap) {
            previousEnergyCap = thisRoom.energyCapacityAvailable;
            recalculateBestWorker();
        }

        //Expansion not finished : Low priority. Can do manually for now.

        /*if(lastControllerLevel != roomReference.controller.level){
            spawn_AutoExpand.run(Game.spawns['Spawn_Capital'], roomReference.controller.level);
            lastControllerLevel = roomReference.controller.level;
        }*/

        var harvesters = _.filter(Game.creeps, (creep) => creep.memory.priority == 'harvester');
        spawn_BuildCreeps.run(Game.spawns[i], bestWorkerConfig, thisRoom);

        //Find is moderately expensive, run it only every 100 ticks for new tower detection.
        if (Game.time % 100 == 0) {
            Memory.towerList = thisRoom.find(FIND_MY_STRUCTURES, {
                filter: {
                    structureType: STRUCTURE_TOWER
                }
            });
        }
        if (Memory.towerList) {
            if (Memory.towerList.length > 0) {
                Memory.towerList.forEach(function(thisTower) {
                    //tower_Operate.run(thisTower.id, RAMPART_HITS_MAX[controllerLevel], thisRoom);
                    tower_Operate.run(thisTower.id, 100000, thisRoom);
                });
            }
        }
    }

    //Globally controlls all creeps in all rooms
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.memory.priority == 'melee' || creep.memory.priority == 'ranged') {
            creep_combat.run(creep, thisRoom, Game.spawns[i]);
        } else {
            creep_work.run(creep);
        }
    }
}

function recalculateBestWorker() {
    //Move : 50
    //Work : 100
    //Carry : 50 (50 resource/per)
    //Attack : 80
    //Ranged_Attack : 150
    //Heal : 250
    //Claim : 600 (Don't automate)
    //Tough : 10

    //1 Full balanced worker module : MOVE, CARRY, WORK - 200pts
    var EnergyRemaining = previousEnergyCap;
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