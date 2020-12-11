import express from "express";
import config from "../config";
import checkToken from "../middlewares/checkToken";
import UserModel from "../models/User.model";
import ChatModel from "../models/Chat.model";

const route = () => {
  const router = new express.Router();

  router.route("/").get(checkToken, (req, res) => {
    const apiKey = req.token.apiKey;
    UserModel.findOne({ apiKey }, { chats: 1 })
      .populate({
        path: "chats",
        select: "members lastDate",
        populate: { path: "members", select: "_id fullName description profileImage" },
      })
      .then((user) => {
        if (!user) {
          res.send({ status: false, message: "Invalid user." });
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
          res.send({ status: true, chats: data });
        }
      })
      .catch((err) => {
        console.log(err)
        res.send({ status: false, message: "Server error" });
      });
  });

  return router;
};

export default {
  route,
  routerPrefix: `${config.version}/chat`,
};
