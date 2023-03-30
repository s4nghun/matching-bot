const { db } = require('../models/index.cjs');

const { Op } = db.Sequelize;

async function createSession({ data }) {
    try {
        await db["Session"].bulkCreate(data)
    } catch (e) {
        throw e
    }
}

async function updateSession({ status, playerId, sessionId }) {
    try {
        await db["Session"].update({
            status
        }, {
            where: {
                playerId,
                sessionId
            }
        })
    } catch (e) {
        throw e
    }
}

async function destroySession({ sessionId }) {
    try {
        await db['Session'].destroy({
            where: {
                sessionId
            }
        })
    } catch (e) {
        throw e
    }
}

async function findSession({ sessionId }) {
    try {
        let result = await db['Session'].findAll({
            where: {
                sessionId
            }
        })
        return result
    } catch (e) {
        throw e
    }
}

module.exports = {
    findSession,
    createSession,
    updateSession,
    destroySession
}