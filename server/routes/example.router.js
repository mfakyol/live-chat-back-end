import express from "express";
import config from "../config";

const route = () => {
  const router = new express.Router();

  router.route("/").get((req, res) => {
    res.send("OK");
  });

  return router;
};

export default {
  route,
  routerPrefix: `${config.version}/example`,
};
