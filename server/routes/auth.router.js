import express from "express";
import config from "../config";
import crypto from "crypto";
import UserModel from "../models/User.model.js";
import emailValidator from "../validators/email.validator";
import ActivationCodeValidator from "../validators/activationCode.validator";
import jwt from "jsonwebtoken";

const route = () => {
  const router = new express.Router();

  // login
  router.route("/").get((req, res) => {
    let { email = "", password = "" } = req.query;

    password = crypto
      .createHmac("sha256", password)
      .update(config.hashSecret)
      .digest("hex");
    UserModel.findOne(
      { email, password },
      { _id: 0, apiKey: 1, status: 1 }
    ).then((user) => {
      if (!user) {
        res.send({ status: false, message: "Invalid email or password." });
      } else {
        if (user.status !== "A") {
          res.send({
            status: false,
            message:
              "This account is not activated. Please activate account to login.",
          });
        }
        jwt.sign({ apiKey: user.apiKey, shortId: user.shortId }, config.secret, function (err, token) {
          if (err) {
            res.send({ status: false, message: "Token sign error occured." });
            return;
          }
          res.send({ status: true, token });
        });
      }
    });
  });

  // signup
  router.route("/").post((req, res) => {
    const { email = "", fullName = "", password = "" } = req.body;
    let user = new UserModel();
    if (!emailValidator(email) || fullName === "" || password === "") {
      res.send({
        status: false,
        message: "E-mail, full name, password all of them are required.",
      });
    } else {
      user.email = email;
      user.fullName = fullName;
      user.password = crypto
        .createHmac("sha256", password)
        .update(config.hashSecret)
        .digest("hex");
      user
        .save()
        .then((user) =>
          res.send({
            status: true,
            message:
              `Registration is successful. We sent an email to ${user.email} activate your account. Please check your mails.` +
              user.activationCode,
          })
        )
        .catch((err) => {
          if (err.code === 11000) {
            res.send({
              status: false,
              message: `${err.keyValue.email} already registered.`,
            });
          } else {
            res.send({ status: false, message: err.message });
          }
        });
    }
  });

  // activateAccount
  router.route("/").put((req, res) => {
    let { email, activationCode } = req.body;

    if (emailValidator(email) && ActivationCodeValidator(activationCode)) {
      UserModel.updateOne(
        { email, activationCode, status: "N" },
        { $set: { activationCode: null, status: "A" } }
      )
        .then((data) => {
          if (data.nModified === 0) {
            res.send({
              status: false,
              message:
                "Invalid email or activation code. Or this account has already been activated.",
            });
          } else {
            res.send({
              status: true,
              message: "Account activated.",
            });
          }
        })
        .catch((err) =>
          res.send({ status: false, message: "An error occurred" })
        );
    } else {
      res.send({ status: false, message: "Invalid email or activtion code." });
    }
  });

  return router;
};

export default {
  route,
  routerPrefix: `${config.version}/auth`,
};
