import mongoose from "mongoose";

const dbConnectionString = "mongodb+srv://dbuser_1:rBgQLBLQ0ZvMD1d9@cluster0.hfsxe.mongodb.net/live_chat_db?retryWrites=true&w=majority";

export default {
  version: "/api/v1",
  secret: "jwt-secret",
  hashSecret: "salt-secret"
};

export function connectDb() {
  mongoose.connect(dbConnectionString, {
    useCreateIndex: true,
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => console.log("Connected db"))
  .catch((err) => console.log(err.message))
}
