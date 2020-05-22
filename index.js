const express = require('express');
const session = require("express-session");
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const app = express();
const http = require('http').Server(app);
const { User, Message, Op, sequelize } = require('./sequelize');
const io = require('socket.io')(http);
const isLoggedIn = require("./middleware/isLoggedIn");
const isNotLoggedIn = require("./middleware/isNotLoggedIn");

const saltRounds = 10;

app.use(session({ secret: "cats" }));
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/js', express.static(__dirname + '/node_modules/moment'));
app.use('/js', express.static(__dirname + '/node_modules/ejs'));
app.use('/js', express.static(__dirname + '/node_modules/socket.io-client/dist'));
app.use('/css', express.static(__dirname + '/assets/css'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.set('view engine', 'ejs');

const passport = require('./passport')(app);

const groupChatId = 1;
var dict = {};

/* APIs */

app.get('/', isLoggedIn, function(req, res) {
  Promise.all([
    User.findAll({
      attributes: [
        'id', 'fullname'
      ],
      where: {
        [Op.not]: [
            { id: req.user.id }
        ]
      }
    })
  ]).then(function([users]) {
    res.render('index', {users: users, currentUser: req.user, groupChatId: groupChatId});
  })
});

app.get('/login', isNotLoggedIn, function(req, res) {
  res.render('login');
});

app.get('/register', isNotLoggedIn, function(req, res) {
  res.render('register');
});

app.get('/logout', isLoggedIn, function(req, res){
  req.logout();
  res.redirect('/');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.post('/register', function(req, res) {
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    User.create({
      fullname: req.body.fullname,
      username: req.body.username,
      password: hash
    }).then(function(user) {
      if(user) {
        res.redirect('/login');
      }
    });
  });

});

app.get('/getmessages/:rec([0-9]+)', isLoggedIn, function(req, res) {
  var receiverId = parseInt(req.params.rec);
  var currentUserId = req.user.id;
  var condition = {
    attributes: [
      [sequelize.literal("'<strong>' || user.fullname || '</strong>: ' || messages.message"), 'message'],
      ['createdAt', 'timestamp']
    ],
    include: [{
      model: User,
      required: true,
      attributes: []
   }]
  };

  if(receiverId === groupChatId) {
    condition.where = {
      receiverId: receiverId
    };
  }
  else {
    condition.where = {
      [Op.or]: [
        {
          [Op.and]: [
            { senderId: currentUserId },
            { receiverId: receiverId }
          ]
        },
        {
          [Op.and]: [
            { senderId: receiverId },
            { receiverId: currentUserId }
          ]
        }
      ]
    };
  }

  condition.order = [
    ['createdAt']
  ];

  Message.findAll(condition).then(function(messages) {
    res.json(messages);
  })
});

/* Socket Events */

io.sockets.on('connection', function(socket) {
  socket.on('setNameAndId', function(data) {
    socket.fullname = data.fullname;
    dict[parseInt(data.userId)] = socket.id;
  });

  socket.on('chat_message', function(messageBody) {
    var senderId = parseInt(messageBody.senderId);
    var receiverId = parseInt(messageBody.receiverId);
    Message.create({
      senderId: senderId,
      receiverId: parseInt(messageBody.receiverId),
      message: messageBody.message
    });

    var msg = '<strong>' + socket.fullname + '</strong>: ' + messageBody.message;

    if(receiverId === groupChatId) {
      io.emit('chat_message', {
        message: msg,
        senderId: senderId,
        receiverId: receiverId
      });
    }
    else {
      if(dict[receiverId] !== undefined) {
        io.to(dict[receiverId]).emit('chat_message', {
          message: msg,
          senderId: senderId,
          receiverId: receiverId
        });
      }

      io.to(dict[senderId]).emit('chat_message', {
        message: msg,
        senderId: senderId,
        receiverId: receiverId
      });
    }
  });

  socket.on('disconnect', function () {
    Object.keys(dict).forEach(function(key) {
      if(dict[key] === socket.id) {
        delete dict[key];
        console.log(key + ' disconnected');
      }
    });
  });
});

/* Start Server */

const server = http.listen(9999, function() {
  console.log('listening on *:9999');
});
