const CALENDAR_API_URL =
  "https://functions.yandexcloud.net/d4eumehm2lk051cplv2n";

const EVENTS_API_URL =
  "https://functions.yandexcloud.net/d4ee1dtn2us5tvnvvh2o";

const ACCESS_KEY_STORAGE =
  "grimoire-access-key";

async function waitForProtectedAccess({
  timeout = 120000,
  interval = 50,
} = {}) {
  const startedAt =
    Date.now();

  while (
    Date.now() - startedAt <
    timeout
  ) {
    const hasFetch =
      typeof window.grimoireFetch ===
      "function";

    const hasKey =
      Boolean(
        localStorage
          .getItem(
            ACCESS_KEY_STORAGE,
          )
          ?.trim(),
      );

    if (hasFetch && hasKey) {
      return;
    }

    await new Promise(
      (resolve) => {
        window.setTimeout(
          resolve,
          interval,
        );
      },
    );
  }

  throw new Error(
    "The House could not prepare its protected calendar in time.",
  );
}

async function protectedFetch(
  input,
  init,
) {
  await waitForProtectedAccess();

  return window.grimoireFetch(
    input,
    init,
  );
}

const calendarState = {
  visibleMonth:
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ),

  selectedDate: null,

  questsByDate:
    new Map(),

  journalByDate:
    new Map(),

  eventsByDate:
    new Map(),

  visibleEvents: [],

  eventTracks:
    new Map(),

  eventsError: "",
};

const elements = {
  room:
    document.getElementById(
      "calendar-room",
    ),

  monthLabel:
    document.getElementById(
      "calendar-month-label",
    ),

  grid:
    document.getElementById(
      "calendar-grid",
    ),

  previousButton:
    document.getElementById(
      "calendar-previous-month",
    ),

  nextButton:
    document.getElementById(
      "calendar-next-month",
    ),

  todayButton:
    document.getElementById(
      "calendar-today-button",
    ),

  status:
    document.getElementById(
      "calendar-status",
    ),
};

let isInitialized = false;
let isLoadingMonth = false;

const EVENT_CATEGORIES = {
  personal: { emoji: "🌿", color: "sage" },
  appointment: { emoji: "📌", color: "blue" },
  birthday: { emoji: "🎂", color: "rose" },
  trip: { emoji: "🧳", color: "gold" },
  vacation: { emoji: "🍃", color: "green" },
  theatre: { emoji: "🎭", color: "lavender" },
  other: { emoji: "✨", color: "peach" },
};

function getEventCategory(categoryKey = "other") {
  return EVENT_CATEGORIES[categoryKey] || EVENT_CATEGORIES.other;
}

function getQuestEmoji(quest) {
  return quest?.category?.emoji || "✦";
}






function toDateKey(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateKey(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return Number.isFinite(
    date.getTime(),
  )
    ? date
    : null;
}

function formatMonth(date) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function showStatus(message = "") {
  if (!elements.status) {
    return;
  }

  elements.status.textContent =
    message;
}

function getMonthRange(date) {
  const from =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    );

  const to =
    new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    );

  return {
    from: toDateKey(from),
    to: toDateKey(to),
  };
}

function normalizeQuest(value) {
  const source =
    value &&
    typeof value === "object"
      ? value
      : {};

  return {
    id:
      typeof (source.id ?? source.quest_id) === "string"
        ? (source.id ?? source.quest_id)
        : "",

    date:
      typeof source.date === "string"
        ? source.date
        : "",

    title:
      typeof source.title === "string"
        ? source.title
        : "",

    note:
      typeof source.note === "string"
        ? source.note
        : "",

    type:
      typeof source.type === "string"
        ? source.type
        : "quest",

    scheduledDate:
      typeof source.scheduledDate ===
      "string"
        ? source.scheduledDate
        : "",

    difficulty:
      typeof source.difficulty ===
      "string"
        ? source.difficulty
        : "regular",

    completed:
      Boolean(source.completed),

    completedMessage:
      typeof source.completedMessage ===
      "string"
        ? source.completedMessage
        : "",

    houseMessage:
      typeof source.houseMessage ===
      "string"
        ? source.houseMessage
        : "",

    category:
      source.category &&
      typeof source.category ===
      "object"
        ? source.category
        : {},
  };
}

