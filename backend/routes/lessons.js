import express from "express";
import Lesson from "../models/Lesson.js";

const router = express.Router();

// GET all lessons (optionally filter by course)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.course) filter.course = req.query.course;
  const lessons = await Lesson.find(filter).populate("course", "name color");
  res.json(lessons);
});

// POST create lesson
router.post("/", async (req, res) => {
  const { title, course, start, end, status, note, links } = req.body;
  if (!title || !start || !end)
    return res.status(400).json({ error: "title, start, and end are required" });
  const lesson = await Lesson.create({ title, course, start, end, status, note, links });
  const populated = await lesson.populate("course", "name color");
  res.status(201).json(populated);
});

// DELETE lessons by seriesId OR title + optional dayOfWeek
router.delete("/series", async (req, res) => {
  const { title, dayOfWeek, seriesId, tzOffset = 0 } = req.body;
  let targets;
  if (seriesId) {
    targets = await Lesson.find({ seriesId });
  } else {
    if (!title) return res.status(400).json({ error: "title or seriesId required" });
    const all = await Lesson.find({ title });
    targets = dayOfWeek !== undefined
      ? all.filter((l) => {
          const localMs = new Date(l.start).getTime() - Number(tzOffset) * 60000;
          return new Date(localMs).getUTCDay() === Number(dayOfWeek);
        })
      : all;
  }
  await Lesson.deleteMany({ _id: { $in: targets.map((l) => l._id) } });
  res.json({ deleted: targets.length });
});

// PATCH reschedule by seriesId OR title + dayOfWeek
router.patch("/series/reschedule", async (req, res) => {
  const { title, dayOfWeek, startTime, endTime, seriesId, tzOffset = 0 } = req.body;
  if (!startTime || !endTime) return res.status(400).json({ error: "startTime, endTime required" });
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let targets;
  if (seriesId) {
    targets = await Lesson.find({ seriesId });
  } else {
    if (!title) return res.status(400).json({ error: "title or seriesId required" });
    const all = await Lesson.find({ title });
    targets = all.filter((l) => {
      const localMs = new Date(l.start).getTime() - Number(tzOffset) * 60000;
      return new Date(localMs).getUTCDay() === Number(dayOfWeek);
    });
  }
  for (const lesson of targets) {
    const s = new Date(lesson.start); s.setHours(sh, sm, 0, 0);
    const e = new Date(lesson.start); e.setHours(eh, em, 0, 0);
    lesson.start = s; lesson.end = e;
    await lesson.save();
  }
  const updated = await Lesson.find({ _id: { $in: targets.map((l) => l._id) } });
  res.json({ updated: updated.length, lessons: updated });
});

// POST bulk create lessons
router.post("/bulk", async (req, res) => {
  const { lessons } = req.body;
  if (!Array.isArray(lessons) || lessons.length === 0)
    return res.status(400).json({ error: "lessons array required" });
  const created = await Lesson.insertMany(lessons);
  res.status(201).json(created);
});

// PATCH update lesson
router.patch("/:id", async (req, res) => {
  const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: "after",
    runValidators: true,
  }).populate("course", "name color");
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  res.json(lesson);
});

// DELETE lesson
router.delete("/:id", async (req, res) => {
  const lesson = await Lesson.findByIdAndDelete(req.params.id);
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  res.json({ message: "Lesson deleted" });
});

export default router;
