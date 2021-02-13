const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: `${__dirname}/database.sqlite3`
});

const Docker = sequelize.define('Docker', {
    name: {
        type: DataTypes.STRING,
        unique: true,
    },
    port: {
        type: DataTypes.NUMBER,
        allowNull: true
    },
    isOperating: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
    }
});

sequelize.sync();

module.exports = { Docker };