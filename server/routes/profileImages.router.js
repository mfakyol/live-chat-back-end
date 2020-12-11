import express from "express";
import config from "../config";
var path = require("path");

const route = () => {
  const router = new express.Router();

  router.route("/:imageName").get((req, res) => {
    const {imageName} = req.params;
    res.sendFile(path.join(__dirname, "..", "files/profileImages/"+imageName));
  });

  return router;
};

export default {
  route,
  routerPrefix: `${config.version}/profileimages`,
};
