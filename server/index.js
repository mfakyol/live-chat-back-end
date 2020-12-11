import express from "express";
import cors from "cors";
import config, { connectDb } from "./config";
import bodyParser from "body-parser";
import AppRoutes from "./routes/index";
import jwt from "jsonwebtoken";
import UserModel from "./models/User.model";
import ChatModel from "./models/Chat.model";
import MessageModel from "./models/Message.model";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const port = process.env.PORT || 3001;
connectDb();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

AppRoutes(app);

// Socket.io

var server = require("http").createServer(app);
var io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
let users = [];
let sockets = [];

io.on("connection", async (socket) => {
  const token = socket.handshake.query.token;
  const { apiKey } = await jwt.verify(
    token,
    config.secret,
    (err, decoded) => decoded
  );
  console.log("user connected");
  const user = await UserModel.findOne({ apiKey })
    .then((user) => {
      users[user._id] = socket.id;
      sockets[socket.id] = user._id;
      return user;
    })
    .catch((err) => socket.disconnect());
  UserModel.updateOne({ apiKey }, { $set: { isOnline: true } }).then();

  socket.to(user._id.toString()).broadcast.emit("isOnline", true);
  socket.emit("connected");

  socket.on("getUserData", (callback) => {
    UserModel.findOne(
      { apiKey },
      { _id: 1, email: 1, fullName: 1, description: 1, profileImage: 1 }
    )
      .then((user) => {
        if (user) {
          callback(null, user);
        } else {
          callback("error", null);
        }
      })
      .catch((err) => callback(err, null));
  });

  socket.on("getUnreads", (chatId, senderId, callback) => {
    MessageModel.find({ chatId, senderId, isSeen: false })
      .countDocuments()
      .then((unRead) => {
        callback(null, unRead);
      })
      .catch((err) => {
        callback(err, null);
      });
  });

  socket.on("getChats", (callback) => {
    UserModel.findOne({ apiKey }, { chats: 1 })
      .populate({
        path: "chats",
        select: "members lastDate",
        populate: {
          path: "members",
          select: "_id fullName description profileImage",
        },
      })
      .then((user) => {
        if (!user) {
          callback("Invalid user", null);
        } else {
          const data = user.chats.map((chat) => {
            chat.members = chat.members.filter(
              (member) => !member._id.equals(user._id)
            );
            return {
              _id: chat.id,
              user: chat.members[0],
              lastDate: chat.lastDate,
            };
          });
          callback(null, data);
        }
      })
      .catch((err) => {
        callback("Server error", null);
      });
  });

  socket.on("sendMessage", ({ chatId, message }, callback) => {
    if (!user.chats.includes(chatId)) {
      res.send({ status: false, message: "Invalid chatId." });
    } else {
      let messageItem = new MessageModel();
      messageItem.chatId = chatId;
      messageItem.senderId = user._id;
      messageItem.type = 0;
      messageItem.content = message.content;
      messageItem
        .save()
        .then((messageData) => {
          ChatModel.findById(chatId).then((chat) => {
            const recipient = chat.members.filter(
              (m) => !m.equals(user._id.toString())
            )[0];
            const s = users[recipient];
            if (s) {
              io.to(s).emit("newMessage", messageData);
            }
            ChatModel.updateOne(
              { _id: chatId },
              { $set: { lastDate: messageData.sentDate } }
            ).then();
          });
          //send message to other user with socket if other user is online
          callback(null, messageData);
        })
        .catch((err) => {
          callback(err, null);
        });
    }
  });

  socket.on("sendImageMessage", (chatId, imageMessage, callback) => {
    const images = [];
    imageMessage.images.forEach((image) => {
      const fileName = `${chatId}--${uuidv4()}.${image.type}`;
      fs.writeFileSync(`server/files/images/${fileName}`, image.image);
      images.push(fileName);
    });
    let messageItem = new MessageModel();
    messageItem.chatId = chatId;
    messageItem.senderId = user._id;
    messageItem.type = 1;
    messageItem.content = {
      title: imageMessage.title,
      images,
    };
    messageItem
      .save()
      .then((messageData) => {
        ChatModel.findById(chatId).then((chat) => {
          const recipient = chat.members.filter(
            (m) => !m.equals(user._id.toString())
          )[0];
          const s = users[recipient];
          if (s) {
            io.to(s).emit("newMessage", message);
          }
          ChatModel.updateOne(
            { _id: chatId },
            { $set: { lastDate: messageData.sentDate } }
          ).then();
        });
        callback(null, messageData);
      })
      .catch((err) => {
        fileNames.forEach((file) => {
          fs.unlink(file, null);
        });
        callback(err, null);
      });
  });

  socket.on("getLastMessages", (chatId, callback) => {
    MessageModel.find({ chatId })
      .sort({ sentDate: -1 })
      .limit(50)
      .then((messages) => {
        callback(null, messages.reverse());
      })
      .catch((err) => callback(err, null));
  });

  socket.on("setLastSeen", (chatId, date, callback) => {
    UserModel.findOne({ apiKey })
      .then((user) => {
        if (!user) {
          callback("Invalid user.", null);
        } else {
          if (user.chats.includes(chatId)) {
            MessageModel.updateMany(
              {
                chatId,
                senderId: { $ne: user._id },
                isSeen: false,
                sentDate: { $lt: date },
              },
              { isSeen: true, seenDate: date }
            )
              .then((data) => {
                ChatModel.findById(chatId).then((chat) => {
                  const recipient = chat.members.filter(
                    (m) => !m.equals(user._id.toString())
                  )[0];
                  const s = users[recipient];
                  if (s) {
                    io.to(s).emit("setSeen", chatId, date);
                  }
                });
                callback(null, true);
              })
              .catch((err) => callback(err, null));
          } else {
            callback("Invalid chatId for this user.", null);
          }
        }
      })
      .catch();
  });

  socket.on("connectUserStatus", async (chatId, callback) => {
    const userId = await ChatModel.findById(chatId).then((chat) => {
      return chat.members.filter((m) => !m.equals(user._id.toString()))[0];
    });
    UserModel.findById(userId, { isOnline: 1 }).then((userData) => {
      socket.join(userId.toString());
      callback(null, userData.isOnline);
    });
  });

  socket.on("disConnectUserStatus", async (chatId, callback) => {
    const userId = await ChatModel.findById(chatId).then((chat) => {
      return chat.members.filter((m) => !m.equals(user._id.toString()))[0];
    });
    UserModel.findById(userId, { isOnline: 1 }).then((userData) => {
      socket.leave(userId);
    });
  });

  socket.on("changeDescription", (description, callback) => {
    console.log("changed");
    UserModel.updateOne({ _id: user._id }, { $set: { description } })
      .then((data) => {
        callback(null, true);
      })
      .catch((err) => {
        callback(err, null);
      });
  });

  socket.on("changeProfileImage", (image, callback) => {
    const fileName = `${user._id}--${uuidv4()}.${image.type}`;
    fs.writeFileSync(`server/files/profileImages/${fileName}`, image.image);
    UserModel.updateOne({ _id: user._id }, { $set: { profileImage: fileName } })
      .then((data) => {
        callback(null, fileName);
      })
      .catch((err) => {
        fs.unlink(`server/files/profileImages/${fileName}`);
        callback(err, null);
      });
  });

  socket.on("disconnect", () => {
    UserModel.updateOne({ apiKey }, { $set: { isOnline: false } });
    delete users[user._id];
    delete sockets[socket.id];
    UserModel.updateOne({ apiKey }, { $set: { isOnline: false } }).then();
    socket.to(user._id.toString()).broadcast.emit("isOnline", false);
    console.log("user disconnected");
  });
});

app.get("/", async (req, res) => {
  res.send(
    "Ok server working..  <br> <a href='/api/v1/example'>Click for test routes..</a>"
  );
});

server.listen(port, () => {
  console.log("Server has benn started at http://localhost:" + port);
});

// app.post("/addFriend",  (req, res) => {
//   let chat = new ChatModel();
//   const {user1, user2} = req.body;
//   chat.members.push(user1)
//   chat.members.push(user2)
//   chat.save()
//   .then( data => UserModel.updateMany({
//     _id:{
//       $in:[user1, user2]
//     }
//   },{ $push: { chats: chat._id } }))
//   .then(data => res.send(data))

// });
