import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './pdf_metadata.db',
  logging: false,
});

export default sequelize; 