function groupQuestsByDate(items) {
  const grouped =
    new Map();

  items.forEach((item) => {
    const quest =
      normalizeQuest(item);

    if (
      !quest.id ||
      !quest.date
    ) {
      return;
    }

    const current =
      grouped.get(
        quest.date,
      ) ?? [];

    current.push(quest);

    grouped.set(
      quest.date,
      current,
    );
  });

  return grouped;
}

async function readJsonResponse(
  response,
) {
  const rawBody =
    await response.text();

  let result = null;

  if (rawBody) {
    try {
      result =
        JSON.parse(rawBody);
    } catch {
      const preview =
        rawBody
          .replace(/\s+/g, " ")
          .slice(0, 220);

      throw new Error(
        `HTTP ${response.status} ${response.statusText || ""}. ` +
        `The Cloud Function returned non-JSON content: ${preview || "empty response"}`,
      );
    }
  }

  if (!response.ok || !result?.ok) {
    const apiMessage =
      result?.error ||
      result?.message ||
      "No error details were returned.";

    throw new Error(
      `HTTP ${response.status} ${response.statusText || ""}: ${apiMessage}`,
    );
  }

  return result;
}

async function fetchMonthQuests(
  visibleMonth,
) {
  const range =
    getMonthRange(
      visibleMonth,
    );

  const url =
    `${CALENDAR_API_URL}` +
    `?resource=quest-calendar` +
    `&from=${encodeURIComponent(
      range.from,
    )}` +
    `&to=${encodeURIComponent(
      range.to,
    )}`;

  const response = await protectedFetch(url, {
    method: "GET",

    headers: {
      Accept: "application/json",
    },
  });

  const result =
    await readJsonResponse(
      response,
    );

  return Array.isArray(
    result.quests,
  )
    ? result.quests
    : [];
}


async function fetchJournalEntry(
  date,
) {
  const response =
    await protectedFetch(
      `${CALENDAR_API_URL}` +
        `?date=${encodeURIComponent(
          date,
        )}`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const result =
    await readJsonResponse(
      response,
    );

  return {
    date,
    found:
      Boolean(
        result.found &&
        result.entry,
      ),
  };
}

async function fetchMonthJournal(
  visibleMonth,
) {
  const range =
    getMonthRange(
      visibleMonth,
    );

  const startDate =
    fromDateKey(
      range.from,
    );

  const endDate =
    fromDateKey(
      range.to,
    );

  if (
    !startDate ||
    !endDate
  ) {
    return [];
  }

  const dates = [];

  const cursor =
    new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );

  while (
    cursor <= endDate
  ) {
    dates.push(
      toDateKey(cursor),
    );

    cursor.setDate(
      cursor.getDate() + 1,
    );
  }

  const results = [];

  const batchSize = 6;

  for (
    let index = 0;
    index < dates.length;
    index += batchSize
  ) {
    const batch =
      dates.slice(
        index,
        index + batchSize,
      );

    const batchResults =
      await Promise.all(
        batch.map(
          fetchJournalEntry,
        ),
      );

    results.push(
      ...batchResults,
    );
  }

  return results.filter(
    (item) => item.found,
  );
}

function groupJournalByDate(
  items,
) {
  const grouped =
    new Map();

  items.forEach((item) => {
    if (
      item?.found &&
      item.date
    ) {
      grouped.set(
        item.date,
        true,
      );
    }
  });

  return grouped;
}


function normalizeEvent(value) {
  const source =
    value &&
    typeof value === "object"
      ? value
      : {};

  return {
    id:
      typeof (source.id ?? source.eventId ?? source.event_id) === "string"
        ? (source.id ?? source.eventId ?? source.event_id)
        : "",

    title:
      typeof source.title === "string"
        ? source.title
        : "",

    description:
      typeof source.description ===
      "string"
        ? source.description
        : "",

    categoryKey:
      typeof (
        source.categoryKey ??
        source.category_key
      ) === "string"
        ? (
            source.categoryKey ??
            source.category_key
          )
        : "",

    startDate:
      typeof (
        source.startDate ??
        source.start_date
      ) === "string"
        ? (
            source.startDate ??
            source.start_date
          )
        : "",

    endDate:
      typeof (
        source.endDate ??
        source.end_date
      ) === "string"
        ? (
            source.endDate ??
            source.end_date
          )
        : "",

    startTime:
      typeof (
        source.startTime ??
        source.start_time
      ) === "string"
        ? (
            source.startTime ??
            source.start_time
          )
        : "",
  };
}

