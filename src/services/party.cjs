
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
        let result = await checkJoined()
        if (!result.status) {
            return result
        }

        await db['Party_Player'].create({
            partyId: inviterId,
            playerId: inviteeId,
            accepted: 0
        })
        return { status: true, msg: "invited player" }
    } catch (e) {
        throw e
    }
}

module.exports = {
    checkJoined,
    invitePlayer
}