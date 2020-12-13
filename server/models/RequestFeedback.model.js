import mongoose from "mongoose";

const { Schema } = mongoose;

const requestFeedbackSchema = new Schema({
  type: {
    type: Number,
    default: 1,
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
  answer: {
    type: Boolean,
    default: false
  },
  isSeen: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model("RequestFeedback", requestFeedbackSchema);