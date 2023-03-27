

const { db } = require('../models/index.cjs');

const { Op } = db.Sequelize;

async function createPlayer({ partyIds, party, type }) {
    try {
        let queryList = []
        let count = await db['Player'].findAll({
            where: {
                playerId: {[Op.in]: partyIds}
            }
        })
        let queued = await count.map(v=>v.playerId)
        if (count.length > 0) {
            return { status: false, msg: 'already in queue', data: queued }
        }

        await Promise.all(
            party.map(async member=>{
                await member.roles.map(role=>{
                    queryList = [
                        ...queryList,
                        {
                            playerId: member.id,
                            role,
                            type
                        }
                    ]
                })
            })
        )
        await db['Player'].bulkCreate(queryList)
        return { status: true, msg: 'enrolled' }
    } catch (e) {
        throw e
    }

}

async function removePlayer({group}) {
    try {
        await db['Player'].destroy({
            where:{
                playerId: {[Op.in]: group}
            }
        })
    } catch (e) {
        throw e
    }
}

async function findPlayer({ role, exclude }) {
    try {
        await db['Player'].findOne({
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