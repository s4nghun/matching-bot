module.exports = function (sequelize, DataTypes) {
    const player = sequelize.define('Player', {
        playerId: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        role: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(20),
            allowNull: false
        }
    }, {
        timestamps: false,
    });
    return player;
}