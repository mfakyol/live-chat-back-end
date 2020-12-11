import mongoose from "mongoose";
const { Schema } = mongoose;

const messageSchema = new Schema({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: "Chat",
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  type: {
    type: Number,
  },
  content: {
    type: Schema.Types.Mixed,
  },
  sentDate: {
    type: Date,
    default: Date.now,
  },
  seenDate: {
    type: Date,
    default: undefined
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Message", messageSchema);
