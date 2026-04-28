import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import RecurringModal from "./RecurringModal.jsx";

const API = "/api";

const STATUS_META = {
  planned:     { label: "Planned",     color: "#818cf8", bg: "rgba(129,140,248,0.14)" },
  in_progress: { label: "In Progress", color: "#fb923c", bg: "rgba(251,146,60,0.14)"  },
  done:        { label: "Done",        color: "#4ade80", bg: "rgba(74,222,128,0.14)"  },
};


function getEventColor(status) {
  return STATUS_META[status]?.color ?? STATUS_META.planned.color;
}

function dbToCalEvent(lesson) {
  const color = getEventColor(lesson.status);
  return {
    id: lesson._id,
    title: lesson.title,
    start: lesson.start,
    end: lesson.end,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      note: lesson.note || "",
      status: lesson.status,
      links: lesson.links || [],
    },
  };
}

function formatDateTimeForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatModalTime(start, end) {
  if (!start) return "";
  const s = new Date(start);
  const e = new Date(end);
  const day = s.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const pad = (n) => String(n).padStart(2, "0");
  return `${day}  ·  ${pad(s.getHours())}:${pad(s.getMinutes())} – ${pad(e.getHours())}:${pad(e.getMinutes())}`;
}

// Detect YouTube / Vimeo URLs for the expanded embed preview
function getVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

// ── Shared style tokens ─────────────────────────────────────
const input = {
  width: "100%",
  background: "#1e2640",
  border: "1px solid #2a3354",
  borderRadius: "6px",
  color: "#dde3f0",
  padding: "8px 10px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const label = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#7c86a0",
  marginBottom: "5px",
};

const card = {
  background: "#161c2c",
  border: "1px solid #2a3354",
  borderRadius: "10px",
  padding: "20px",
};

const iconBtn = {
  background: "none",
  border: "none",
  color: "#7c86a0",
  cursor: "pointer",
  fontSize: "18px",
  lineHeight: 1,
  padding: "2px 5px",
  borderRadius: "4px",
};

