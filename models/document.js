import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  textPath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export default Document; 