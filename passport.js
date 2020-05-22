const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const bcrypt = require("bcrypt");
const User = require('./sequelize').User;

passport.use(new localStrategy(function(username, password, done) {
  User.findOne({
    where: {
      username: username
    }
  }).then(function(user) {
    if(user === null) {
      return done(null, false);
    }
    else {
      bcrypt.compare(password, user.dataValues.password, function(err, result) {
        if(result === false) {
          return done(null, false);
        }
        return done(null, user.dataValues);
      });
    }
  });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findOne({where: {id: id}}).then(function(user) {
    done(null, user.dataValues);
  });
});

module.exports = function (app) {
  app.use(passport.initialize());
  app.use(passport.session());
  return passport;
}
