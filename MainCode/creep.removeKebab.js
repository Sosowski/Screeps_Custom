var creep_Kebab = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if (Game.flags["RemoveKebab"] && Game.flags["RemoveKebab"].pos.roomName != creep.pos.roomName) {
            creep.moveTo(new RoomPosition(25, 25, Game.flags["RemoveKebab"].pos.roomName));
        } else {
            //In target room
            var eSpawns = creep.room.find(FIND_HOSTILE_SPAWNS);
            if (!creep.memory.moveTimer) {
                creep.memory.moveTimer = 0;
            }
            if (eSpawns.length) {
                if (creep.memory.moveTimer >= 50) {
                    creep.moveTo(eSpawns[0], {
                        ignoreDestructibleStructures: true
                    });
                } else {
                    creep.moveTo(eSpawns[0]);
                }
                creep.memory.moveTimer++;

                creep.dismantle(eSpawns[0]);
            }
        }
    }
};

module.exports = creep_Kebab;