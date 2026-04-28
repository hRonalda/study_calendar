import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "#5bc0de" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
