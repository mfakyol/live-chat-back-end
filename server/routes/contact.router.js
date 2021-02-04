import express from "express";
import config from "../config";
import crypto from "crypto";
import UserModel from "../models/User.model.js";
import emailValidator from "../validators/email.validator";
import ActivationCodeValidator from "../validators/activationCode.validator";
import jwt from "jsonwebtoken";
import sendRegisterMail from "../../mail-service/mails/sendRegisterMail";

const route = () => {
  const router = new express.Router();

  // login
  router.route("/").post((req, res) => {
    
  });

  return router;
};

export default {
  route,
  routerPrefix: `${config.version}/contact`,
};
