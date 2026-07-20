import {
  createCompletedQuestMessage,
  createQuestHouseMessage,
  getQuestCategoryDetails,
  getQuestDifficultyDetails,
  questCategoryOptions,
} from "./questMessages.js";

const API_URL =
  "https://functions.yandexcloud.net/d4eumehm2lk051cplv2n";

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
    "The House could not prepare its protected memory in time.",
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

const state = {
  quests: [],
  editingQuestId: null,
  editingQuest: null,
  dialogDate: null,
  busyQuestId: null,
  formBusy: false,
};

const elements = {
  addButton: document.getElementById("add-quest-button"),
  summary: document.getElementById("quest-summary"),
  status: document.getElementById("quest-status"),
  activeList: document.getElementById("active-quest-list"),
  emptyState: document.getElementById("quest-empty-state"),
  completedSection: document.getElementById("completed-quests-section"),
  completedList: document.getElementById("completed-quest-list"),
  completedCount: document.getElementById("completed-quest-count"),

  dialog: document.getElementById("quest-dialog"),
  dialogTitle: document.getElementById("quest-dialog-title"),
  form: document.getElementById("quest-form"),
  titleInput: document.getElementById("quest-title-input"),
  noteInput: document.getElementById("quest-note-input"),
  closeButton: document.getElementById("close-quest-dialog-button"),
  cancelButton: document.getElementById("cancel-quest-button"),
  saveButton: document.getElementById("save-quest-button"),
  error: document.getElementById("quest-form-error"),
  categorySelect: document.getElementById("quest-category-select"),
};

function hasRequiredElements() {
  return Object.entries(elements)
    .filter(([key]) => key !== "categorySelect")
    .every(([, value]) => Boolean(value));
}

function prepareQuestForm() {
  elements.titleInput.placeholder = "What needs to be done?";
  elements.noteInput.placeholder = "Anything that might help you begin.";

  const difficultyLabels = {
    micro: {
      label: "Small",
      description: "A little thing that still counts.",
    },
    regular: {
      label: "Everyday",
      description: "A clear task for an ordinary day.",
    },
    boss: {
      label: "Big",
      description: "Something that may need more room.",
    },
  };

  elements.form
    .querySelectorAll('input[name="quest-difficulty"]')
    .forEach((input) => {
      const details = difficultyLabels[input.value];
      const card = input.closest("label")?.querySelector(".difficulty-card");

      if (!details || !card) {
        return;
      }

      const label = card.querySelector("strong");
      const description = card.querySelector("small");

      if (label) {
        label.textContent = details.label;
      }

      if (description) {
        description.textContent = details.description;
      }
    });

  if (!elements.categorySelect) {
    return;
  }

  elements.categorySelect.replaceChildren();

  questCategoryOptions.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.key;
    option.textContent = `${category.emoji} ${category.label}`;
    elements.categorySelect.append(option);
  });

  elements.categorySelect.required = true;
  setSelectedCategory("general");
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSelectedDifficulty() {
  return (
    elements.form.querySelector(
      'input[name="quest-difficulty"]:checked',
    )?.value ?? "regular"
  );
}

function getSelectedCategory() {
  return elements.categorySelect?.value || "general";
}

function setSelectedCategory(categoryKey = "general") {
  if (!elements.categorySelect) {
    return;
  }

  elements.categorySelect.value = questCategoryOptions.some(
    (category) => category.key === categoryKey,
  )
    ? categoryKey
    : "general";
}

function setSelectedDifficulty(difficulty = "regular") {
  const option = elements.form.querySelector(
    `input[name="quest-difficulty"][value="${difficulty}"]`,
  );

  if (option) {
    option.checked = true;
  }
}

function setStatus(message = "") {
  elements.status.textContent = message;
}

function showFormError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function clearFormError() {
  elements.error.textContent = "";
  elements.error.hidden = true;
}

function setFormBusy(isBusy) {
  state.formBusy = isBusy;
  elements.saveButton.disabled = isBusy;
  elements.cancelButton.disabled = isBusy;
  elements.closeButton.disabled = isBusy;
  elements.addButton.disabled = isBusy;
  elements.saveButton.textContent = isBusy
    ? "Keeping this quest\u2026"
    : state.editingQuestId
      ? "Save changes"
      : "Keep this quest";
}

