import { db } from "../models/index.cjs"
async function fiveGates(group) {
    let reqPos = [
        "Tank",
        "Heal",
        "RDPS",
        "RDPS",
        "MDPS",
    ]
    let parties = [];
    let queuedPlayers = await db['Player'].findAll({
        where: {
            type: "5:hg"
        }
    })
    if (queuedPlayers.length < 5) return;
    let allPlayers = {};
    await Promise.all(
        queuedPlayers.map(async v => {
            if (allPlayers[v.playerId] != undefined) {
                allPlayers[v.playerId]["roles"] = [
                    ...allPlayers[v.playerId]["roles"],
                    v.role
                ]
            } else {
                allPlayers[v.playerId] = {
                    roles: [v.role]
                }
            }
        })
    )
    let players = [];
    Object.keys(allPlayers).map(v => {
        players = [
            ...players,
            {
                id: v,
                roles: allPlayers[v].roles
            }
        ]
    })

    //players

    const groups = [[], [], []];
    const shuffledPlayers = players.sort(() => 0.5 - Math.random());
    const availableRoles = ['top', 'jungle', 'mid', 'adc', 'support'];

    while (shuffledPlayers.length > 0) {
        // Get the next player from the shuffled list
        const player = shuffledPlayers.pop();

        // Check if the player is in a group
        let groupIndex = -1;
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].includes(player.name)) {
                groupIndex = i;
                break;
            }
        }

        // Find the first role that is available and matches one of the player's preferred roles
        let roleFound = false;
        for (let i = 0; i < player.preferredRoles.length; i++) {
            if (availableRoles.includes(player.preferredRoles[i])) {
                // Assign the player to the role
                team.players.push({
                    name: player.name,
                    role: player.preferredRoles[i]
                });
                availableRoles.splice(availableRoles.indexOf(player.preferredRoles[i]), 1);
                roleFound = true;
                break;
            }
        }

        // If no available role matches the player's preferred roles, assign the player to the first available role
        if (!roleFound) {
            team.players.push({
                name: player.name,
                role: availableRoles.pop()
            });
        }

        // If the player is in a group, assign all other players in the group to the same team
        if (groupIndex >= 0) {
            const group = groups[groupIndex];
            for (let i = 0; i < group.length; i++) {
                if (group[i] !== player.name) {
                    let roleAssigned = false;
                    for (let j = 0; j < availableRoles.length; j++) {
                        const role = availableRoles[j];
                        if (!team.players.some(p => p.role === role)) {
                            team.players.push({
                                name: group[i],
                                role: role
                            });
                            availableRoles.splice(j, 1);
                            roleAssigned = true;
                            break;
                        }
                    }
                    if (!roleAssigned) {
                        team.players.push({
                            name: group[i],
                            role: availableRoles.pop()
                        });
                    }
                }
            }
        }
    }

    // Print the results
    console.log('Team:');
    for (let i = 0; i < team.players.length; i++) {
        console.log(`${team.players[i].name} - ${team.players[i].role}`);
    }





    for await (const player of queuedPlayers) {
        if (skippers.includes(player.playerId)) {
            continue;
        }
        let partyMembers = await db['Party_Player'].findAll({
            where: {
                playerId: player.playerId,
                accepted: 1,
            }
        })
    }
}

async function twoGates() {
    let reqPos = [
        "Tank",
        "Heal",
        "RDPS",
        "RDPS",
        "MDPS",
    ]
    let parties = [];
    let ress = await db['Player'].findAndCountAll({
        attributes: [
            "role",
            [db.sequelize.fn('COUNT', db.sequelize.col('role') === 'Tank'), 'Tank'],
            [db.sequelize.fn('COUNT', db.sequelize.col('role') === 'Heal'), 'Heal'],
            [db.sequelize.fn('COUNT', db.sequelize.col('role') === 'RDPS'), 'RDPS'],
            [db.sequelize.fn('COUNT', db.sequelize.col('role') === 'MDPS'), 'MDPS'],
        ],
        group: "role",
        where: {
            type: "2:hg"
        }
    })
}

export {
    fiveGates
}