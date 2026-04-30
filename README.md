# Study Calendar App — v2

A study planner combining a weekly calendar, lesson notes, and resource links in one page. Built to manage university courses with recurring schedules.

## Live Demo

The app is publicly accessible — no install needed:

> **https://study-calendar-hazel.vercel.app**

Anyone with the link can open it directly in a browser. Note that all visitors currently share the same calendar (see Known Limitations below).

## Features

- **Weekly / month / day calendar** — powered by FullCalendar 6
- **Lesson detail panel** — click any event to edit title, status, notes, and resource links
- **Full-screen expand view** — open any lesson in a full-screen view to write detailed notes (Markdown supported) and attach resource links
- **Status tracking** — Planned / In Progress / Done with color-coded events and a progress bar
- **Search** — filter lessons by title or note content
- **Recurring lesson scheduler** — create a full semester's worth of lessons in one click (course name, days of week, time slot, date range)
- **Smart drag-and-drop** — drag a lesson to reschedule; if it belongs to a series, choose to move just that one or the entire series (day + time both update correctly)
- **Series delete** — remove all lessons on a given day, or all lessons across all days for a course
- **Persistent storage** — MongoDB Atlas (cloud), Express REST API on Railway

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, FullCalendar 6 |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB Atlas |
| Hosting | Vercel (frontend) + Railway (backend) |

## Usage

| Action | How |
|---|---|
| Add a lesson | Click or drag any time slot on the calendar |
| Edit a lesson | Click the event → detail panel on the right |
| Full view | Click ⤢ in the panel header |
| Schedule recurring | Click **+ Schedule Recurring** (top right) |
| Move a lesson | Drag it — if part of a series, choose "only this" or "all in series" |
| Delete a series | Click a lesson → Series Actions |

## Known Limitations / Drawbacks

These are known issues to fix before this app is ready for wider sharing:

1. **No authentication** — there is no login system. Everyone who visits the URL shares the same calendar and can create, edit, or delete any lesson. Not suitable for multiple independent users.

2. **Single shared database** — all data is in one MongoDB collection with no user separation. If shared with others, all users see and modify the same lessons.

3. **Post-push hook clears the DB** — a `.git/hooks/post-push` script automatically deletes all lessons after every `git push`. This is a development convenience tool and must be removed or disabled before sharing the app with real users, or all data will be wiped on every code update.

4. **No offline support** — the app requires a live internet connection to Railway (backend) and MongoDB Atlas. There is no caching or offline fallback.

5. **No undo** — deleting a lesson or series is permanent with no undo. A confirmation dialog is shown but there is no recovery after confirming.

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB (local) or a MongoDB Atlas connection string

### Installation

```bash
git clone https://github.com/hRonalda/study_calendar.git
cd study_calendar

cd backend && npm install
cd ../frontend && npm install
```

### Configuration

Create `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/study_app
PORT=5001
```

### Running locally

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).
