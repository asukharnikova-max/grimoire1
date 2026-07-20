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
      "The House could not open these quests.",
    );
  }

  return result;
}

async function loadQuests(date) {
  const response =
    await window.grimoireFetch(
      `${API_URL}` +
      `?resource=quests` +
      `&date=${encodeURIComponent(
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

  return Array.isArray(
    result.quests,
  )
    ? result.quests
    : [];
}

function createQuestRow(quest) {
  const button =
    document.createElement(
      "button",
    );

  button.type = "button";
  button.className =
    "day-view-quest";

  if (quest.completed) {
    button.classList.add(
      "is-completed",
    );
  }

  const emoji =
    document.createElement(
      "span",
    );

  emoji.className =
    "day-view-quest-emoji";

  emoji.textContent =
    quest.category?.emoji ||
    "✦";

  const content =
    document.createElement(
      "span",
    );

  content.className =
    "day-view-quest-content";

  const title =
    document.createElement(
      "strong",
    );

  title.textContent =
    quest.title;

  content.append(title);

  if (quest.note) {
    const note =
      document.createElement(
        "small",
      );

    note.textContent =
      quest.note;

    content.append(note);
  }

  const arrow =
    document.createElement(
      "span",
    );

  arrow.setAttribute(
    "aria-hidden",
    "true",
  );

  arrow.textContent = "›";

  button.append(
    emoji,
    content,
    arrow,
  );

  button.addEventListener(
    "click",
    () => {
      document.dispatchEvent(
        new CustomEvent(
          "grimoire:open-quest-edit",
          {
            detail: {
              quest,
            },
          },
        ),
      );
    },
  );

  return button;
}

function renderQuests(
  quests,
  date,
) {
  const section =
    document.createElement(
      "section",
    );

  section.className =
    "day-view-section";

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
    "Things waiting here";

  const title =
    document.createElement(
      "h3",
    );

  title.textContent =
    quests.length === 1
      ? "1 quest"
      : `${quests.length} quests`;

  headingWrap.append(
    label,
    title,
  );

  const addButton =
    document.createElement(
      "button",
    );

  addButton.type = "button";
  addButton.className =
    "small-action-button";

  addButton.textContent = "Add";

  addButton.addEventListener(
    "click",
    () => {
      document.dispatchEvent(
        new CustomEvent(
          "grimoire:open-quest-create",
          {
            detail: {
              date,
            },
          },
        ),
      );
    },
  );

  header.append(
    headingWrap,
    addButton,
  );

  const list =
    document.createElement(
      "div",
    );

  list.className =
    "day-view-quests";

  if (quests.length === 0) {
    const empty =
      document.createElement(
        "p",
      );

    empty.className =
      "day-view-empty";

    empty.textContent =
      "Nothing is waiting here yet.";

    list.append(empty);
  } else {
    quests.forEach(
      (quest) => {
        list.append(
          createQuestRow(
            quest,
          ),
        );
      },
    );
  }

  section.append(
    header,
    list,
  );

  return section;
}

registerDayViewCard({
  id: "quests",
  order: 20,
  load: loadQuests,
  shouldShow:
    () => true,
  render: renderQuests,
});
