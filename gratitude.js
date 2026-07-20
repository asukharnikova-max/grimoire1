const GRATITUDE_API_URL =
  "https://functions.yandexcloud.net/d4eumehm2lk051cplv2n";

const elements = {
  input:
    document.getElementById(
      "gratitude-input",
    ),

  saved:
    document.getElementById(
      "gratitude-saved",
    ),

  list:
    document.getElementById(
      "gratitude-saved-text",
    ),

  status:
    document.getElementById(
      "gratitude-status",
    ),

  saveButton:
    document.getElementById(
      "save-gratitude-button",
    ),
};

let gratitudeItems = [];
let isLoading = false;
let isSaving = false;
let activeRequestId = null;

function getTodayKey() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function showStatus(message = "") {
  if (!elements.status) {
    return;
  }

  elements.status.textContent =
    message;
}

function setSaveButton({
  disabled,
  text,
}) {
  if (!elements.saveButton) {
    return;
  }

  elements.saveButton.disabled =
    disabled;

  elements.saveButton.textContent =
    text;
}

function normalizeItem(value) {
  const source =
    value &&
    typeof value === "object"
      ? value
      : {};

  return {
    id:
      typeof source.id === "string"
        ? source.id
        : "",

    date:
      typeof source.date === "string"
        ? source.date
        : getTodayKey(),

    text:
      typeof source.text === "string"
        ? source.text.trim()
        : "",

    createdAt:
      typeof source.createdAt ===
      "string"
        ? source.createdAt
        : null,
  };
}

function deduplicateItems(items) {
  const unique =
    new Map();

  items.forEach((item) => {
    const normalized =
      normalizeItem(item);

    if (
      !normalized.id ||
      !normalized.text
    ) {
      return;
    }

    unique.set(
      normalized.id,
      normalized,
    );
  });

  return Array.from(
    unique.values(),
  ).sort((first, second) => {
    const firstTime =
      new Date(
        first.createdAt ?? 0,
      ).getTime();

    const secondTime =
      new Date(
        second.createdAt ?? 0,
      ).getTime();

    return firstTime - secondTime;
  });
}

async function readJsonResponse(
  response,
) {
  let result;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "The House returned an unreadable response.",
    );
  }

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        "The House could not complete this request.",
    );
  }

  return result;
}

async function fetchGratitudes() {
  const url =
    `${GRATITUDE_API_URL}` +
    `?resource=gratitude` +
    `&date=${encodeURIComponent(
      getTodayKey(),
    )}`;

  const response = await window.grimoireFetch(url, {
    method: "GET",

    headers: {
      Accept: "application/json",
    },
  });

  const result =
    await readJsonResponse(
      response,
    );

  return deduplicateItems(
    Array.isArray(
      result.gratitude,
    )
      ? result.gratitude
      : [],
  );
}

async function createGratitude(text) {
  const response = await window.grimoireFetch(
    GRATITUDE_API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        resource: "gratitude",
        entry_date: getTodayKey(),
        text,
      }),
    },
  );

  return readJsonResponse(
    response,
  );
}

async function updateGratitude(
  item,
  text,
) {
  const response = await window.grimoireFetch(
    GRATITUDE_API_URL,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        resource: "gratitude",
        gratitude_id: item.id,
        entry_date: item.date,
        text,
      }),
    },
  );

  return readJsonResponse(
    response,
  );
}

async function deleteGratitude(
  item,
) {
  const url =
    `${GRATITUDE_API_URL}` +
    `?resource=gratitude` +
    `&id=${encodeURIComponent(
      item.id,
    )}`;

  const response = await window.grimoireFetch(url, {
    method: "DELETE",

    headers: {
      Accept: "application/json",
    },
  });

  return readJsonResponse(
    response,
  );
}

function closeAllMenus() {
  elements.list
    ?.querySelectorAll(
      ".gratitude-menu",
    )
    .forEach((menu) => {
      menu.hidden = true;
    });
}

function createMenuButton(
  label,
  className,
  onClick,
) {
  const button =
    document.createElement(
      "button",
    );

  button.type = "button";
  button.className = className;
  button.textContent = label;

  button.addEventListener(
    "click",
    onClick,
  );

  return button;
}

function openEditDialog(item) {
  const dialog =
    document.createElement(
      "dialog",
    );

  dialog.className =
    "gratitude-dialog";

  const form =
    document.createElement(
      "form",
    );

  form.className =
    "gratitude-edit-form";

  form.method = "dialog";

  const heading =
    document.createElement("h2");

  heading.textContent =
    "Edit gratitude";

  const textarea =
    document.createElement(
      "textarea",
    );

  textarea.value = item.text;
  textarea.rows = 4;
  textarea.maxLength = 500;
  textarea.required = true;

  const error =
    document.createElement("p");

  error.className =
    "gratitude-form-error";

  error.hidden = true;

  const actions =
    document.createElement("div");

  actions.className =
    "gratitude-dialog-actions";

  const cancelButton =
    document.createElement(
      "button",
    );

  cancelButton.type = "button";
  cancelButton.className =
    "secondary-button";

  cancelButton.textContent =
    "Leave it for now";

  cancelButton.addEventListener(
    "click",
    () => {
      dialog.close();
    },
  );

  const saveButton =
    document.createElement(
      "button",
    );

  saveButton.type = "submit";
  saveButton.className =
    "primary-button";

  saveButton.textContent =
    "Keep the change";

  actions.append(
    cancelButton,
    saveButton,
  );

  form.append(
    heading,
    textarea,
    error,
    actions,
  );

  dialog.append(form);
  document.body.append(dialog);

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const nextText =
        textarea.value.trim();

      if (!nextText) {
        error.textContent =
          "A gratitude entry needs words.";

        error.hidden = false;
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent =
        "Keeping the change…";

      try {
        await updateGratitude(
          item,
          nextText,
        );

        dialog.close();

        await loadGratitude();
      } catch (errorValue) {
        console.error(
          "Gratitude update failed:",
          errorValue,
        );

        error.textContent =
          "The House could not keep this change yet.";

        error.hidden = false;

        saveButton.disabled = false;
        saveButton.textContent =
          "Keep the change";
      }
    },
  );

  dialog.addEventListener(
    "close",
    () => {
      dialog.remove();
    },
  );

  dialog.showModal();
  textarea.focus();
  textarea.select();
}

