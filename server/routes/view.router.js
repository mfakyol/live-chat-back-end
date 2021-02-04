import express from "express";
import config from "../config";
import path from "path";

const route = () => {
  const router = new express.Router();

  router.route("/").get(async (req, res) => {
    res.sendFile("./public/home/home.html", { root: __dirname + "/.." });
  });

  router.route("/sign-up").get(async (req, res) => {
    res.sendFile("./public/signup/signup.html", { root: __dirname + "/.." });
  });

  router.route("/about").get((req, res) => {
    res.sendFile("./public/about/about.html", { root: __dirname + "/.." });
  });

  router.route("/contact").get((req, res) => {
    res.sendFile("./public/contact/contact.html", { root: __dirname + "/.." });
  });

  router.route("/chat/").get((req, res) => {
    res.sendFile("./private/private.html", { root: __dirname + "/.." });
  });
  router.route("/chat/:id").get((req, res) => {
    res.redirect("/chat");
  });

  return router;
};

export default {
  route,
  routerPrefix: ``,
};
