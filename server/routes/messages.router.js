import express from "express";
import config from "../config";
import checkToken from "../middlewares/checkToken";
import MessageModel from "../models/Message.model";
import UserModel from "../models/User.model";
import multer from "multer";
const fs = require("fs");
import path from "path";
var upload = multer({ dest: "server/uploads/" });

const route = () => {
  const router = new express.Router();

  router.route("/getimage/:fileName").get(checkToken, (req, res) => {
    const { apiKey } = req.token;
    const { fileName } = req.params;
    const chatId = fileName.split("--")[0];
    UserModel.findOne({ apiKey }, { chats: 1 })
      .then((user) => {
        if (user.chats.includes(chatId)) {
          res.sendFile(path.join(__dirname, "../files/images", fileName));
        } else {
          res.send(null);
        }
      })
      .catch();
  });

  return router;
};

export default {
  route,
  routerPrefix: `${config.version}/messages`,
};
