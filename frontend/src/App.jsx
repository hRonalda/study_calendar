import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RecurringModal from "./RecurringModal.jsx";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";


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
      seriesId: lesson.seriesId || null,
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
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  color: "#1e293b",
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
  color: "#64748b",
  marginBottom: "5px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "20px",
};

const iconBtn = {
  background: "none",
  border: "none",
  color: "#94a3b8",
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
  const [dragPending, setDragPending]     = useState(null);
  const [searchQuery, setSearchQuery]       = useState("");
  const [notePreview, setNotePreview]       = useState(true);
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

  const handleEventClick  = (info) => { setSelectedEventId(info.event.id); setSeriesOpen(false); setNotePreview(true); };
  const handleDateClick   = () => closePanel();
  const handleUnselect    = () => setSelectedEventId(null);

  const handleEventChange = (changeInfo) => {
    const { event, oldEvent } = changeInfo;
    const seriesId = event.extendedProps?.seriesId ?? null;
    const oldDow = new Date(oldEvent.startStr).getDay();
    const newDow = new Date(event.startStr).getDay();
    const seriesCount = seriesId
      ? events.filter((e) => e.extendedProps.seriesId === seriesId).length
      : events.filter((e) => e.title === event.title && new Date(e.start).getDay() === oldDow).length;

    // Always move the event in local state so FullCalendar doesn't snap it back
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, start: event.startStr, end: event.endStr } : e)));

    if (seriesCount > 1) {
      setDragPending({
        eventId: event.id,
        newStart: event.startStr,
        newEnd: event.endStr,
        oldStart: oldEvent.startStr,
        oldEnd: oldEvent.endStr,
        seriesId, title: event.title, oldDow, newDow, seriesCount,
      });
    } else {
      saveLesson(event.id, { start: event.startStr, end: event.endStr });
    }
  };

  const confirmDrag = (all) => {
    if (!dragPending) return;
    const { eventId, newStart, newEnd, seriesId, title, oldDow, newDow } = dragPending;
    setDragPending(null);

    if (!all) {
      // State already correct from handleEventChange — just persist to DB
      fetch(`${API}/lessons/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: newStart, end: newEnd }),
      }).catch(console.error);
      return;
    }

    // Move all series: shift each event by dayDiff days + apply new time
    const s = new Date(newStart);
    const e = new Date(newEnd);
    const newSH = s.getHours(), newSM = s.getMinutes();
    const newEH = e.getHours(), newEM = e.getMinutes();
    const dayDiff = newDow - oldDow;

    setEvents((prev) => prev.map((ev) => {
      const matches = seriesId
        ? ev.extendedProps?.seriesId === seriesId
        : ev.title === title && new Date(ev.start).getDay() === oldDow;
      if (!matches) return ev;
      const evS = new Date(ev.start);
      evS.setDate(evS.getDate() + dayDiff);
      evS.setHours(newSH, newSM, 0, 0);
      const evE = new Date(ev.start);
      evE.setDate(evE.getDate() + dayDiff);
      evE.setHours(newEH, newEM, 0, 0);
      return { ...ev, start: evS.toISOString(), end: evE.toISOString() };
    }));

    const pad = (n) => String(n).padStart(2, "0");
    const off = new Date().getTimezoneOffset();
    const toUtc = (h, m) => {
      const u = ((h * 60 + m + off) % 1440 + 1440) % 1440;
      return `${pad(Math.floor(u / 60))}:${pad(u % 60)}`;
    };
    const body = seriesId
      ? { seriesId, startTime: toUtc(newSH, newSM), endTime: toUtc(newEH, newEM), dayOffset: dayDiff }
      : { title, dayOfWeek: oldDow, startTime: toUtc(newSH, newSM), endTime: toUtc(newEH, newEM), tzOffset: off, dayOffset: dayDiff };
    fetch(`${API}/lessons/series/reschedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(console.error);
  };

  const cancelDrag = () => {
    if (!dragPending) return;
    const { eventId, oldStart, oldEnd } = dragPending;
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, start: oldStart, end: oldEnd } : e)));
    setDragPending(null);
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
  const selectedSeriesId  = selectedEvent?.extendedProps?.seriesId ?? null;
  const seriesDayCount    = selectedEvent
    ? selectedSeriesId
      ? events.filter((e) => e.extendedProps.seriesId === selectedSeriesId).length
      : events.filter((e) => e.title === selectedEvent.title && new Date(e.start).getDay() === selectedDayOfWeek).length
    : 0;
  const seriesTotalCount  = selectedEvent ? events.filter((e) => e.title === selectedEvent.title).length : 0;

  // ── Search filter ───────────────────────────────────────────
  const filteredEvents = searchQuery.trim()
    ? events.filter((e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.extendedProps.note || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  // ── Stats ───────────────────────────────────────────────────
  const monday = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0,0,0,0); return d; })();
  const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);
  const weekEvents  = events.filter((e) => { const d = new Date(e.start); return d >= monday && d < nextMonday; });
  const weekTotal   = weekEvents.length;
  const weekDone    = weekEvents.filter((e) => e.extendedProps.status === "done").length;
  const totalCount  = events.length;
  const doneCount   = events.filter((e) => e.extendedProps.status === "done").length;

  const deleteSeries = async (dayOnly) => {
    if (!selectedEvent) return;
    const { title } = selectedEvent;
    const count = dayOnly ? seriesDayCount : seriesTotalCount;
    const label = dayOnly ? `all ${count} "${title}" on ${selectedDayName}s` : `ALL ${count} "${title}" lessons`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
      const toDelete = events.filter((e) => {
        if (selectedSeriesId && dayOnly) return e.extendedProps.seriesId === selectedSeriesId;
        if (e.title !== title) return false;
        if (!dayOnly) return true;
        return new Date(e.start).getDay() === selectedDayOfWeek;
      });
      const ids = toDelete.map((e) => e.id);
      const res = await fetch(`${API}/lessons/series`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Delete failed (${res.status}): ${data.error || "unknown error"}`);
        return;
      }
      setEvents((prev) => prev.filter((e) => !ids.includes(e.id)));
      setSelectedEventId(null);
      setExpanded(false);
    } catch (err) {
      console.error("Failed to delete series:", err);
      alert("Network error — could not reach server. Check your connection.");
    }
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
                border: `1px solid ${active ? meta.color : "#e2e8f0"}`,
                background: active ? meta.bg : "transparent",
                color: active ? meta.color : "#94a3b8",
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

  const NoteField = ({ minHeight = "88px", allowPreview = false }) => (
    <div style={{ display: "flex", flexDirection: "column", flex: minHeight === "100%" ? 1 : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <label style={{ ...label, margin: 0 }}>Note</label>
        {allowPreview && (
          <button onClick={() => setNotePreview((p) => !p)}
            style={{ background: "transparent", border: "none", color: notePreview ? "#818cf8" : "#7c86a0", cursor: "pointer", fontSize: "11px", fontWeight: "600", padding: "2px 0" }}>
            {notePreview ? "✎ Edit" : "👁 Preview"}
          </button>
        )}
      </div>
      {allowPreview && notePreview ? (
        <div style={{
          ...input, minHeight, overflowY: "auto", lineHeight: "1.7",
          color: "#1e293b", fontSize: "13px",
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            code({ inline, children }) {
              return inline
                ? <code style={{ background: "#e8edf5", borderRadius: "4px", padding: "1px 5px", fontFamily: "monospace", color: "#0f766e", fontSize: "12px" }}>{children}</code>
                : <pre style={{ background: "#1e293b", borderRadius: "6px", padding: "12px", overflowX: "auto", margin: "8px 0" }}><code style={{ fontFamily: "monospace", fontSize: "12px", color: "#4ade80", whiteSpace: "pre" }}>{children}</code></pre>;
            },
            h1: ({ children }) => <h1 style={{ fontSize: "16px", color: "#0f172a", margin: "10px 0 4px", fontWeight: "700" }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: "14px", color: "#0f172a", margin: "8px 0 4px", fontWeight: "700" }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: "13px", color: "#1e293b", margin: "6px 0 3px", fontWeight: "600" }}>{children}</h3>,
            ul: ({ children }) => <ul style={{ paddingLeft: "18px", margin: "4px 0" }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ paddingLeft: "18px", margin: "4px 0" }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: "2px", color: "#1e293b" }}>{children}</li>,
            p: ({ children }) => <p style={{ margin: "4px 0", color: "#1e293b" }}>{children}</p>,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>{children}</a>,
            blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid #cbd5e1", margin: "6px 0", paddingLeft: "10px", color: "#475569" }}>{children}</blockquote>,
          }}>
            {selectedEvent.extendedProps.note || ""}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          style={{ ...input, minHeight, resize: "vertical", lineHeight: "1.6", flex: minHeight === "100%" ? 1 : "none" }}
          value={selectedEvent.extendedProps.note || ""}
          onChange={(e) => updateSelected({ extendedProps: { note: e.target.value } })}
          onBlur={() => saveLesson(selectedEventId, { note: selectedEvent.extendedProps.note })}
          placeholder="Markdown supported — **bold**, `code`, ```code blocks```, ## headings, - lists…"
        />
      )}
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
          <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
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
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", background: "#f0f4ff", border: "1px solid #e2e8f0", color: "#818cf8", fontSize: "13px", textDecoration: "none", flexShrink: 0 }}
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
    <div style={{ padding: "24px 28px", maxWidth: "1440px", margin: "0 auto", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "9px" }}>
            Welcome, this is your study calendar
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
            Click a time slot to add a lesson · Drag events to reschedule
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: "9px", color: "#7c86a0", fontSize: "13px", pointerEvents: "none", lineHeight: 1 }}>⌕</span>
            <input
              style={{ ...input, width: "210px", paddingLeft: "28px" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lessons & notes…"
            />
          </div>
          <button
            onClick={() => setRecurringOpen(true)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #2a3354", background: "#1e2640", color: "#818cf8", cursor: "pointer", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
          >
            + Schedule Recurring
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" }}>
        {/* Progress bar */}
        <div style={{ flex: 1, minWidth: "180px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Overall</span>
            <span style={{ fontSize: "11px", color: "#334150" }}>{doneCount} / {totalCount} done</span>
          </div>
          <div style={{ height: "5px", borderRadius: "3px", background: "#b0c1f7", overflow: "hidden" }}>
            <div style={{ height: "100%", width: totalCount ? `${(doneCount / totalCount) * 100}%` : "0%", background: "linear-gradient(90deg, #818cf8, #4ade80)", borderRadius: "3px", transition: "width 0.4s ease" }} />
          </div>
        </div>
        {/* Status pills */}
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const count = events.filter((e) => e.extendedProps.status === key).length;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: meta.bg, border: `1px solid ${meta.color}44` }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: meta.color }}>{count}</span>
              <span style={{ fontSize: "11px", color: meta.color, opacity: 0.85 }}>{meta.label}</span>
            </div>
          );
        })}
        {/* This week */}
        <div style={{ padding: "4px 12px", borderRadius: "20px", background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.22)", fontSize: "12px", color: "#818cf8", fontWeight: "600", whiteSpace: "nowrap" }}>
          This week: {weekDone} / {weekTotal}
        </div>
        {/* Search result count */}
        {searchQuery.trim() && (
          <div style={{ padding: "4px 10px", borderRadius: "20px", background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)", fontSize: "12px", color: "#fb923c", fontWeight: "600" }}>
            {filteredEvents.length} match{filteredEvents.length !== 1 ? "es" : ""}
          </div>
        )}
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>

        {/* Calendar */}
        <div style={{ flex: 3, minWidth: 0, background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
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
            events={filteredEvents}
            eventContent={(arg) => (
              <div style={{ padding: "2px 6px", overflow: "hidden", height: "100%", width: "100%", background: arg.event.backgroundColor, borderRadius: "4px" }}>
                <div style={{ fontSize: "10px", color: "#fff", opacity: 0.88, whiteSpace: "nowrap" }}>{arg.timeText}</div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{arg.event.title}</div>
              </div>
            )}
            height="auto"
            displayEventEnd
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotLabelInterval="01:00:00"
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
          />
        </div>

        {/* ── Side detail panel ── */}
        <div style={{ flex: 1, minWidth: "380px", maxWidth: "440px", position: "sticky", top: "24px" }}>
          {selectedEvent ? (
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: "15px" }}>

              {/* Panel header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
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
              {NoteField({ minHeight: "88px", allowPreview: true })}
              {LinksField({ showEmbed: false })}

              {/* ── Delete / Series actions ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                <button onClick={deleteLesson}
                  style={{ padding: "9px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)", color: "#ef4444", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
                >Delete This Lesson</button>

                <button onClick={() => setSeriesOpen((p) => !p)}
                  style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                >{seriesOpen ? "▲ Hide Series Actions" : `▼ Series Actions (${selectedDayName} ${selectedEvent?.title})`}</button>

                {seriesOpen && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button onClick={() => deleteSeries(true)}
                      style={{ padding: "7px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}
                    >Delete all {selectedDayName} "{selectedEvent?.title}" ({seriesDayCount} lessons)</button>

                    {seriesTotalCount > seriesDayCount && (
                      <button onClick={() => deleteSeries(false)}
                        style={{ padding: "7px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.18)", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "11px", opacity: 0.7 }}
                      >Delete ALL "{selectedEvent?.title}" every day ({seriesTotalCount} lessons)</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ ...card, border: "1px dashed #e2e8f0", textAlign: "center", padding: "44px 20px" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>🗓</div>
              <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: "500", color: "#334155" }}>No lesson selected</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: "1.6" }}>
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
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
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
                <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                  <button onClick={deleteLesson}
                    style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)", color: "#ef4444", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
                  >Delete Lesson</button>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: "1px", background: "#2a3354", flexShrink: 0 }} />

              {/* Right — content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", paddingRight: "4px" }}>
                {NoteField({ minHeight: "220px", allowPreview: true })}
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
            <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>New Lesson</h3>
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
                style={{ flex: 1, padding: "9px", borderRadius: "6px", border: "none", background: modal.title.trim() ? "#818cf8" : "#e2e8f0", color: modal.title.trim() ? "#fff" : "#94a3b8", cursor: modal.title.trim() ? "pointer" : "default", fontSize: "13px", fontWeight: "600", transition: "background 0.12s" }}
              >Create</button>
              <button onClick={closeModal}
                style={{ flex: 1, padding: "9px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      <RecurringModal
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        existingEvents={events}
        onCreated={(newLessons) => setEvents((prev) => [...prev, ...newLessons.map(dbToCalEvent)])}
      />

      {/* ── Drag choice dialog ── */}
      {dragPending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "340px", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>Move lesson</h3>
            <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
              Move just <b>this one</b>, or move <b>all {dragPending.seriesCount} lessons</b> in this series to the new time?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button onClick={() => confirmDrag(false)}
                style={{ padding: "9px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e293b", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
              >Only this lesson</button>
              <button onClick={() => confirmDrag(true)}
                style={{ padding: "9px", borderRadius: "6px", border: "none", background: "#818cf8", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
              >All {dragPending.seriesCount} lessons in this series</button>
              <button onClick={cancelDrag}
                style={{ padding: "7px", borderRadius: "6px", border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "12px" }}
              >Cancel (undo drag)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
