import {
  registerDayViewCard,
} from "./dayViewCards.js";

const API_URL =
  "https://functions.yandexcloud.net/d4eumehm2lk051cplv2n";

async function readJsonResponse(
  response,
) {
  const result =
    await response.json();

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result?.error ||
      result?.message ||
      "The House could not open this journal page.",
    );
  }

  return result;
}

async function loadJournal(date) {
  const response =
    await window.grimoireFetch(
      `${API_URL}` +
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

  return (
    result.found &&
    result.entry
  )
    ? result.entry
    : null;
}

function createSignal({
  emoji,
  text,
}) {
  const signal =
    document.createElement(
      "span",
    );

  signal.className =
    "day-view-journal-signal";

  signal.textContent =
    `${emoji} ${text}`;

  return signal;
}

function createPreview(entry) {
  const preview =
    document.createElement(
      "div",
    );

  preview.className =
    "day-view-journal-preview";

  if (
    entry?.journal?.trim()
  ) {
    const text =
      document.createElement(
        "p",
      );

    text.textContent =
      entry.journal;

    preview.append(text);
  } else {
    const empty =
      document.createElement(
        "p",
      );

    empty.className =
      "day-view-empty";

    empty.textContent =
      "No words have settled here yet.";

    preview.append(empty);
  }

  const signals =
    document.createElement(
      "div",
    );

  signals.className =
    "day-view-journal-signals";

  if (entry?.mood?.emoji) {
    signals.append(
      createSignal({
        emoji:
          entry.mood.emoji,
        text:
          entry.mood.message ||
          "Mood",
      }),
    );
  }

  if (entry?.energy?.emoji) {
    signals.append(
      createSignal({
        emoji:
          entry.energy.emoji,
        text:
          entry.energy.message ||
          "Energy",
      }),
    );
  }

  if (
    Array.isArray(
      entry?.weather,
    ) &&
    entry.weather.length > 0
  ) {
    signals.append(
      createSignal({
        emoji:
          entry.weather
            .map(
              (item) =>
                item.emoji,
            )
            .join(" "),
        text:
          entry.weatherMessage ||
          "Outside",
      }),
    );
  }

  if (
    signals.childElementCount >
    0
  ) {
    preview.append(
      signals,
    );
  }

  return preview;
}

function openEditor({
  entry,
  date,
  section,
}) {
  const existing =
    section.querySelector(
      ".day-view-journal-editor",
    );

  if (existing) {
    existing
      .querySelector(
        "textarea",
      )
      ?.focus();

    return;
  }

  const editor =
    document.createElement(
      "div",
    );

  editor.className =
    "day-view-journal-editor";

  const textarea =
    document.createElement(
      "textarea",
    );

  textarea.rows = 7;
  textarea.placeholder =
    "Leave this day a few words…";

  textarea.value =
    entry?.journal || "";

  const status =
    document.createElement(
      "p",
    );

  status.className =
    "day-view-journal-editor-status";

  const actions =
    document.createElement(
      "div",
    );

  actions.className =
    "day-view-journal-editor-actions";

  const cancel =
    document.createElement(
      "button",
    );

  cancel.type = "button";
  cancel.className =
    "small-action-button";

  cancel.textContent = "Cancel";

  const save =
    document.createElement(
      "button",
    );

  save.type = "button";
  save.className =
    "small-action-button day-view-journal-save";

  save.textContent =
    "Keep this page";

  cancel.addEventListener(
    "click",
    () => {
      editor.remove();
    },
  );

  save.addEventListener(
    "click",
    async () => {
      save.disabled = true;

      status.textContent =
        "The House is keeping these words…";

      try {
        const response =
          await window.grimoireFetch(
            API_URL,
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
                  entry_date: date,
                  journal_text: textarea.value,
                  mood: entry?.mood || null,
                  energy: entry?.energy || null,
                  outside: Array.isArray(entry?.weather) ? entry.weather : [],
                  outside_message: entry?.weatherMessage || "",
                }),
            },
          );

        await readJsonResponse(
          response,
        );

        document.dispatchEvent(
          new CustomEvent(
            "grimoire:journal-changed",
            {
              detail: {
                date,
              },
            },
          ),
        );
      } catch (error) {
        console.error(
          "Journal save failed:",
          error,
        );

        status.textContent =
          error instanceof Error
            ? error.message
            : "The House could not keep this page.";
      } finally {
        save.disabled = false;
      }
    },
  );

  actions.append(
    cancel,
    save,
  );

  editor.append(
    textarea,
    status,
    actions,
  );

  section.append(
    editor,
  );

  textarea.focus();
}

function renderJournalCard(
  entry,
  date,
) {
  const section =
    document.createElement(
      "section",
    );

  section.className =
    "day-view-section day-view-journal-card";

  const header =
    document.createElement(
      "header",
    );

  header.className =
    "day-view-section-header";

  const headingWrap =
    document.createElement(
      "div",
    );

  const label =
    document.createElement(
      "p",
    );

  label.className =
    "section-label";

  label.textContent =
    "The page of this day";

  const title =
    document.createElement(
      "h3",
    );

  title.textContent =
    "Journal";

  headingWrap.append(
    label,
    title,
  );

  const action =
    document.createElement(
      "button",
    );

  action.type = "button";
  action.className =
    "small-action-button";

  action.textContent =
    entry
      ? "Edit"
      : "Add entry";

  action.addEventListener(
    "click",
    () => {
      openEditor({
        entry,
        date,
        section,
      });
    },
  );

  header.append(
    headingWrap,
    action,
  );

  section.append(
    header,
    createPreview(entry),
  );

  return section;
}

registerDayViewCard({
  id: "journal",
  order: 10,
  load: loadJournal,
  shouldShow:
    () => true,
  render:
    renderJournalCard,
});