export default function App() {
  const [events, setEvents]               = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [modal, setModal]                 = useState({ open: false, title: "", start: "", end: "" });
  const [expanded, setExpanded]           = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [seriesOpen, setSeriesOpen]       = useState(false);
  const [rescheduleTime, setRescheduleTime] = useState({ start: "", end: "" });
  const calendarRef   = useRef(null);
  const modalInputRef = useRef(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const curStatus     = selectedEvent?.extendedProps?.status ?? "planned";

  // ── Data loading ────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/lessons`)
      .then((r) => r.json())
      .then((data) => setEvents(data.map(dbToCalEvent)))
      .catch((err) => console.error("Failed to load lessons:", err));
  }, []);

  useEffect(() => {
    if (modal.open) setTimeout(() => modalInputRef.current?.focus(), 40);
  }, [modal.open]);

  // ── API helpers ─────────────────────────────────────────────
  const saveLesson = async (id, fields) => {
    try {
      const res = await fetch(`${API}/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === id ? dbToCalEvent(updated) : e)));
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  // ── Panel / calendar handlers ────────────────────────────────
  const closePanel = () => {
    setSelectedEventId(null);
    setExpanded(false);
    calendarRef.current?.getApi()?.unselect();
  };

  const handleSelect = (info) => {
    calendarRef.current?.getApi()?.unselect();
    setModal({ open: true, title: "", start: info.startStr, end: info.endStr });
  };

  const handleCreateLesson = async () => {
    if (!modal.title.trim()) return;
    try {
      const res = await fetch(`${API}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: modal.title.trim(), start: modal.start, end: modal.end }),
      });
      const lesson = await res.json();
      setEvents((prev) => [...prev, dbToCalEvent(lesson)]);
      setSelectedEventId(lesson._id);
      setModal({ open: false, title: "", start: "", end: "" });
    } catch (err) {
      console.error("Failed to create lesson:", err);
    }
  };

  const closeModal = () => setModal({ open: false, title: "", start: "", end: "" });

  const handleEventClick  = (info) => { setSelectedEventId(info.event.id); setSeriesOpen(false); };
  const handleDateClick   = () => closePanel();
  const handleUnselect    = () => setSelectedEventId(null);

  const handleEventChange = (changeInfo) => {
    const { event } = changeInfo;
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, start: event.startStr, end: event.endStr } : e))
    );
    saveLesson(event.id, { start: event.startStr, end: event.endStr });
  };

  // ── Local state patchers ─────────────────────────────────────
  const patchLocal = (id, updater) =>
    setEvents((prev) => prev.map((e) => (e.id !== id ? e : updater(e))));

  const updateSelected = (fields) => {
    if (!selectedEventId) return;
    patchLocal(selectedEventId, (e) => {
      const props = { ...e.extendedProps, ...(fields.extendedProps || {}) };
      const color = getEventColor(props.status || "planned");
      return { ...e, ...fields, extendedProps: props, backgroundColor: color, borderColor: color };
    });
  };

  const updateLink = (index, value) => {
    if (!selectedEventId) return;
    patchLocal(selectedEventId, (e) => {
      const links = [...(e.extendedProps.links || [])];
      links[index] = value;
      return { ...e, extendedProps: { ...e.extendedProps, links } };
    });
  };

  const addLink = () => {
    if (!selectedEventId) return;
    patchLocal(selectedEventId, (e) => ({
      ...e,
      extendedProps: { ...e.extendedProps, links: [...(e.extendedProps.links || []), ""] },
    }));
  };

  const removeLink = (index) => {
    if (!selectedEventId) return;
    const cur = events.find((e) => e.id === selectedEventId);
    if (!cur) return;
    const target = cur.extendedProps.links?.[index] || "(empty)";
    if (!window.confirm(`Delete this link?\n\n${target}`)) return;
    const links = (cur.extendedProps.links || []).filter((_, i) => i !== index);
    patchLocal(selectedEventId, (e) => ({ ...e, extendedProps: { ...e.extendedProps, links } }));
    saveLesson(selectedEventId, { links });
  };

  const deleteLesson = async () => {
    if (!selectedEvent || !window.confirm(`Delete "${selectedEvent.title}"?`)) return;
    try {
      await fetch(`${API}/lessons/${selectedEventId}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== selectedEventId));
      setSelectedEventId(null);
      setExpanded(false);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedDayOfWeek = selectedEvent ? new Date(selectedEvent.start).getDay() : null;
  const selectedDayName   = selectedDayOfWeek !== null ? DAY_NAMES[selectedDayOfWeek] : "";
  const seriesDayCount    = selectedEvent
    ? events.filter((e) => e.title === selectedEvent.title && new Date(e.start).getDay() === selectedDayOfWeek).length
    : 0;
  const seriesTotalCount  = selectedEvent ? events.filter((e) => e.title === selectedEvent.title).length : 0;

  const deleteSeries = async (dayOnly) => {
    if (!selectedEvent) return;
    const { title } = selectedEvent;
    const count = dayOnly ? seriesDayCount : seriesTotalCount;
    const label = dayOnly ? `all ${count} "${title}" on ${selectedDayName}s` : `ALL ${count} "${title}" lessons`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
      const body = dayOnly ? { title, dayOfWeek: selectedDayOfWeek } : { title };
      await fetch(`${API}/lessons/series`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setEvents((prev) => prev.filter((e) => {
        if (e.title !== title) return true;
        if (!dayOnly) return false;
        return new Date(e.start).getDay() !== selectedDayOfWeek;
      }));
      setSelectedEventId(null);
      setExpanded(false);
    } catch (err) { console.error("Failed to delete series:", err); }
  };

  const rescheduleSeries = async (newStart, newEnd) => {
    if (!selectedEvent) return;
    const { title } = selectedEvent;
    try {
      const res = await fetch(`${API}/lessons/series/reschedule`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dayOfWeek: selectedDayOfWeek, startTime: newStart, endTime: newEnd }),
      });
      const { lessons } = await res.json();
      setEvents((prev) => {
        const map = Object.fromEntries(lessons.map((l) => [l._id, l]));
        return prev.map((e) => map[e.id] ? dbToCalEvent(map[e.id]) : e);
      });
    } catch (err) { console.error("Failed to reschedule:", err); }
  };

  // ── Reusable field blocks (used in both panel + expanded modal) ──
  const TitleField = () => (
    <div>
      <label style={label}>Title</label>
      <input
        style={input}
        value={selectedEvent.title}
        onChange={(e) => updateSelected({ title: e.target.value })}
        onBlur={() => saveLesson(selectedEventId, { title: selectedEvent.title })}
      />
    </div>
  );

  const StatusField = () => (
    <div>
      <label style={label}>Status</label>
      <div style={{ display: "flex", gap: "6px" }}>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const active = curStatus === key;
          return (
            <button key={key}
              onClick={() => { updateSelected({ extendedProps: { status: key } }); saveLesson(selectedEventId, { status: key }); }}
              style={{
                flex: 1, padding: "5px 0", borderRadius: "20px",
                border: `1px solid ${active ? meta.color : "#2a3354"}`,
                background: active ? meta.bg : "transparent",
                color: active ? meta.color : "#7c86a0",
                fontSize: "11px", fontWeight: "600", cursor: "pointer",
                letterSpacing: "0.02em", transition: "all 0.12s",
              }}
            >{meta.label}</button>
          );
        })}
      </div>
    </div>
  );

  const DateFields = () => (
    <>
      {[["Start", "start"], ["End", "end"]].map(([lbl, key]) => (
        <div key={key}>
          <label style={label}>{lbl}</label>
          <input
            type="datetime-local"
            style={{ ...input, fontSize: "12px", padding: "7px 8px" }}
            value={formatDateTimeForInput(selectedEvent[key])}
            onChange={(e) => { updateSelected({ [key]: e.target.value }); saveLesson(selectedEventId, { [key]: e.target.value }); }}
          />
        </div>
      ))}
    </>
  );

  const NoteField = ({ minHeight = "88px" }) => (
    <div style={{ display: "flex", flexDirection: "column", flex: minHeight === "100%" ? 1 : "none" }}>
      <label style={label}>Note</label>
      <textarea
        style={{ ...input, minHeight, resize: "vertical", lineHeight: "1.6", flex: minHeight === "100%" ? 1 : "none" }}
        value={selectedEvent.extendedProps.note || ""}
        onChange={(e) => updateSelected({ extendedProps: { note: e.target.value } })}
        onBlur={() => saveLesson(selectedEventId, { note: selectedEvent.extendedProps.note })}
        placeholder="Add notes — supports any freeform text, outlines, questions…"
      />
    </div>
  );

  const LinksField = ({ showEmbed = false }) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <label style={{ ...label, margin: 0 }}>Resources & Links</label>
        <button onClick={addLink}
          style={{ background: "transparent", border: "none", color: "#818cf8", cursor: "pointer", fontSize: "12px", fontWeight: "600", padding: "2px 0" }}
        >+ Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {(selectedEvent.extendedProps.links || []).length === 0 && (
          <p style={{ margin: 0, fontSize: "12px", color: "#7c86a0", fontStyle: "italic" }}>
            No resources yet — type or paste a link here.
          </p>
        )}
        {(selectedEvent.extendedProps.links || []).map((link, i) => {
          const embed = showEmbed ? getVideoEmbed(link) : null;
          return (
            <div key={i}>
              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <input
                  style={{ ...input, flex: 1 }}
                  value={link}
                  onChange={(e) => updateLink(i, e.target.value)}
                  onBlur={() => {
                    const cur = events.find((e) => e.id === selectedEventId);
                    saveLesson(selectedEventId, { links: cur?.extendedProps.links });
                  }}
                  placeholder="Put links here… "
                />
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", background: "#1e2640", border: "1px solid #2a3354", color: "#818cf8", fontSize: "13px", textDecoration: "none", flexShrink: 0 }}
                    title="Open"
                  >↗</a>
                )}
                <button onClick={() => removeLink(i)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", cursor: "pointer", fontSize: "15px", flexShrink: 0 }}
                >×</button>
              </div>
              {/* Auto-embed YouTube / Vimeo in expanded view */}
              {embed && (
                <iframe
                  src={embed}
                  style={{ width: "100%", height: "200px", borderRadius: "6px", border: "none", marginTop: "6px" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 28px", maxWidth: "1440px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#dde3f0", display: "flex", alignItems: "center", gap: "9px" }}>
            <span>📚</span> Study Calendar
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#7c86a0" }}>
            Click a time slot to add a lesson · Drag events to reschedule
          </p>
        </div>
        <button
          onClick={() => setRecurringOpen(true)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #2a3354", background: "#1e2640", color: "#818cf8", cursor: "pointer", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
        >
          + Schedule Recurring
        </button>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>

        {/* Calendar */}
        <div style={{ flex: 3, minWidth: 0 }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            selectable editable selectMirror={false}
            select={handleSelect}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            unselect={handleUnselect}
            eventChange={handleEventChange}
            events={events}
            height="auto"
            displayEventEnd
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
          />
        </div>

        {/* ── Side detail panel ── */}
        <div style={{ flex: 1, minWidth: "300px", maxWidth: "330px", position: "sticky", top: "24px" }}>
          {selectedEvent ? (
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: "15px" }}>

              {/* Panel header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c86a0" }}>
                  Lesson Details
                </span>
                <div style={{ display: "flex", gap: "2px" }}>
                  <button onClick={() => setExpanded(true)} style={iconBtn} title="Expand to full view">⤢</button>
                  <button onClick={closePanel} style={iconBtn}>×</button>
                </div>
              </div>

              {TitleField()}
              {StatusField()}
              {DateFields()}
              {NoteField({ minHeight: "88px" })}
              {LinksField({ showEmbed: false })}

              {/* ── Delete / Series actions ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #2a3354", paddingTop: "12px" }}>
                <button onClick={deleteLesson}
                  style={{ padding: "9px", borderRadius: "6px", border: "1px solid rgba(248,113,113,0.28)", background: "rgba(248,113,113,0.07)", color: "#f87171", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
                >Delete This Lesson</button>

                <button onClick={() => { setSeriesOpen((p) => !p); setRescheduleTime({ start: "", end: "" }); }}
                  style={{ padding: "8px", borderRadius: "6px", border: "1px solid #2a3354", background: "transparent", color: "#7c86a0", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                >{seriesOpen ? "▲ Hide Series Actions" : `▼ Series Actions (${selectedDayName} ${selectedEvent?.title})`}</button>

                {seriesOpen && (
                  <div style={{ background: "#1a1f35", border: "1px solid #2a3354", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Reschedule */}
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.07em", color: "#7c86a0" }}>
                        Reschedule all {selectedDayName} {selectedEvent?.title} ({seriesDayCount} lessons)
                      </p>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        <input type="time" value={rescheduleTime.start} onChange={(e) => setRescheduleTime((p) => ({ ...p, start: e.target.value }))}
                          style={{ flex: 1, background: "#1e2640", border: "1px solid #2a3354", borderRadius: "6px", color: "#dde3f0", padding: "6px 8px", fontSize: "12px", outline: "none", minWidth: "80px" }} />
                        <span style={{ color: "#7c86a0", fontSize: "12px" }}>→</span>
                        <input type="time" value={rescheduleTime.end} onChange={(e) => setRescheduleTime((p) => ({ ...p, end: e.target.value }))}
                          style={{ flex: 1, background: "#1e2640", border: "1px solid #2a3354", borderRadius: "6px", color: "#dde3f0", padding: "6px 8px", fontSize: "12px", outline: "none", minWidth: "80px" }} />
                        <button
                          disabled={!rescheduleTime.start || !rescheduleTime.end}
                          onClick={async () => { await rescheduleSeries(rescheduleTime.start, rescheduleTime.end); setSeriesOpen(false); }}
                          style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: rescheduleTime.start && rescheduleTime.end ? "#818cf8" : "#2a3354", color: rescheduleTime.start && rescheduleTime.end ? "#fff" : "#7c86a0", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                        >Apply</button>
                      </div>
                    </div>

                    {/* Delete day series */}
                    <button onClick={() => deleteSeries(true)}
                      style={{ padding: "7px", borderRadius: "6px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.07)", color: "#f87171", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}
                    >Delete all {selectedDayName} "{selectedEvent?.title}" ({seriesDayCount} lessons)</button>

                    {/* Delete all days */}
                    {seriesTotalCount > seriesDayCount && (
                      <button onClick={() => deleteSeries(false)}
                        style={{ padding: "7px", borderRadius: "6px", border: "1px solid rgba(248,113,113,0.18)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: "11px", opacity: 0.7 }}
                      >Delete ALL "{selectedEvent?.title}" every day ({seriesTotalCount} lessons)</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ ...card, border: "1px dashed #2a3354", textAlign: "center", padding: "44px 20px" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>🗓</div>
              <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: "500", color: "#c0c9de" }}>No lesson selected</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#7c86a0", lineHeight: "1.6" }}>
                Click a time slot to create a new lesson, or click an existing event to edit it.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded full-view modal ── */}
      {expanded && selectedEvent && (
        <div
          onClick={(e) => e.target === e.currentTarget && setExpanded(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900, padding: "24px" }}
        >
          <div style={{
            ...card,
            width: "100%", maxWidth: "920px", maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            padding: "24px",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c86a0" }}>
                  Full View
                </span>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#818cf8" }}>
                  {formatModalTime(selectedEvent.start, selectedEvent.end)}
                </p>
              </div>
              <button onClick={() => setExpanded(false)} style={{ ...iconBtn, fontSize: "22px" }}>×</button>
            </div>

            {/* Two-column body */}
            <div style={{ display: "flex", gap: "28px", flex: 1, overflow: "hidden", minHeight: 0 }}>

              {/* Left — meta */}
              <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto" }}>
                {TitleField()}
                {StatusField()}
                {DateFields()}
                <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #2a3354" }}>
                  <button onClick={deleteLesson}
                    style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid rgba(248,113,113,0.28)", background: "rgba(248,113,113,0.07)", color: "#f87171", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
                  >Delete Lesson</button>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: "1px", background: "#2a3354", flexShrink: 0 }} />

              {/* Right — content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", paddingRight: "4px" }}>
                {NoteField({ minHeight: "220px" })}
                {LinksField({ showEmbed: true })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create lesson modal ── */}
      {modal.open && (
        <div
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div style={{ ...card, width: "360px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "600", color: "#dde3f0" }}>New Lesson</h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#818cf8" }}>
              {formatModalTime(modal.start, modal.end)}
            </p>
            <input
              ref={modalInputRef}
              style={{ ...input, marginBottom: "14px", fontSize: "14px", padding: "10px 12px" }}
              value={modal.title}
              onChange={(e) => setModal((p) => ({ ...p, title: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateLesson(); if (e.key === "Escape") closeModal(); }}
              placeholder="Lesson title…"
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleCreateLesson} disabled={!modal.title.trim()}
                style={{ flex: 1, padding: "9px", borderRadius: "6px", border: "none", background: modal.title.trim() ? "#818cf8" : "#2a3354", color: modal.title.trim() ? "#fff" : "#7c86a0", cursor: modal.title.trim() ? "pointer" : "default", fontSize: "13px", fontWeight: "600", transition: "background 0.12s" }}
              >Create</button>
              <button onClick={closeModal}
                style={{ flex: 1, padding: "9px", borderRadius: "6px", border: "1px solid #2a3354", background: "transparent", color: "#7c86a0", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      <RecurringModal
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        onCreated={(newLessons) => setEvents((prev) => [...prev, ...newLessons.map(dbToCalEvent)])}
      />
    </div>
  );
}