async function fetchMonthEvents(
  visibleMonth,
) {
  const range =
    getMonthRange(
      visibleMonth,
    );

  const url =
    `${EVENTS_API_URL}` +
    `?from=${encodeURIComponent(
      range.from,
    )}` +
    `&to=${encodeURIComponent(
      range.to,
    )}`;

  const response =
    await protectedFetch(
      url,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const result =
    await readJsonResponse(
      response,
    );

  return Array.isArray(
    result.events,
  )
    ? result.events
    : [];
}

function groupEventsByDate(
  items,
  visibleMonth,
) {
  const grouped =
    new Map();

  const range =
    getMonthRange(
      visibleMonth,
    );

  const monthStart =
    fromDateKey(
      range.from,
    );

  const monthEnd =
    fromDateKey(
      range.to,
    );

  if (
    !monthStart ||
    !monthEnd
  ) {
    return grouped;
  }

  items.forEach((item) => {
    const calendarEvent =
      normalizeEvent(item);

    const eventStart =
      fromDateKey(
        calendarEvent.startDate,
      );

    const eventEnd =
      fromDateKey(
        calendarEvent.endDate,
      );

    if (
      !calendarEvent.id ||
      !eventStart ||
      !eventEnd
    ) {
      return;
    }

    const rangeStart =
      eventStart < monthStart
        ? monthStart
        : eventStart;

    const rangeEnd =
      eventEnd > monthEnd
        ? monthEnd
        : eventEnd;

    const cursor =
      new Date(
        rangeStart.getFullYear(),
        rangeStart.getMonth(),
        rangeStart.getDate(),
      );

    while (
      cursor <= rangeEnd
    ) {
      const dateKey =
        toDateKey(cursor);

      const current =
        grouped.get(dateKey) ?? [];

      current.push(
        calendarEvent,
      );

      grouped.set(
        dateKey,
        current,
      );

      cursor.setDate(
        cursor.getDate() + 1,
      );
    }
  });

  grouped.forEach((events) => {
    events.sort(
      (first, second) =>
        first.startTime.localeCompare(
          second.startTime,
        ) ||
        first.title.localeCompare(
          second.title,
        ),
    );
  });

  return grouped;
}

function isLongEvent(calendarEvent) {
  return Boolean(
    calendarEvent.startDate &&
    calendarEvent.endDate &&
    calendarEvent.startDate !== calendarEvent.endDate
  );
}

function stopCalendarItemClick(event) {
  event.preventDefault();
  event.stopPropagation();
}

function createSticker({ type, item }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `calendar-sticker calendar-${type}-sticker`;

  if (type === "event") {
    const category = getEventCategory(item.categoryKey);
    button.dataset.category = category.color;
    button.innerHTML = `<span class="calendar-sticker-emoji" aria-hidden="true"></span><span class="calendar-sticker-title"></span>`;
    button.querySelector(".calendar-sticker-emoji").textContent = category.emoji;
    button.querySelector(".calendar-sticker-title").textContent = item.title || "Untitled event";
    button.setAttribute("aria-label", `Open event: ${item.title || "Untitled event"}`);
    button.addEventListener("click", (event) => {
      stopCalendarItemClick(event);
      openCalendarItemDialog("event", item);
    });
  } else {
    button.classList.add("is-emoji-only");
    button.innerHTML = `<span class="calendar-sticker-emoji" aria-hidden="true"></span>`;
    button.querySelector(".calendar-sticker-emoji").textContent = getQuestEmoji(item);
    button.setAttribute("aria-label", `Open completed quest: ${item.title || "Untitled quest"}`);
    button.title = item.title || "Completed quest";
    if (item.completed) button.classList.add("is-completed");
    button.addEventListener("click", (event) => {
      stopCalendarItemClick(event);
      openCalendarItemDialog("quest", item);
    });
  }

  return button;
}

function getWeekSegments(events, weekStart) {
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const occupiedTracks = [];
  const segments = [];

  events
    .filter(isLongEvent)
    .map(normalizeEvent)
    .filter((item) => item.id && item.startDate && item.endDate)
    .sort((first, second) =>
      first.startDate.localeCompare(second.startDate) ||
      second.endDate.localeCompare(first.endDate) ||
      first.title.localeCompare(second.title),
    )
    .forEach((calendarEvent) => {
      const eventStart = fromDateKey(calendarEvent.startDate);
      const eventEnd = fromDateKey(calendarEvent.endDate);
      if (!eventStart || !eventEnd || eventEnd < weekStart || eventStart > weekEnd) return;

      const segmentStart = eventStart > weekStart ? eventStart : weekStart;
      const segmentEnd = eventEnd < weekEnd ? eventEnd : weekEnd;
      const startColumn = Math.round((segmentStart - weekStart) / 86400000);
      const endColumn = Math.round((segmentEnd - weekStart) / 86400000);

      let track = 0;
      while (occupiedTracks[track]?.some((range) =>
        !(endColumn < range.startColumn || startColumn > range.endColumn)
      )) track += 1;

      occupiedTracks[track] ||= [];
      occupiedTracks[track].push({ startColumn, endColumn });
      segments.push({ calendarEvent, track, startColumn, endColumn });
    });

  return segments;
}

function createLongEventBar(segment) {
  const category = getEventCategory(segment.calendarEvent.categoryKey);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "calendar-long-event-bar";
  button.dataset.category = category.color;
  button.style.setProperty("--event-start", String(segment.startColumn));
  button.style.setProperty("--event-span", String(segment.endColumn - segment.startColumn + 1));
  button.style.setProperty("--event-track", String(segment.track));
  button.innerHTML = `<span class="calendar-long-event-bar-emoji" aria-hidden="true"></span><span class="calendar-long-event-bar-title"></span>`;
  button.querySelector(".calendar-long-event-bar-emoji").textContent = category.emoji;
  button.querySelector(".calendar-long-event-bar-title").textContent = segment.calendarEvent.title || "Untitled event";
  button.addEventListener("click", (event) => {
    stopCalendarItemClick(event);
    openCalendarItemDialog("event", segment.calendarEvent);
  });
  return button;
}

function createDayButton({ date, outsideMonth }) {
  const dateKey = toDateKey(date);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "calendar-day";
  button.dataset.date = dateKey;
  button.setAttribute("aria-label", formatLongDate(date));
  if (outsideMonth) button.classList.add("is-outside-month");
  if (dateKey === toDateKey(new Date())) button.classList.add("is-today");
  if (calendarState.selectedDate === dateKey) button.classList.add("is-selected");

  const number = document.createElement("span");
  number.className = "calendar-day-number";
  number.textContent = String(date.getDate());
  const content = document.createElement("span");
  content.className = "calendar-day-content";
  const markers = document.createElement("span");
  markers.className = "calendar-day-markers";

  const quests = (calendarState.questsByDate.get(dateKey) ?? [])
    .filter((quest) => quest.completed);
  const hasJournal = calendarState.journalByDate.has(dateKey);
  const singleEvents = (calendarState.eventsByDate.get(dateKey) ?? []).filter((item) => !isLongEvent(item));
  const items = [
    ...singleEvents.map((item) => ({ type: "event", item })),
    ...quests.map((item) => ({ type: "quest", item })),
  ];
  items.slice(0, 2).forEach((entry) => markers.append(createSticker(entry)));
  if (items.length > 2) {
    const more = document.createElement("span");
    more.className = "calendar-more-count";
    more.textContent = `+${items.length - 2}`;
    markers.append(more);
  }
  if (hasJournal) {
    const journal = document.createElement("span");
    journal.className = "calendar-journal-corner";
    journal.textContent = "📝";
    journal.title = "Journal entry";
    content.append(journal);
  }
  content.append(markers);
  button.append(number, content);
  button.addEventListener("click", () => {
    calendarState.selectedDate = dateKey;
    renderCalendar();
    document.dispatchEvent(new CustomEvent("grimoire:open-day-view", { detail: { date: dateKey } }));
  });
  return button;
}

function renderWeekdayHeadings() {
  const row = document.createElement("div");
  row.className = "calendar-weekday-row";
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((label) => {
    const heading = document.createElement("span");
    heading.className = "calendar-weekday";
    heading.textContent = label;
    row.append(heading);
  });
  elements.grid.append(row);
}

function createWeekRow(weekStart, month) {
  const row = document.createElement("div");
  row.className = "calendar-week-row";
  const days = document.createElement("div");
  days.className = "calendar-week-days";
  for (let column = 0; column < 7; column += 1) {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + column);
    days.append(createDayButton({ date, outsideMonth: date.getMonth() !== month }));
  }
  const segments = getWeekSegments(calendarState.visibleEvents, weekStart);
  const tracks = document.createElement("div");
  tracks.className = "calendar-week-tracks";
  const trackCount = segments.reduce((count, segment) => Math.max(count, segment.track + 1), 0);
  tracks.style.setProperty("--week-track-count", String(trackCount));
  segments.forEach((segment) => tracks.append(createLongEventBar(segment)));
  row.style.setProperty("--week-track-count", String(trackCount));
  row.append(days, tracks);
  return row;
}

