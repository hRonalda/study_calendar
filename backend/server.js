import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import courseRoutes from "./routes/courses.js";
import lessonRoutes from "./routes/lessons.js";
import scheduleRoutes from "./routes/schedule.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/courses", courseRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/schedule", scheduleRoutes);

app.get("/", (req, res) => res.send("API running"));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => console.error("DB connection error:", err));
