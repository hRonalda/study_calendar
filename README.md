# Study Calendar

A personal study planner built for university students. Schedule recurring weekly courses, track lesson progress, manage exams, and keep notes — all in one calendar view.

**Try it live → [study-calendar-hazel.vercel.app](https://study-calendar-hazel.vercel.app)**

---

## What it does

**Recurring course scheduler** — pick a course name, days of the week, time slot, and semester date range. The app generates all lessons at once.

**Smart drag-and-drop** — drag any lesson to reschedule it. If it belongs to a weekly series, choose to move just that one or the entire series (day + time both update correctly).

**Exam tracking** — mark any event as an Exam (shown in red). A live counter shows how many exams are done and how many are still upcoming.

**Lesson notes** — write Markdown notes per lesson, attach resource links, and YouTube links auto-embed in the expanded view.

**Progress stats** — overall completion bar, status counts (Planned / In Progress / Done), this week's lessons, and exam summary.

**Search** — filter all events by title or note content instantly.

---

## How to use

| Action | How |
|---|---|
| Add a single lesson | Click or drag any empty time slot |
| Add recurring courses | Click **+ Schedule Recurring** (top right) |
| Edit a lesson | Click the event → detail panel opens on the right |
| Reschedule | Drag the event to a new slot |
| Move entire series | Drag → choose "All X lessons in this series" |
| Mark as Exam | Click the event → set Type to Exam |
| Delete a series | Click the event → Series Actions |
| Expand full view | Click ⤢ in the panel header |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, FullCalendar 6 |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB Atlas |
| Hosting | Vercel (frontend) + Railway (backend) |

---

## Current limitations

- **No accounts** — all visitors share the same calendar. Not suitable for multiple independent users yet.
- **No undo** — deleting a lesson or series is permanent.
- **No offline support** — requires a live connection to the backend.

---

## Run locally

```bash
git clone https://github.com/hRonalda/study_calendar.git
cd study_calendar

cd backend && npm install
cd ../frontend && npm install
```

Create `backend/.env`:

```
MONGO_URI=your_mongodb_connection_string
PORT=5001
```

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)