function renderCalendar() {
  if (!elements.grid || !elements.monthLabel) return;
  elements.monthLabel.textContent = formatMonth(calendarState.visibleMonth);
  elements.grid.replaceChildren();
  renderWeekdayHeadings();
  const year = calendarState.visibleMonth.getFullYear();
  const month = calendarState.visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);
  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStart = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + weekIndex * 7);
    elements.grid.append(createWeekRow(weekStart, month));
  }
}

function formatEventDates(calendarEvent) {
  if (!calendarEvent.startDate) return "";
  if (!calendarEvent.endDate || calendarEvent.startDate === calendarEvent.endDate) return calendarEvent.startDate;
  return `${calendarEvent.startDate} — ${calendarEvent.endDate}`;
}

async function deleteCalendarEvent(calendarEvent) {
  const response = await protectedFetch(`${EVENTS_API_URL}?id=${encodeURIComponent(calendarEvent.id)}`, {
    method: "DELETE", headers: { Accept: "application/json" },
  });
  return readJsonResponse(response);
}

async function deleteCalendarQuest(quest) {
  const response = await protectedFetch(`${CALENDAR_API_URL}?resource=quest&id=${encodeURIComponent(quest.id)}`, {
    method: "DELETE", headers: { Accept: "application/json" },
  });
  return readJsonResponse(response);
}

