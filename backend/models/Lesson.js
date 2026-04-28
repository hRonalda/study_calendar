import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: {
      type: String,
      enum: ["planned", "in_progress", "done"],
      default: "planned",
    },
    note: { type: String, default: "" },
    links: { type: [String], default: [] },
    color: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Lesson", lessonSchema);
