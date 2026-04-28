import express from "express";
import Course from "../models/Course.js";

const router = express.Router();

// GET all courses
router.get("/", async (req, res) => {
  const courses = await Course.find().sort({ createdAt: 1 });
  res.json(courses);
});

// POST create course
router.post("/", async (req, res) => {
  const { name, color, description } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const course = await Course.create({ name, color, description });
  res.status(201).json(course);
});

// PATCH update course
router.patch("/:id", async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json(course);
});

// DELETE course
router.delete("/:id", async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json({ message: "Course deleted" });
});

export default router;