async function handleDelete(item) {
  const confirmed =
    window.confirm(
      "Remove this gratitude?",
    );

  if (!confirmed) {
    return;
  }

  activeRequestId = item.id;
  renderGratitude();

  try {
    await deleteGratitude(item);

    gratitudeItems =
      gratitudeItems.filter(
        (entry) =>
          entry.id !== item.id,
      );

    renderGratitude();

    showStatus(
      "This bright thing has been removed.",
    );
  } catch (error) {
    console.error(
      "Gratitude delete failed:",
      error,
    );

    showStatus(
      "The House could not remove this memory yet.",
    );
  } finally {
    activeRequestId = null;
    renderGratitude();
  }
}

function createGratitudeItem(item) {
  const wrapper =
    document.createElement(
      "div",
    );

  wrapper.className =
    "gratitude-item";

  wrapper.dataset.gratitudeId =
    item.id;

  if (activeRequestId === item.id) {
    wrapper.classList.add(
      "is-working",
    );
  }

  const sparkle =
    document.createElement(
      "span",
    );

  sparkle.className =
    "gratitude-item-sparkle";

  sparkle.textContent = "✨";

  sparkle.setAttribute(
    "aria-hidden",
    "true",
  );

  const text =
    document.createElement("p");

  text.className =
    "gratitude-item-text";

  text.textContent = item.text;

  const menuWrap =
    document.createElement(
      "div",
    );

  menuWrap.className =
    "gratitude-menu-wrap";

  const menuButton =
    document.createElement(
      "button",
    );

  menuButton.type = "button";
  menuButton.className =
    "gratitude-menu-button";

  menuButton.textContent =
    "\u22ef";

  menuButton.setAttribute(
    "aria-label",
    "Open gratitude menu",
  );

  const menu =
    document.createElement(
      "div",
    );

  menu.className =
    "gratitude-menu";

  menu.hidden = true;

  const editButton =
    createMenuButton(
      "Edit",
      "gratitude-edit-button",
      () => {
        menu.hidden = true;
        openEditDialog(item);
      },
    );

  const deleteButton =
    createMenuButton(
      "Delete",
      "gratitude-delete-button",
      async () => {
        menu.hidden = true;
        await handleDelete(item);
      },
    );

  menu.append(
    editButton,
    deleteButton,
  );

  menuButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      const willOpen =
        menu.hidden;

      closeAllMenus();

      menu.hidden =
        !willOpen;
    },
  );

  menuWrap.append(
    menuButton,
    menu,
  );

  wrapper.append(
    sparkle,
    text,
    menuWrap,
  );

  return wrapper;
}

function renderGratitude() {
  if (
    !elements.saved ||
    !elements.list
  ) {
    return;
  }

  elements.saved.hidden =
    gratitudeItems.length === 0;

  elements.list.replaceChildren();

  gratitudeItems.forEach(
    (item) => {
      elements.list.append(
        createGratitudeItem(
          item,
        ),
      );
    },
  );
}

async function loadGratitude() {
  if (isLoading) {
    return;
  }

  isLoading = true;

  showStatus(
    "The House is opening its bright things…",
  );

  try {
    gratitudeItems =
      await fetchGratitudes();

    renderGratitude();
    showStatus("");
  } catch (error) {
    console.error(
      "Gratitude load failed:",
      error,
    );

    showStatus(
      "The House could not open these memories yet.",
    );
  } finally {
    isLoading = false;
  }
}

async function handleSave() {
  if (isSaving) {
    return;
  }

  const text =
    elements.input
      ?.value
      .trim() ?? "";

  if (!text) {
    showStatus(
      "There is nothing new to keep yet.",
    );

    elements.input?.focus();
    return;
  }

  isSaving = true;

  const originalText =
    elements.saveButton
      ?.textContent ||
    "Keep this memory";

  setSaveButton({
    disabled: true,
    text: "Keeping this memory…",
  });

  showStatus(
    "The House is keeping this bright thing…",
  );

  try {
    await createGratitude(text);

    elements.input.value = "";

    await loadGratitude();

    showStatus(
      "Safe in the House",
    );
  } catch (error) {
    console.error(
      "Gratitude save failed:",
      error,
    );

    showStatus(
      "The House could not keep this memory yet.",
    );
  } finally {
    isSaving = false;

    setSaveButton({
      disabled: false,
      text: originalText,
    });
  }
}

function connectEvents() {
  elements.saveButton
    ?.addEventListener(
      "click",
      handleSave,
    );

  elements.input
    ?.addEventListener(
      "input",
      () => {
        showStatus("");
      },
    );

  document.addEventListener(
    "click",
    closeAllMenus,
  );
}

export async function initGratitude() {
  if (
    !elements.input ||
    !elements.saved ||
    !elements.list ||
    !elements.saveButton
  ) {
    return;
  }

  connectEvents();

  await loadGratitude();
}
