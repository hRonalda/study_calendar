import { useState } from "react";

const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

const DAYS = [
  { short: "Mon", full: "monday" },
  { short: "Tue", full: "tuesday" },
  { short: "Wed", full: "wednesday" },
  { short: "Thu", full: "thursday" },
  { short: "Fri", full: "friday" },
  { short: "Sat", full: "saturday" },
  { short: "Sun", full: "sunday" },
];

const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function generateDates(semStart, semEnd, dayFull) {
  const dates = [];
  const cur = new Date(semStart + "T00:00:00");
  const end = new Date(semEnd + "T00:00:00");
  const targetDay = DAY_INDEX[dayFull];
  while (cur <= end) {
    if (cur.getDay() === targetDay) dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function buildLessons(courses, semStart, semEnd) {
  const lessons = [];
  for (const c of courses) {
    const seriesId = crypto.randomUUID();
    const dates = generateDates(semStart, semEnd, c.day);
    const [sh, sm] = c.startTime.split(":").map(Number);
    const [eh, em] = c.endTime.split(":").map(Number);
    for (const d of dates) {
      const start = new Date(d); start.setHours(sh, sm, 0, 0);
      const end   = new Date(d); end.setHours(eh, em, 0, 0);
      lessons.push({ title: c.title, start: start.toISOString(), end: end.toISOString(), status: "planned", seriesId });
    }
  }
  return lessons;
}

// ── shared styles ────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 950, padding: "24px",
  },
  card: {
    background: "#161c2c", border: "1px solid #2a3354", borderRadius: "12px",
    padding: "28px", width: "100%", maxWidth: "560px", maxHeight: "90vh",
    overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
  },
  input: {
    width: "100%", background: "#1e2640", border: "1px solid #2a3354",
    borderRadius: "6px", color: "#dde3f0", padding: "8px 10px",
    fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  },
  label: {
    display: "block", fontSize: "11px", fontWeight: "600",
    textTransform: "uppercase", letterSpacing: "0.07em",
    color: "#7c86a0", marginBottom: "5px",
  },
  btn: (primary) => ({
    flex: 1, padding: "9px", borderRadius: "6px", cursor: "pointer",
    fontSize: "13px", fontWeight: "600", border: primary ? "none" : "1px solid #2a3354",
    background: primary ? "#818cf8" : "transparent",
    color: primary ? "#fff" : "#7c86a0",
  }),
};

