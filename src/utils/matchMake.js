import { db } from "../models/index.cjs"
import matchTypes from "../data/typeRoles.json" assert { type: "json" };
async function MMLogic(groupSize, groupType) {
    
    // 대기열에 등록된 모든 플레이어를 조회 하여 리스트에 등록합니다.
    let queuedPlayers = await db['Player'].findAll({
        where: {
            type: `${groupSize}:${groupType}`
        }
    })

    //큐 등록 인원이 적을 경우, 보류 합니다.
    if (queuedPlayers.length < groupSize) return {status: false, msg: "in queue", data: []};

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

    // 모든 파티 리스트를 가져와 등록합니다.

    let partyMembers = await db['Party_Player'].findAll({
        where: {
            accepted: 1,
        }
    })

    let groupPlayer = {}
    await Promise.all(
        partyMembers.map(async v => {
            if (groupPlayer[v.partyId] != undefined) {
                groupPlayer[v.partyId]["members"] = [
                    ...groupPlayer[v.partyId]["members"],
                    v.playerId
                ]
            } else {
                groupPlayer[v.partyId] = {
                    members: [v.playerId]
                }
            }
        })
    )
    let groups =[];

    // 2d 배열에 저장
    Object.keys(groupPlayer).map(v => {
        groups = [
            ...groups,
            [...groupPlayer[v].members]
        ]
    })

    let team={players:[]};
    const shuffledPlayers = players.sort(() => 0.5 - Math.random());
    const availableRoles = matchTypes[`${groupSize}:${groupType}`];


    while (shuffledPlayers.length > 0) {
        // 무작위로 섞인 리스트에서 플레이어를 가져옵니다.
        const player = shuffledPlayers.pop();

        // 플레이어가 파티가 있는지 확인합니다.
        let groupIndex = -1;
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].includes(player.name)) {
                groupIndex = i;
                break;
            }
        }

        // 선호 포지션을 확인하여 공석이 있는지 확인합니다.
        let roleFound = false;
        for (let i = 0; i < player.roles.length; i++) {
            if (availableRoles.includes(player.roles[i])) {
                // 플레이어에게 포지션을 부여합니다.
                team.players.push({
                    id: player.id,
                    role: player.roles[i]
                });
                availableRoles.splice(availableRoles.indexOf(player.roles[i]), 1);
                roleFound = true;
                break;
            }
        }

        // If no available role matches the player's preferred roles, assign the player to the first available role
        if (!roleFound) {
            team.players.push({
                id: player.id,
                role: availableRoles.pop()
            });
        }

        // 플레이어가 속한 파티가 있다면, 모두 파티 초대를 합니다.
        if (groupIndex >= 0) {
            const group = groups[groupIndex];
            for (let i = 0; i < group.length; i++) {
                if (group[i] !== player.id) {
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
                            id: group[i],
                            role: availableRoles.pop()
                        });
                    }
                }
            }
        }
    }

    //그룹 사이즈가 맞으면 매칭 성공, 아니면 실패
    if (team.players.length == groupSize){
        return {status: true, msg: "matched", data: team.players}
    } else {
        return {status: false, msg: "in queue", data: []}
    }
}

export {
    MMLogic
}