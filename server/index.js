import fs from "fs";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import express from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import AppRoutes from "./routes/index";
import UserModel from "./models/User.model";
import ChatModel from "./models/Chat.model";
import config, { connectDb } from "./config";
import MessageModel from "./models/Message.model";
import RequestModel from "./models/Request.model";
import RequestFeedbackModel from "./models/RequestFeedback.model";

const port = process.env.PORT || 3001;
connectDb();

const app = express();

app.use(cors());
app.use(bodyParser.json());
//app.use(helmet());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(__dirname + "/public"));
app.use(express.static(path.join(__dirname, "private")));

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

  const decodedToken = await jwt.verify(
    token,
    config.secret,
    (err, decoded) => decoded
  );
  let apiKey;
  if (decodedToken) {
    apiKey = decodedToken.apiKey;
  }
  if (!apiKey) {
    socket.disconnect();
    return;
  }

  console.log("user connected");
  const user = await UserModel.findOne({ apiKey })
    .then((user) => {
      if (users[user.id]) {
        io.to(users[user._id]).emit("forceQuit");
        io.sockets.sockets.get(users[user._id]).disconnect();
      }

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
      {
        _id: 1,
        email: 1,
        fullName: 1,
        description: 1,
        profileImage: 1,
        shortId: 1,
      }
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

  socket.on("sendMessage", async ({ chatId, message }, callback) => {
    const userData = await UserModel.findOne({ _id: user._id }).then();
    if (!userData.chats.includes(chatId)) {
      callback("Invalid chatId.", null);
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
            io.to(s).emit("newMessage", messageData);
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
    MessageModel.find({ chatId, isDeleted: false })
      .sort({ sentDate: -1 })
      .limit(20)
      .then((messages) => {
        setTimeout(() => {
          callback(null, messages.reverse());
        }, 1000);
      })
      .catch((err) => callback(err, null));
  });

  socket.on("getOldMessages", (chatId, date, callback) => {
    MessageModel.find({
      chatId,
      isDeleted: false,
      sentDate: { $lt: new Date(date) },
    })
      .sort({ sentDate: -1 })
      .limit(20)
      .then((messages) => {
        callback(null, messages.reverse());
      });
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

  socket.on("searchUser", (shortId, callback) => {
    UserModel.findOne(
      { shortId },
      { _id: 1, fullName: 1, profileImage: 1 }
    ).then((data) => {
      if (data) {
        if (data._id.equals(user._id)) {
          callback("You cannot chat yourself.", null);
        } else {
          UserModel.findOne({ apiKey }, { chats: 1 })
            .populate({
              path: "chats",
              select: "members lastDate",
              populate: {
                path: "members",
                select: "_id fullName description profileImage",
              },
            })
            .then((userData) => {
              if (!userData) {
                callback("Invalid user", null);
              } else {
                const users = userData.chats.map((chat) => {
                  chat.members = chat.members.filter(
                    (member) => !member._id.equals(userData._id)
                  );
                  return chat.members[0]._id;
                });
                if (users.includes(data._id)) {
                  callback("You are already friend with this user.", null);
                } else {
                  RequestModel.findOne({
                    type: 0,
                    sender: user._id,
                    reciever: data._id,
                  }).then((request) => {
                    if (request) {
                      callback("You already sent request this user.", null);
                    } else {
                      callback(null, data);
                    }
                  });
                }
              }
            });
        }
      } else {
        callback(null, null);
      }
    });
  });

  socket.on("sendRequest", (recieverId, callback) => {
    UserModel.findOne({ apiKey }, { chats: 1 })
      .populate({
        path: "chats",
        select: "members lastDate",
        populate: {
          path: "members",
          select: "_id fullName description profileImage",
        },
      })
      .then(async (userData) => {
        const chatUsers = userData.chats.map((chat) => {
          chat.members = chat.members.filter(
            (member) => !member._id.equals(userData._id)
          );
          return chat.members[0]._id;
        });
        let request = await RequestModel.findOne({
          type: 0,
          sender: user._id,
          reciever: recieverId,
        }).then((request) => request);
        if (chatUsers.includes(recieverId)) {
          callback("You already friend with this user.", null);
        } else if (request) {
          callback("Youe already sent request this user.", null);
        } else {
          let request = new RequestModel();
          request.type = 0;
          request.sender = user._id;
          request.reciever = recieverId;
          request.save().then((requestData) => {
            if (users[recieverId.toString()]) {
              //will push notification
              const s = users[requestData.reciever];
              if (s) {
                RequestModel.findOne({ _id: requestData._id })
                  .populate({
                    path: "sender",
                    select: "profileImage fullName",
                  })
                  .then((result) => {
                    io.to(s).emit("newNotification", result);
                  });
              }
            }
            callback(null, true);
          });
        }
      });
  });

  socket.on("getNotifications", (callback) => {
    RequestModel.find({ reciever: user._id })
      .populate({
        path: "sender",
        select: "profileImage fullName",
      })
      .then((requests) => {
        RequestFeedbackModel.find({ sender: user._id })
          .populate({
            path: "reciever",
            select: "profileImage fullName",
          })
          .then((requestFeedback) => {
            callback(null, [...requests, ...requestFeedback]);
          });
      });
  });

  socket.on("setNotificationLastSeen", (date) => {
    RequestFeedbackModel.updateMany(
      { sender: user._id, isSeen: false, sentDate: { $lt: new Date(date) } },
      { $set: { isSeen: true } }
    ).then();
  });

  socket.on("answerRequest", (requestId, answer, callback) => {
    RequestModel.findOne({ _id: requestId }).then((request) => {
      if (!request) {
        callback("Request Not Found", null);
      } else if (request.reciever.equals(user._id)) {
        let requestFeedback = new RequestFeedbackModel();
        requestFeedback.reciever = request.reciever;
        requestFeedback.sender = request.sender;
        requestFeedback.answer = answer;
        requestFeedback.type = 1;

        if (answer) {
          requestFeedback.save().then((rf) => {
            let chat = new ChatModel();
            chat.members.push(rf.sender);
            chat.members.push(rf.reciever);
            chat.save().then((chatData) => {
              UserModel.updateMany(
                {
                  _id: {
                    $in: [rf.reciever, rf.sender],
                  },
                },
                { $push: { chats: chatData._id } }
              ).then((data) => {
                ChatModel.findOne({ _id: chatData._id })
                  .populate({
                    path: "members",
                    select: "_id fullName description profileImage",
                  })
                  .then((resultChat) => {
                    resultChat.members = resultChat.members.filter(
                      (member) => !member._id.equals(user._id)
                    );
                    resultChat.user = resultChat.members[0];
                    delete resultChat.members;
                    callback(null, {
                      _id: resultChat._id,
                      user: resultChat.members[0],
                      lastDate: resultChat.lastDate,
                    });
                  });
              });
              const s = users[rf.sender];
              if (s) {
                ChatModel.findOne({ _id: chatData._id })
                  .populate({
                    path: "members",
                    select: "_id fullName description profileImage",
                  })
                  .then((resultChat) => {
                    resultChat.members = resultChat.members.filter((member) =>
                      member._id.equals(user._id)
                    );
                    io.to(s).emit("newChat", {
                      _id: resultChat._id,
                      user: resultChat.members[0],
                      lastDate: resultChat.lastDate,
                    });
                    RequestFeedbackModel.findOne({ _id: rf._id })
                      .populate({
                        path: "reciever",
                        select: "profileImage fullName",
                      })
                      .then((result) => {
                        io.to(s).emit("newNotification", result);
                        RequestModel.deleteOne({ _id: requestId }).then();
                      });
                  });
              }
            });
          });
        } else {
          requestFeedback.save().then((rf) => {
            RequestModel.deleteOne({ _id: requestId }).then();
            const s = users[rf.sender];
            if (s) {
              io.to(s).emit("newNotification", rf);
            }
            callback(null, null);
          });
        }
      } else {
        callback("Invalid user.", null);
      }
    });
  });

  socket.on("deleteMessage", (id, callback) => {
    MessageModel.findOneAndUpdate({ _id: id }, { isDeleted: true })
      .then((data) => {
        if (data) return callback(null, true);
        callback(null, false);
      })
      .catch((e) => callback(null, false));
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

server.listen(port, () => {
  console.log("Server has benn started at http://localhost:" + port);
});
