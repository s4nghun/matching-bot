module.exports = function (sequelize, DataTypes) {
    const party = sequelize.define('Party', {
        partyId: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
    });
    return party;
}