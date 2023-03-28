module.exports = function (sequelize, DataTypes) {
    const session = sequelize.define('Session', {
        sessionId: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        playerId: {
            type: DataTypes.INTEGER(10),
            allowNull: false
        },
        role: {
            type: DataTypes.STRING(20),
        },
        type: {
            type: DataTypes.STRING(200),
            allowNull: false
        },

    });
    return session;
}