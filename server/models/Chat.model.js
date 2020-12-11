import mongoose from "mongoose";

const { Schema } = mongoose;

const chatSchema = new Schema({
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  lastDate:{
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Chat", chatSchema);
