import express from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/parse", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("[schedule] No file in request");
      return res.status(400).json({ error: "No image provided" });
    }

    console.log("[schedule] File received:", req.file.originalname, req.file.mimetype, req.file.size, "bytes");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const base64    = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            {
              type: "text",
              text: `Extract all courses/classes from this schedule image.
Return a JSON array only — no explanation, no markdown, just the raw JSON array.
Each item must have:
  - "title": course name (string)
  - "day": full day name lowercase (monday/tuesday/wednesday/thursday/friday/saturday/sunday)
  - "startTime": "HH:MM" in 24-hour format
  - "endTime": "HH:MM" in 24-hour format`,
            },
          ],
        },
      ],
    });

    let text = message.content[0].text.trim();
    console.log("[schedule] AI raw response:", text);

    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const courses = JSON.parse(text);
    console.log("[schedule] Parsed", courses.length, "courses");
    res.json(courses);
  } catch (err) {
    console.error("[schedule] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
