import {
  registerDayViewCard,
} from "./dayViewCards.js";

const EVENTS_API_URL =
  "https://functions.yandexcloud.net/d4ee1dtn2us5tvnvvh2o";

const CATEGORY_EMOJI = {
  personal: "✦", appointment: "🕰️", birthday: "🎂", trip: "🧳",
  vacation: "🌿", theatre: "🎭", other: "◌",
};

function normalizeEvent(source) {
  return {
    id: source?.id ?? source?.eventId ?? source?.event_id ?? "",
    title: source?.title ?? "",
    description: source?.description ?? "",
    categoryKey: source?.categoryKey ?? source?.category_key ?? "other",
    startDate: source?.startDate ?? source?.start_date ?? "",
    endDate: source?.endDate ?? source?.end_date ?? "",
    startTime: source?.startTime ?? source?.start_time ?? "",
  };
}

async function readJsonResponse(response) {
  let result;
  try { result = await response.json(); }
  catch { throw new Error("The House returned an unreadable Events response."); }
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || result?.message || `Events request failed (${response.status}).`);
  }
  return result;
}

async function loadEvents(date) {
  try {
    if (typeof window.grimoireFetch !== "function") {
      throw new Error("Protected access is not ready.");
    }
    const response = await window.grimoireFetch(
      `${EVENTS_API_URL}?date=${encodeURIComponent(date)}`,
      { method: "GET", headers: { Accept: "application/json" } },
    );
    const result = await readJsonResponse(response);
    return { events: Array.isArray(result.events) ? result.events.map(normalizeEvent) : [], error: null };
  } catch (error) {
    console.error("Day View Events load failed:", error);
    return { events: [], error: error instanceof Error ? error.message : "Events could not be opened." };
  }
}

function createEventRow(event) {
  const row = document.createElement("div");
  row.className = "day-view-event";
  const emoji = document.createElement("span");
  emoji.className = "day-view-event-emoji";
  emoji.textContent = CATEGORY_EMOJI[event.categoryKey] || "◌";
  const content = document.createElement("div");
  content.className = "day-view-event-content";
  const title = document.createElement("strong");
  title.textContent = event.title || "Untitled event";
  content.append(title);
  const details=[];
  if (event.startTime) details.push(event.startTime);
  if (event.startDate && event.endDate && event.startDate !== event.endDate) details.push(`${event.startDate} — ${event.endDate}`);
  if (details.length) { const meta=document.createElement("small"); meta.textContent=details.join(" · "); content.append(meta); }
  if (event.description) { const p=document.createElement("p"); p.textContent=event.description; content.append(p); }
  row.append(emoji,content);
  return row;
}

function renderEvents(data,date) {
  const events=data?.events ?? [];
  const section=document.createElement("section");
  section.className="day-view-section day-view-events-card";
  const header=document.createElement("header");
  header.className="day-view-section-header";
  const wrap=document.createElement("div");
  const label=document.createElement("p"); label.className="section-label"; label.textContent="Plans kept for this day";
  const title=document.createElement("h3"); title.textContent=events.length===1?"1 event":`${events.length} events`;
  wrap.append(label,title);
  const add=document.createElement("button"); add.type="button"; add.className="small-action-button day-view-add-event"; add.textContent="Add event";
  add.addEventListener("click",()=>document.dispatchEvent(new CustomEvent("grimoire:open-event-create",{detail:{date}})));
  header.append(wrap,add);
  const list=document.createElement("div"); list.className="day-view-events";
  if (data?.error) { const warning=document.createElement("p"); warning.className="day-view-events-warning"; warning.textContent = `Events could not be loaded: ${data.error}`; list.append(warning); }
  else if (!events.length) { const empty=document.createElement("p"); empty.className="day-view-empty"; empty.textContent="No event is resting here yet."; list.append(empty); }
  else events.forEach(event=>list.append(createEventRow(event)));
  section.append(header,list);
  return section;
}

registerDayViewCard({ id:"events", order:15, load:loadEvents, shouldShow:()=>true, render:renderEvents });