function getQuestById(questId) {
  return state.quests.find((quest) => quest.id === questId) ?? null;
}

function closeAllMenus() {
  document.querySelectorAll(".quest-menu").forEach((menu) => {
    menu.hidden = true;
  });
}

function resetQuestForm() {
  state.editingQuestId = null;
  state.editingQuest = null;
  state.dialogDate = null;
  elements.form.reset();
  setSelectedDifficulty("regular");
  setSelectedCategory("general");
  elements.dialogTitle.textContent = "Add a quest";
  elements.saveButton.textContent = "Keep this quest";
  clearFormError();
}

function fillQuestForm(quest) {
  state.editingQuestId = quest.id;
  state.editingQuest = quest;
  state.dialogDate =
    quest.date || getTodayDate();
  elements.titleInput.value = quest.title ?? "";
  elements.noteInput.value = quest.note ?? "";
  setSelectedDifficulty(quest.difficulty ?? "regular");
  setSelectedCategory(quest.category?.key ?? "general");
  elements.dialogTitle.textContent = "Edit this quest";
  elements.saveButton.textContent = "Save changes";
  clearFormError();
}

function openAddDialog({
  date = getTodayDate(),
} = {}) {
  resetQuestForm();
  state.dialogDate = date;
  elements.dialogTitle.textContent =
    date === getTodayDate()
      ? "Add a quest"
      : "Place something here";
  elements.dialog.showModal();

  window.requestAnimationFrame(() => {
    elements.titleInput.focus();
  });
}

function openEditDialog(quest) {
  fillQuestForm(quest);
  elements.dialog.showModal();

  window.requestAnimationFrame(() => {
    elements.titleInput.focus();
    elements.titleInput.select();
  });
}

function closeDialog() {
  if (!elements.dialog.open || state.formBusy) {
    return;
  }

  elements.dialog.close();
  resetQuestForm();
}

async function readJsonResponse(response) {
  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The House returned an unreadable response.");
  }

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        "The House could not complete this quest request.",
    );
  }

  return result;
}

