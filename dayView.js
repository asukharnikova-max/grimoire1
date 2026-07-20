import {
  loadDayViewCards,
  renderDayViewCard,
} from "./dayViewCards.js";

import "./journalDayCard.js";
import "./questsDayCard.js";
import "./eventsDayCard.js";

const state = {
  date: null,
  isLoading: false,
  reloadQueued: false,
};

const elements = {
  dialog:
    document.getElementById(
      "calendar-day-dialog",
    ),

  title:
    document.getElementById(
      "calendar-day-dialog-title",
    ),

  closeButton:
    document.getElementById(
      "calendar-day-dialog-close",
    ),

  content:
    document.getElementById(
      "calendar-day-dialog-content",
    ),
};

let isInitialized = false;

function hasRequiredElements() {
  return Object.values(elements)
    .every(Boolean);
}

function parseDateKey(value) {
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

  if (
    date.getFullYear() !== year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatLongDate(value) {
  const date =
    parseDateKey(value);

  if (!date) {
    return "Day";
  }

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

function renderLoading() {
  elements.content
    .replaceChildren();

  const message =
    document.createElement(
      "p",
    );

  message.className =
    "day-view-status";

  message.textContent =
    "The House is opening this day…";

  elements.content.append(
    message,
  );
}

function renderEmpty() {
  const message =
    document.createElement(
      "p",
    );

  message.className =
    "day-view-status";

  message.textContent =
    "This day is quiet for now.";

  elements.content
    .replaceChildren(
      message,
    );
}

async function loadDay(date) {
  if (state.isLoading) {
    state.reloadQueued = true;
    return;
  }

  state.isLoading = true;
  state.date = date;
  state.reloadQueued = false;

  elements.title.textContent =
    formatLongDate(date);

  renderLoading();

  try {
    const results =
      await loadDayViewCards(
        date,
      );

    const cards =
      results
        .map(
          (result) =>
            renderDayViewCard(
              result,
              date,
            ),
        )
        .filter(
          (card) =>
            card instanceof
            HTMLElement,
        );

    if (cards.length === 0) {
      renderEmpty();
    } else {
      elements.content
        .replaceChildren(
          ...cards,
        );
    }
  } catch (error) {
    console.error(
      "Day View load failed:",
      error,
    );

    renderEmpty();
  } finally {
    state.isLoading = false;

    if (state.reloadQueued) {
      state.reloadQueued = false;
      await loadDay(
        state.date,
      );
    }
  }
}

function closeDayView() {
  if (
    elements.dialog.open
  ) {
    elements.dialog.close();
  }
}

function shouldReload(event) {
  return (
    elements.dialog.open &&
    state.date &&
    (
      !event.detail?.date ||
      event.detail.date ===
        state.date
    )
  );
}

function connectEvents() {
  elements.closeButton
    .addEventListener(
      "click",
      closeDayView,
    );

  elements.dialog
    .addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          elements.dialog
        ) {
          closeDayView();
        }
      },
    );

  document.addEventListener(
    "grimoire:open-day-view",
    async (event) => {
      const date =
        event.detail?.date;

      if (!parseDateKey(date)) {
        return;
      }

      if (
        !elements.dialog.open
      ) {
        elements.dialog
          .show();
      }

      await loadDay(date);
    },
  );

  [
    "grimoire:quests-changed",
    "grimoire:journal-changed",
    "grimoire:events-changed",
  ].forEach(
    (eventName) => {
      document.addEventListener(
        eventName,
        async (event) => {
          if (
            shouldReload(event)
          ) {
            await loadDay(
              state.date,
            );
          }
        },
      );
    },
  );
}

export function initDayView() {
  if (
    isInitialized ||
    !hasRequiredElements()
  ) {
    return;
  }

  isInitialized = true;
  connectEvents();
}

initDayView();
