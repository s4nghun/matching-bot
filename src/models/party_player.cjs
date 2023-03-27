module.exports = function (sequelize, DataTypes) {
    const party_player = sequelize.define('Party_Player', {
        partyId: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        playerId: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        accepted: {
            type: DataTypes.TINYINT(1),
        },
    });
    return party_player;
}