function createCalendarItemDialog() {
  const existing = document.getElementById("calendar-item-dialog");
  if (existing) return existing;
  const dialog = document.createElement("dialog");
  dialog.id = "calendar-item-dialog";
  dialog.className = "calendar-item-dialog";
  dialog.innerHTML = `
    <article class="calendar-item-card">
      <header class="calendar-item-card-header">
        <div class="calendar-item-card-heading"><span class="calendar-item-card-emoji"></span><div><p class="section-label calendar-item-kind"></p><h2 class="calendar-item-title"></h2></div></div>
        <button type="button" class="dialog-close-button calendar-item-close" aria-label="Close">×</button>
      </header>
      <div class="calendar-item-meta"></div>
      <p class="calendar-item-description" hidden></p>
      <p class="calendar-item-dialog-status" aria-live="polite"></p>
      <footer class="calendar-item-card-actions"><button type="button" class="calendar-item-open-day">Open day</button><button type="button" class="calendar-item-delete">Delete</button></footer>
    </article>`;
  document.body.append(dialog);
  dialog.querySelector(".calendar-item-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  return dialog;
}

function openCalendarItemDialog(type, item) {
  const dialog = createCalendarItemDialog();
  const isEvent = type === "event";
  const category = isEvent ? getEventCategory(item.categoryKey) : null;
  const date = isEvent ? item.startDate : item.date;
  dialog.dataset.itemType = type;
  dialog.dataset.category = isEvent ? category.color : "quest";
  dialog.querySelector(".calendar-item-card-emoji").textContent = isEvent ? category.emoji : getQuestEmoji(item);
  dialog.querySelector(".calendar-item-kind").textContent = isEvent ? "Calendar event" : "Quest";
  dialog.querySelector(".calendar-item-title").textContent = item.title || (isEvent ? "Untitled event" : "Untitled quest");
  const metaParts = [];
  if (isEvent) {
    if (formatEventDates(item)) metaParts.push(formatEventDates(item));
    if (item.startTime) metaParts.push(item.startTime);
  } else {
    if (item.date) metaParts.push(item.date);
    if (item.difficulty) metaParts.push(item.difficulty);
    if (item.completed) metaParts.push("Completed");
  }
  dialog.querySelector(".calendar-item-meta").textContent = metaParts.join(" · ");
  const description = dialog.querySelector(".calendar-item-description");
  const descriptionText = isEvent ? item.description : item.note;
  description.textContent = descriptionText || "";
  description.hidden = !descriptionText;
  const status = dialog.querySelector(".calendar-item-dialog-status");
  status.textContent = "";
  dialog.querySelector(".calendar-item-open-day").onclick = () => {
    dialog.close();
    if (date) document.dispatchEvent(new CustomEvent("grimoire:open-day-view", { detail: { date } }));
  };
  const deleteButton = dialog.querySelector(".calendar-item-delete");
  deleteButton.textContent = isEvent ? "Delete event" : "Delete quest";
  deleteButton.onclick = async () => {
    const label = isEvent ? "event" : "quest";
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    deleteButton.disabled = true;
    status.textContent = `The House is removing this ${label}…`;
    try {
      if (isEvent) await deleteCalendarEvent(item); else await deleteCalendarQuest(item);
      dialog.close();
      document.dispatchEvent(new CustomEvent(isEvent ? "grimoire:events-changed" : "grimoire:quests-changed", { detail: { date } }));
    } catch (error) {
      console.error(`${label} deletion failed:`, error);
      status.textContent = error instanceof Error ? error.message : `The House could not delete this ${label}.`;
    } finally {
      deleteButton.disabled = false;
    }
  };
  dialog.showModal();
}

async function loadVisibleMonth() {
  if (isLoadingMonth) {
    return;
  }

  isLoadingMonth = true;

  showStatus(
    "The House is opening this month…",
  );

  try {
    const [
      questsResult,
      journalResult,
      eventsResult,
    ] =
      await Promise.allSettled([
        fetchMonthQuests(
          calendarState
            .visibleMonth,
        ),

        fetchMonthJournal(
          calendarState
            .visibleMonth,
        ),

        fetchMonthEvents(
          calendarState
            .visibleMonth,
        ),
      ]);

    if (
      questsResult.status ===
      "fulfilled"
    ) {
      calendarState
        .questsByDate =
        groupQuestsByDate(
          questsResult.value,
        );
    } else {
      console.error(
        "Quest calendar load failed:",
        questsResult.reason,
      );
    }

    if (
      journalResult.status ===
      "fulfilled"
    ) {
      calendarState
        .journalByDate =
        groupJournalByDate(
          journalResult.value,
        );
    } else {
      console.error(
        "Journal calendar load failed:",
        journalResult.reason,
      );
    }

    if (
      eventsResult.status ===
      "fulfilled"
    ) {
      calendarState.eventsError = "";
      calendarState.visibleEvents = eventsResult.value.map(normalizeEvent);

      calendarState
        .eventsByDate =
        groupEventsByDate(
          calendarState.visibleEvents,
          calendarState
            .visibleMonth,
        );
    } else {
      console.error(
        "Events calendar load failed:",
        eventsResult.reason,
      );

      calendarState
        .eventsByDate =
        new Map();
      calendarState.visibleEvents = [];

      calendarState.eventsError =
        eventsResult.reason instanceof Error
          ? eventsResult.reason.message
          : "Unknown Events error.";
    }

    renderCalendar();

    showStatus(
      calendarState.eventsError
        ? `Events: ${calendarState.eventsError}`
        : "",
    );
  } catch (error) {
    console.error(
      "Calendar load failed:",
      error,
    );

    calendarState
      .eventsByDate =
      new Map();

    renderCalendar();

    showStatus(
      "The House could not open this month yet.",
    );
  } finally {
    isLoadingMonth = false;
  }
}

async function moveMonth(offset) {
  calendarState.visibleMonth =
    new Date(
      calendarState
        .visibleMonth
        .getFullYear(),

      calendarState
        .visibleMonth
        .getMonth() +
        offset,

      1,
    );

  calendarState.selectedDate =
    null;

  await loadVisibleMonth();
}

async function goToToday() {
  const today =
    new Date();

  calendarState.visibleMonth =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

  calendarState.selectedDate =
    toDateKey(today);

  await loadVisibleMonth();
}

function ensureEventDialogStyles() {
  // Event styles are loaded from dayViewEvents.css.
}

function createEventDialog() {
  const existing =
    document.getElementById(
      "calendar-event-dialog",
    );

  if (existing) {
    return existing;
  }

  ensureEventDialogStyles();

  const dialog =
    document.createElement(
      "dialog",
    );

  dialog.id =
    "calendar-event-dialog";

  dialog.className =
    "calendar-event-dialog";

  dialog.innerHTML = `
    <form
      class="calendar-event-form"
      id="calendar-event-form"
    >
      <header class="calendar-event-dialog-header">
        <div><p class="section-label">A new plan for the House</p><h2>Add event</h2><p class="calendar-event-dialog-note">Give this moment a place in your calendar.</p></div>
        <button class="dialog-close-button calendar-event-close" type="button" aria-label="Close event window">×</button>
      </header>

      <label class="calendar-event-field">
        <span>Title</span>
        <input
          name="title"
          type="text"
          maxlength="160"
          required
          autocomplete="off"
        >
      </label>

      <label class="calendar-event-field">
        <span>Category</span>
        <select
          name="categoryKey"
          required
        >
          <option value="personal">🌿 Personal</option>
          <option value="appointment">📌 Appointment</option>
          <option value="birthday">🎂 Birthday</option>
          <option value="trip">🧳 Trip</option>
          <option value="vacation">🍃 Vacation</option>
          <option value="theatre">🎭 Theatre</option>
          <option value="other">✨ Other</option>
        </select>
      </label>

      <div class="calendar-event-date-row">
        <label class="calendar-event-field">
          <span>Start date</span>
          <input
            name="startDate"
            type="date"
            required
          >
        </label>

        <label class="calendar-event-field">
          <span>End date</span>
          <input
            name="endDate"
            type="date"
            required
          >
        </label>
      </div>

      <label class="calendar-event-field">
        <span>Start time (optional)</span>
        <input
          name="startTime"
          type="time"
        >
      </label>

      <label class="calendar-event-field">
        <span>Description (optional)</span>
        <textarea
          name="description"
          maxlength="2000"
        ></textarea>
      </label>

      <p
        class="calendar-event-form-status"
        id="calendar-event-form-status"
        aria-live="polite"
      ></p>

      <div class="calendar-event-actions">
        <button
          class="calendar-event-cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          class="calendar-event-save"
          type="submit"
        >
          Keep this event
        </button>
      </div>
    </form>
  `;

  document.body.append(dialog);

  const form =
    dialog.querySelector(
      "#calendar-event-form",
    );

  const cancelButton =
    dialog.querySelector(
      ".calendar-event-cancel",
    );

  const closeButton =
    dialog.querySelector(
      ".calendar-event-close",
    );

  const status =
    dialog.querySelector(
      "#calendar-event-form-status",
    );

  const saveButton =
    dialog.querySelector(
      ".calendar-event-save",
    );

  cancelButton?.addEventListener(
    "click",
    () => {
      dialog.close();
    },
  );

  closeButton?.addEventListener(
    "click",
    () => {
      dialog.close();
    },
  );

  dialog.addEventListener(
    "click",
    (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    },
  );

  form?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const formData =
        new FormData(form);

      const title =
        String(
          formData.get("title") ?? "",
        ).trim();

      const categoryKey =
        String(
          formData.get(
            "categoryKey",
          ) ?? "",
        ).trim();

      const startDate =
        String(
          formData.get(
            "startDate",
          ) ?? "",
        ).trim();

      const endDate =
        String(
          formData.get(
            "endDate",
          ) ?? "",
        ).trim();

      const startTime =
        String(
          formData.get(
            "startTime",
          ) ?? "",
        ).trim();

      const description =
        String(
          formData.get(
            "description",
          ) ?? "",
        );

      if (
        !title ||
        !categoryKey ||
        !startDate ||
        !endDate
      ) {
        status.textContent =
          "Please fill in the required fields.";

        return;
      }

      if (endDate < startDate) {
        status.textContent =
          "The end date cannot be earlier than the start date.";

        return;
      }

      status.textContent =
        "The House is placing this event…";

      saveButton.disabled = true;

      try {
        const response =
          await protectedFetch(
            EVENTS_API_URL,
            {
              method: "POST",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title,
                  description,
                  category_key:
                    categoryKey,
                  start_date:
                    startDate,
                  end_date:
                    endDate,
                  start_time:
                    startTime,
                }),
            },
          );

        await readJsonResponse(
          response,
        );

        dialog.close();
        form.reset();

        document.dispatchEvent(
          new CustomEvent(
            "grimoire:events-changed",
            { detail: { date: startDate } },
          ),
        );
      } catch (error) {
        console.error(
          "Event creation failed:",
          error,
        );

        status.textContent =
          error instanceof Error
            ? error.message
            : "The House could not save this event.";
      } finally {
        saveButton.disabled = false;
      }
    },
  );

  return dialog;
}