export default function RecurringModal({ open, onClose, onCreated, existingEvents = [] }) {
  const [step, setStep]           = useState(1); // 1=config, 2=daterange
  const [title, setTitle]         = useState("");
  const [selDays, setSelDays]     = useState([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime]     = useState("11:00");

  // shared date range
  const [semStart, setSemStart]   = useState("");
  const [semEnd, setSemEnd]       = useState("");
  const [creating, setCreating]   = useState(false);
  const [conflictDays, setConflictDays] = useState([]);

  if (!open) return null;

  // ── helpers ────────────────────────────────────────────────
  const toggleDay = (full) =>
    setSelDays((p) => p.includes(full) ? p.filter((d) => d !== full) : [...p, full]);

  const coursesForCreate = selDays.map((d) => ({ title, day: d, startTime, endTime }));

  const previewCount =
    semStart && semEnd
      ? coursesForCreate.reduce((sum, c) => sum + generateDates(semStart, semEnd, c.day).length, 0)
      : 0;

  const canProceedStep1 = title.trim() && selDays.length > 0;
  const canCreate = semStart && semEnd && previewCount > 0;

  const handleCreate = async (force = false) => {
    if (!canCreate) return;
    if (!force) {
      const conflicts = selDays.filter((day) => {
        const targetDow = DAY_INDEX[day];
        return existingEvents.some(
          (l) => l.title === title.trim() && new Date(l.start).getDay() === targetDow
        );
      });
      if (conflicts.length > 0) {
        setConflictDays(conflicts);
        return;
      }
    }
    setConflictDays([]);
    setCreating(true);
    try {
      const lessons = buildLessons(coursesForCreate, semStart, semEnd);
      const res = await fetch(`${base}/lessons/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessons }),
      });
      const created = await res.json();
      onCreated(created);
      handleClose();
    } catch (err) {
      console.error("Bulk create failed:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setTitle(""); setSelDays([]); setStartTime("09:00"); setEndTime("11:00");
    setSemStart(""); setSemEnd(""); setConflictDays([]);
    onClose();
  };

  // ── render ─────────────────────────────────────────────────
  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={S.card}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#dde3f0" }}>
              Schedule Recurring Lessons
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#7c86a0" }}>
              {step === 1 ? "Step 1 — Configure courses" : "Step 2 — Set semester date range"}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: "#7c86a0", cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>

        {/* ── Step 1 — Manual entry ── */}
        {step === 1 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={S.label}>Course / Lesson Title</label>
                <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quantum Computing" />
              </div>
              <div>
                <label style={S.label}>Repeats on</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {DAYS.map(({ short, full }) => {
                    const on = selDays.includes(full);
                    return (
                      <button key={full} onClick={() => toggleDay(full)} style={{
                        padding: "5px 10px", borderRadius: "20px", cursor: "pointer",
                        fontSize: "12px", fontWeight: "600",
                        border: `1px solid ${on ? "#818cf8" : "#2a3354"}`,
                        background: on ? "rgba(129,140,248,0.14)" : "transparent",
                        color: on ? "#818cf8" : "#7c86a0",
                      }}>{short}</button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {[["Start Time", startTime, setStartTime], ["End Time", endTime, setEndTime]].map(([lbl, val, set]) => (
                  <div key={lbl} style={{ flex: 1 }}>
                    <label style={S.label}>{lbl}</label>
                    <input type="time" style={S.input} value={val} onChange={(e) => set(e.target.value)} />
                  </div>
                ))}
              </div>
              {/* Time preview so AM/PM mistakes are visible immediately */}
              {startTime && endTime && (
                <div style={{ background: "#1e2640", border: "1px solid #2a3354", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: "#7c86a0" }}>
                  {(() => {
                    const fmt = (t) => {
                      const [h, m] = t.split(":").map(Number);
                      const ampm = h < 12 ? "AM" : "PM";
                      const h12 = h % 12 || 12;
                      return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
                    };
                    const [sh, sm] = startTime.split(":").map(Number);
                    const [eh, em] = endTime.split(":").map(Number);
                    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
                    const duration = diffMins > 0 ? `${Math.floor(diffMins/60)}h${diffMins%60 ? ` ${diffMins%60}m` : ""}` : "⚠️ end is before start";
                    return <span>🕐 <b style={{ color: "#dde3f0" }}>{fmt(startTime)}</b> <span style={{ color: "#7c86a0" }}>({startTime})</span> → <b style={{ color: diffMins > 0 ? "#dde3f0" : "#f87171" }}>{fmt(endTime)}</b> <span style={{ color: "#7c86a0" }}>({endTime})</span> &nbsp;·&nbsp; {duration}</span>;
                  })()}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button style={S.btn(false)} onClick={handleClose}>Cancel</button>
              <button style={{ ...S.btn(true), opacity: canProceedStep1 ? 1 : 0.4, cursor: canProceedStep1 ? "pointer" : "default" }}
                onClick={() => canProceedStep1 && setStep(2)} disabled={!canProceedStep1}
              >Next →</button>
            </div>
          </>
        )}

        {/* ── Step 2 — Date range ── */}
        {step === 2 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                {[["Semester Start", semStart, setSemStart], ["Semester End", semEnd, setSemEnd]].map(([lbl, val, set]) => (
                  <div key={lbl} style={{ flex: 1 }}>
                    <label style={S.label}>{lbl}</label>
                    <input type="date" style={S.input} value={val} onChange={(e) => set(e.target.value)} />
                  </div>
                ))}
              </div>

              {/* Preview */}
              {previewCount > 0 && (
                <div style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: "8px", padding: "12px 14px" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#818cf8", fontWeight: "600" }}>
                    {previewCount} lessons will be created
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#7c86a0" }}>
                    {coursesForCreate.length} course{coursesForCreate.length !== 1 ? "s" : ""} ·{" "}
                    {coursesForCreate.map((c) => `${c.title} (${c.day.slice(0, 3)})`).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {conflictDays.length > 0 && (
              <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: "8px", padding: "12px 14px", marginTop: "14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#f87171", fontWeight: "600" }}>
                  ⚠ "{title.trim()}" already exists on {conflictDays.map((d) => d.slice(0,1).toUpperCase()+d.slice(1,3)).join(", ")}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#f87171", opacity: 0.85 }}>
                  Creating again will add a duplicate series. Are you sure?
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setConflictDays([])} style={{ ...S.btn(false), flex: "none", padding: "6px 14px" }}>Cancel</button>
                  <button onClick={() => handleCreate(true)} style={{ ...S.btn(true), flex: "none", padding: "6px 14px", background: "#f87171" }}>Create Anyway</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
              <button style={S.btn(false)} onClick={() => setStep(1)}>← Back</button>
              <button
                style={{ ...S.btn(true), opacity: canCreate ? 1 : 0.4, cursor: canCreate && !creating ? "pointer" : "default" }}
                onClick={() => handleCreate(false)} disabled={!canCreate || creating}
              >
                {creating ? "Creating…" : `Create ${previewCount} Lessons`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
