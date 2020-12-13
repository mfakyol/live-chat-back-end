import mongoose from "mongoose";

const { Schema } = mongoose;

const requestSchema = new Schema({
  type: {
    type: Number,
    default: 0,
  },
  reciever: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  sentDate: {
    type: Date,
    default: Date.now
  },
  isSeen: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model("Request", requestSchema);