function openEventDialog(
  initialDate =
    calendarState.selectedDate ||
    toDateKey(new Date()),
) {
  const dialog =
    createEventDialog();

  const form =
    dialog.querySelector(
      "#calendar-event-form",
    );

  const startInput =
    form?.elements?.namedItem(
      "startDate",
    );

  const endInput =
    form?.elements?.namedItem(
      "endDate",
    );

  const status =
    dialog.querySelector(
      "#calendar-event-form-status",
    );

  if (
    startInput instanceof
    HTMLInputElement
  ) {
    startInput.value =
      initialDate;
  }

  if (
    endInput instanceof
    HTMLInputElement
  ) {
    endInput.value =
      initialDate;
  }

  if (status) {
    status.textContent = "";
  }

  dialog.showModal();
}

function ensureAddEventButton() {
  const existing =
    document.getElementById(
      "calendar-add-event",
    );

  if (existing) {
    return existing;
  }

  const button =
    document.createElement(
      "button",
    );

  button.id =
    "calendar-add-event";

  button.type = "button";

  button.className =
    "calendar-add-event-button";

  button.setAttribute("aria-label", "Add event");
  button.title = "Add event";
  button.innerHTML = '<span aria-hidden="true">+</span>';

  button.addEventListener(
    "click",
    () => {
      openEventDialog();
    },
  );

  const panel = elements.grid?.closest(".calendar-panel");

  if (panel) {
    panel.append(button);
  } else if (elements.room) {
    elements.room.append(button);
  }

  return button;
}

