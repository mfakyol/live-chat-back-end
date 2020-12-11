import mongoose from "mongoose";
import { v4 } from "uuid";
import shortId from "shortid";
import emailValidator from "../validators/email.validator";

const { Schema } = mongoose;

const userSchema = new Schema({
  apiKey: {
    index: true,
    unique: true,
    type: String,
    default: v4,
  },
  shortId: {
    index: true,
    unique: true,
    type: String,
    default: shortId.generate,
  },
  email: {
    index: true,
    unique: true,
    type: String,
    validate: {
      validator: emailValidator,
      message: (props) => `${props.value} is not a valid email!`,
    },
    required: [true, "Email required."],
  },
  fullName: {
    type: String,
  },
  description: {
    type: String
  },
  password: {
    type: String,
  },
  lastOnline: {
    type: Date,
    default: Date.now,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  profileImage: {
    type: String,
    default: "userImage.png",
  },
  chats: [{
    type: Schema.Types.ObjectId,
    ref: 'Chat'
  }],
  friends: {
    type: Array,
    default: [],
  },
  blockeds: {
    type: Array,
    default: [],
  },
  status: {
    type: String,
    default: "N",
  },
  activationCode: {
    type: String,
    default: Math.floor(100000 + Math.random() * 900000).toString(),
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  lastModifiedDate: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("User", userSchema);
