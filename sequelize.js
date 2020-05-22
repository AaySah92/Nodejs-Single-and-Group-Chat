const Sequelize = require('sequelize');
const UserModel = require('./models/user');
const MessageModel = require('./models/message');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database/database.sqlite'
});

const User = UserModel(sequelize, Sequelize);
const Message = MessageModel(sequelize, Sequelize);
const Op = Sequelize.Op;

User.hasMany(Message, {foreignKey: 'senderId'});
Message.belongsTo(User, {foreignKey: 'senderId'});

sequelize.sync({force: true}).then(() => {
  User.create({
    fullname: 'Group',
    username: 'group_chat',
    password: '$2b$10$sDFpmM6Qg0b4EJv6aQTS8uaJ6RiqXA.fuIf.wG6mT4lC8nUGlMB0.'
  });
});

module.exports = {
  User,
  Message,
  Op,
  sequelize
}
