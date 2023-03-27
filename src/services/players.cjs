

const { db } = require('../models/index.cjs');

const { Op } = db.Sequelize;

async function createPlayer({ playerId, roles }) {
    try {
        let count = await db['Player'].count({
            where: {
                playerId: playerId
            }
        })
        if (count > 0) {
            return { status: false, msg: 'already in queue' }
        }
        let queryList = []
        await Promise.all(
            roles.map(v => {
                queryList = [
                    ...queryList,
                    {
                        playerId,
                        role: v
                    }
                ]
            })
        )
        await db['Player'].bulkCreate(queryList)
        return { status: true, msg: 'enrolled' }
    } catch (e) {
        throw e
    }

}

async function removePlayer() {
    try {

    } catch (e) {
        throw e
    }
}

async function findPlayer({ role, exclude }) {
    try {
        db['Player'].findOne({
            where: {
                playerId: { [Op.not]: exclude },
                role
            }
        })
    } catch (e) {
        throw e
    }
}

module.exports = {
    createPlayer,
    removePlayer,
    findPlayer
}