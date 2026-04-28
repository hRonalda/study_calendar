# 📚 Study Calendar App

A personal study planner that combines a weekly calendar, lesson notes, and resource links in one page. Built to manage university courses with recurring schedules.

## Features

- **Weekly calendar view** — day, week, and month views powered by FullCalendar
- **Lesson detail panel** — click any event to edit title, status, notes, and resource links
- **Full-screen expand view** — open a lesson in a focused two-column layout with a large notes area and YouTube auto-embed for video links
- **Status tracking** — mark lessons as Planned / In Progress / Done with color-coded events
- **Recurring lesson scheduler** — create an entire semester's worth of lessons in one click (pick the course, days of week, time, and date range)
- **Series management** — reschedule or delete an entire recurring series (e.g. all Monday NLP lessons) with one action
- **Persistent storage** — all data saved to a local MongoDB database

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, FullCalendar 6 |
| Backend | Node.js, Express 5 |
| Database | MongoDB (local), Mongoose |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Community Edition running locally (`brew services start mongodb-community`)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/study-app.git
cd study-app

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Configuration

Create `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/study_app
PORT=5001
```

### Running

Open two terminals:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Usage

| Action | How |
|---|---|
| Add a lesson | Click any time slot on the calendar |
| Edit a lesson | Click the event → detail panel appears on the right |
| Full view | Click the ⤢ button in the panel header |
| Schedule recurring | Click **+ Schedule Recurring** in the top right |
| Reschedule a series | Click a lesson → Series Actions → set new times → Apply |
| Delete a series | Click a lesson → Series Actions → Delete all [day] lessons |