function connectEvents() {
  elements.previousButton
    ?.addEventListener(
      "click",
      async () => {
        await moveMonth(-1);
      },
    );

  elements.nextButton
    ?.addEventListener(
      "click",
      async () => {
        await moveMonth(1);
      },
    );

  elements.todayButton
    ?.addEventListener(
      "click",
      goToToday,
    );


  document.addEventListener(
    "grimoire:quests-changed",
    async () => {
      await loadVisibleMonth();
    },
  );

  document.addEventListener(
    "grimoire:journal-changed",
    async () => {
      await loadVisibleMonth();
    },
  );

  document.addEventListener(
    "grimoire:events-changed",
    async () => {
      await loadVisibleMonth();
    },
  );

  document.addEventListener(
    "grimoire:open-event-create",
    (event) => {
      openEventDialog(
        event.detail?.date ||
        calendarState.selectedDate ||
        toDateKey(new Date()),
      );
    },
  );
}

export async function openEventCreator(
  initialDate =
    toDateKey(new Date()),
) {
  await initCalendar();
  openEventDialog(initialDate);
}

export async function initCalendar() {
  if (
    isInitialized ||
    !elements.room ||
    !elements.grid
  ) {
    return;
  }

  isInitialized = true;

  connectEvents();
  ensureAddEventButton();

  const today =
    new Date();

  calendarState.selectedDate =
    toDateKey(today);

  await loadVisibleMonth();
}
