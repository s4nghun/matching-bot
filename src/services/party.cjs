
const { db } = require('../models/index.cjs');

const { Op } = db.Sequelize;

async function checkJoined({ inviteeId }) {
    try {
        let result = await db['Party_Player'].count({
            where: {
                playerId: inviteeId,
                accepted: 1,
            }
        })
        if (result > 0) {
            return { status: false, msg: "user already joined party" }
        }
        return { status: true, msg: "" }
    } catch (e) {
        throw e
    }
}

async function invitePlayer({ inviterId, inviteeId }) {
    try {
        let result = await checkJoined({inviteeId})
        if (!result.status) {
            return result
        }
        let partyExists = await db['Party_Player'].findOne({
            where:{
                playerId: inviterId,
                accepted: 1
            }
        });
        console.log(partyExists)
        if (!partyExists){
            await db['Party_Player'].bulkCreate([{
                partyId: inviterId,
                playerId: inviterId,
                accepted: 1
            },{
                partyId: inviterId,
            playerId: inviteeId,
            accepted: 0
            }])
            return { status: true, msg: "invited player" }
        }

        await db['Party_Player'].create({
            partyId: partyExists.partyId,
            playerId: inviteeId,
            accepted: 0
        })
        return { status: true, msg: "invited player" }
    } catch (e) {
        throw e
    }
}

async function getInvitationList({playerId}){
    try{
        let result = await db['Party_Player'].findAll({
            where:{
                playerId,
                accepted: 0,
            }
        })

        let parties = await Promise.all(
            result.map(v=>v.partyId)
        )

        return {status: true, data: parties}

    } catch(e) {
        throw e
    }
}

async function joinParty({playerId, partyId}){
    try{
        await db['Party_Player'].update({
            accepted: 1,
        },{
            where:{
                partyId,
                playerId,
                accepted: 0
            }
        })
    } catch(e) {
        throw e
    }
}


async function getPartyMembers({playerId}){
    try{
        let party = await db['Party_Player'].findOne({
            where:{
                playerId,
                accepted: 1
            }
        });
        if (!party){
            return {status: true, data: [playerId]}
        }
        let partyMembers = await db['Party_Player'].findAll({
            where:{
                partyId: party.partyId,
                accepted: 1
            }
        })
        if (partyMembers.length < 1){
            return {status: true, data: [playerId]}
        }
        let members = await partyMembers.map(v=>v.playerId)
        return {status: true, data: [...members]}
        
    } catch(e) {
        throw e
    }
}



module.exports = {
    checkJoined,
    invitePlayer,
    getPartyMembers,
    getInvitationList,
    joinParty
}