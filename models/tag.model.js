const { Model, DataTypes } = require("sequelize");

const { sequelize } = require("../config/connection");

class Tag extends Model {}

Tag.init(
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        }
    },
    {
    sequelize,
    timestamps: false,
    freezeTableName: true,
    underscored: true,
    modelName: "tag",
  }
);

module.exports = Tag;