module.exports = function(sequelize, Sequelize) {
  return sequelize.define('messages', {
    senderId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    receiverId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    message: {
      type: Sequelize.STRING,
      allowNull: false
    },
    // timestamp: {
    //   type: Sequelize.DATE,
    //   allowNull: false,
    //   defaultValue: Sequelize.NOW
    // }
  }, {
  });
}