async function fetchQuests() {
  const date = encodeURIComponent(getTodayDate());
  const response = await protectedFetch(
    `${API_URL}?resource=quests&date=${date}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const result = await readJsonResponse(response);
  return Array.isArray(result.quests) ? result.quests : [];
}

function buildQuestPayload({
  id = "",
  date = getTodayDate(),
  type = "quest",
  scheduledDate = "",
  title,
  note,
  difficulty,
  categoryKey = "general",
  completed = false,
  completedMessage = "",
  existingHouseMessage = "",
}) {
  const category = getQuestCategoryDetails(categoryKey);
  const houseMessage =
    existingHouseMessage ||
    createQuestHouseMessage({
      category: category.key,
      difficulty,
    });

  return {
    resource: "quest",
    quest_id: id,
    quest_date: date,
    quest_type: type,
    scheduled_date: scheduledDate,
    title,
    note,
    difficulty,
    category,
    house_message: houseMessage,
    completed,
    completed_message: completedMessage,
  };
}

async function createQuest(payload) {
  const response = await protectedFetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse(response);
}

async function updateQuest(payload) {
  const response = await protectedFetch(API_URL, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse(response);
}

async function removeQuest(questId) {
  const response = await protectedFetch(
    `${API_URL}?resource=quest&id=${encodeURIComponent(questId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return readJsonResponse(response);
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function getDifficultyLabel(difficulty) {
  return getQuestDifficultyDetails(difficulty).cardLabel;
}

function createQuestMenu(quest) {
  const wrap = document.createElement("div");
  wrap.className = "quest-menu-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "quest-menu-button";
  button.textContent = "\u22EF";
  button.setAttribute("aria-label", `More options for ${quest.title}`);

  const menu = document.createElement("div");
  menu.className = "quest-menu";
  menu.hidden = true;

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Edit";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "quest-delete-button";
  deleteButton.textContent = "Delete";

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllMenus();
    menu.hidden = !willOpen;
  });

  editButton.addEventListener("click", () => {
    closeAllMenus();
    openEditDialog(quest);
  });

  deleteButton.addEventListener("click", async () => {
    closeAllMenus();
    await handleDeleteQuest(quest);
  });

  menu.append(editButton, deleteButton);
  wrap.append(button, menu);

  return wrap;
}

function createQuestCard(quest) {
  const card = document.createElement("article");
  card.className = "quest-item";
  card.dataset.id = quest.id;
  card.dataset.difficulty = quest.difficulty || "regular";
  card.dataset.categoryColor = quest.category?.color || "neutral";

  if (quest.completed) {
    card.classList.add("is-completed");
  }

  if (state.busyQuestId === quest.id) {
    card.classList.add("is-working");
  }

  const checkButton = document.createElement("button");
  checkButton.type = "button";
  checkButton.className = "quest-check-button";
  checkButton.setAttribute(
    "aria-label",
    quest.completed
      ? `Return ${quest.title} to active quests`
      : `Complete ${quest.title}`,
  );

  checkButton.addEventListener("click", async () => {
    await handleToggleQuest(quest);
  });

  const emoji = createTextElement(
    "div",
    "quest-category-emoji",
    quest.category?.emoji || "\u2726",
  );

  const content = document.createElement("div");
  content.className = "quest-content";

  const titleRow = document.createElement("div");
  titleRow.className = "quest-title-row";

  const title = createTextElement("div", "quest-title", quest.title);
  const difficulty = createTextElement(
    "div",
    "quest-difficulty-label",
    getDifficultyLabel(quest.difficulty),
  );

  titleRow.append(title, difficulty);
  content.append(titleRow);

  if (quest.note) {
    content.append(createTextElement("p", "quest-note", quest.note));
  }

  if (quest.completed && quest.completedMessage) {
    content.append(
      createTextElement(
        "p",
        "quest-completed-message",
        quest.completedMessage,
      ),
    );
  } else if (quest.houseMessage) {
    content.append(
      createTextElement(
        "p",
        "quest-house-message",
        quest.houseMessage,
      ),
    );
  }

  card.append(checkButton, emoji, content, createQuestMenu(quest));

  return card;
}

function updateSummary() {
  const activeCount = state.quests.filter((quest) => !quest.completed).length;
  const completedCount = state.quests.length - activeCount;

  if (state.quests.length === 0) {
    elements.summary.textContent = "A fresh beginning";
    return;
  }

  if (activeCount === 0) {
    elements.summary.textContent =
      completedCount === 1 ? "1 quest completed" : `${completedCount} quests completed`;
    return;
  }

  elements.summary.textContent =
    activeCount === 1 ? "1 quest waiting" : `${activeCount} quests waiting`;
}

function renderQuestLists() {
  elements.activeList.replaceChildren();
  elements.completedList.replaceChildren();

  const active = state.quests.filter((quest) => !quest.completed);
  const completed = state.quests.filter((quest) => quest.completed);

  if (active.length === 0) {
    elements.activeList.append(elements.emptyState);
  } else {
    active.forEach((quest) => {
      elements.activeList.append(createQuestCard(quest));
    });
  }

  elements.completedSection.hidden = completed.length === 0;
  elements.completedCount.textContent = String(completed.length);

  completed.forEach((quest) => {
    elements.completedList.append(createQuestCard(quest));
  });

  updateSummary();
}

async function loadQuests() {
  setStatus("Opening today's quest board\u2026");

  try {
    state.quests = await fetchQuests();
    renderQuestLists();
    setStatus("");
  } catch (error) {
    console.error("Quest load failed:", error);
    setStatus("The House could not open today's quest board.");
  }
}

async function handleQuestSubmit(event) {
  event.preventDefault();
  clearFormError();

  const title = elements.titleInput.value.trim();
  const note = elements.noteInput.value.trim();
  const difficulty = getSelectedDifficulty();
  const categoryKey = getSelectedCategory();

  if (!title) {
    showFormError("Please give this quest a name.");
    elements.titleInput.focus();
    return;
  }

  const existingQuest =
    state.editingQuest ??
    (
      state.editingQuestId
        ? getQuestById(
            state.editingQuestId,
          )
        : null
    );

  const questDate =
    state.dialogDate ||
    existingQuest?.date ||
    getTodayDate();

  const payload = buildQuestPayload({
    id: existingQuest?.id ?? "",
    date: questDate,
    type:
      existingQuest?.type ??
      (
        questDate === getTodayDate()
          ? "quest"
          : "calendar-event"
      ),
    scheduledDate:
      existingQuest?.scheduledDate ??
      (
        questDate === getTodayDate()
          ? ""
          : questDate
      ),
    title,
    note,
    difficulty,
    categoryKey,
    completed: existingQuest?.completed ?? false,
    completedMessage: existingQuest?.completedMessage ?? "",
    existingHouseMessage:
      existingQuest &&
      existingQuest.title === title &&
      existingQuest.note === note &&
      existingQuest.difficulty === difficulty &&
      (existingQuest.category?.key ?? "general") === categoryKey
        ? existingQuest.houseMessage
        : "",
  });

  setFormBusy(true);

  try {
    if (existingQuest) {
      await updateQuest(payload);
    } else {
      await createQuest(payload);
    }

    const changedDate =
      payload.quest_date;

    elements.dialog.close();
    resetQuestForm();
    await loadQuests();

    document.dispatchEvent(
      new CustomEvent(
        "grimoire:quests-changed",
        {
          detail: {
            date: changedDate,
          },
        },
      ),
    );
  } catch (error) {
    console.error("Quest save failed:", error);
    showFormError(error.message || "The House could not keep this quest.");
  } finally {
    setFormBusy(false);
  }
}

async function handleToggleQuest(quest) {
  if (state.busyQuestId) {
    return;
  }

  state.busyQuestId = quest.id;
  renderQuestLists();

  const completed = !quest.completed;
  const completedMessage = completed
    ? createCompletedQuestMessage(quest.difficulty)
    : "";

  const payload = buildQuestPayload({
    id: quest.id,
    date:
      quest.date ||
      getTodayDate(),
    type:
      quest.type ||
      "quest",
    scheduledDate:
      quest.scheduledDate ||
      "",
    title: quest.title,
    note: quest.note,
    difficulty: quest.difficulty,
    categoryKey: quest.category?.key ?? "general",
    completed,
    completedMessage,
    existingHouseMessage: quest.houseMessage,
  });

  try {
    await updateQuest(payload);
    await loadQuests();
  } catch (error) {
    console.error("Quest update failed:", error);
    setStatus("The House could not move this quest yet.");
  } finally {
    state.busyQuestId = null;
    renderQuestLists();
  }
}

async function handleDeleteQuest(quest) {
  if (state.busyQuestId) {
    return;
  }

  state.busyQuestId = quest.id;
  renderQuestLists();

  try {
    await removeQuest(quest.id);
    await loadQuests();
  } catch (error) {
    console.error("Quest delete failed:", error);
    setStatus("The House could not remove this quest yet.");
  } finally {
    state.busyQuestId = null;
    renderQuestLists();
  }
}

function connectEvents() {
  elements.addButton.addEventListener("click", openAddDialog);
  elements.closeButton.addEventListener("click", closeDialog);
  elements.cancelButton.addEventListener("click", closeDialog);
  elements.form.addEventListener("submit", handleQuestSubmit);

  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) {
      closeDialog();
    }
  });

  elements.dialog.addEventListener("close", () => {
    if (!state.formBusy) {
      resetQuestForm();
    }
  });

  document.addEventListener("click", closeAllMenus);

  document.addEventListener(
    "grimoire:open-quest-create",
    (event) => {
      openAddDialog({
        date:
          event.detail?.date ||
          getTodayDate(),
      });
    },
  );

  document.addEventListener(
    "grimoire:open-quest-edit",
    (event) => {
      const quest =
        event.detail?.quest;

      if (quest) {
        openEditDialog(quest);
      }
    },
  );
}

async function initQuests() {
  if (!hasRequiredElements()) {
    console.error("Quest interface is incomplete. Journal was left untouched.");
    return;
  }

  prepareQuestForm();
  connectEvents();
  await loadQuests();
}

initQuests().catch((error) => {
  console.error("Quests could not start:", error);
  setStatus("The quest board is resting for now.");
});