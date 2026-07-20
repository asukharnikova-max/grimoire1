import {
    randomMessage,
    createOutsideStory,
  } from "./homeMessages.js";

import {
  initGratitude,
} from "./gratitude.js";

import {
  homeCore,
} from "./homeCore.js";

import {
  libraryService,
} from "./libraryService.js";

  
  const JOURNAL_API_URL =
    "https://functions.yandexcloud.net/d4eumehm2lk051cplv2n";
  
  
  const ACCESS_KEY_STORAGE =
    "grimoire-access-key";

const STORAGE_PREFIX = "grimoire-day";
  
  const moodOptions = [
    {
      key: "joyful",
      emoji: "😊",
      label: "Bright",
    },
    {
      key: "calm",
      emoji: "😌",
      label: "Peaceful",
    },
    {
      key: "okay",
      emoji: "😐",
      label: "Somewhere in the middle",
    },
    {
      key: "tired",
      emoji: "😔",
      label: "A little heavy",
    },
    {
      key: "overwhelmed",
      emoji: "😭",
      label: "Everything at once",
    },
  ];
  
  const energyOptions = [
    {
      key: "high",
      emoji: "⚡",
      label: "Plenty to spare",
    },
    {
      key: "medium",
      emoji: "🌿",
      label: "A comfortable pace",
    },
    {
      key: "low",
      emoji: "☕",
      label: "Borrowing a little energy",
    },
    {
      key: "exhausted",
      emoji: "🪫",
      label: "Running on empty",
    },
  ];
  
  const outsideOptions = [
    {
      key: "sun",
      emoji: "☀️",
      label: "Sunlight",
    },
    {
      key: "clouds",
      emoji: "☁️",
      label: "Clouds",
    },
    {
      key: "rain",
      emoji: "🌧️",
      label: "Rain",
    },
    {
      key: "storm",
      emoji: "⛈️",
      label: "A dramatic sky",
    },
    {
      key: "snow",
      emoji: "❄️",
      label: "Snow",
    },
    {
      key: "wind",
      emoji: "🌬️",
      label: "Wind",
    },
    {
      key: "fog",
      emoji: "🌫️",
      label: "Mist and fog",
    },
    {
      key: "stars",
      emoji: "✨",
      label: "A clear night",
    },
  ];
  
  const elements = {
    todayDate:
      document.getElementById("today-date"),
  
    journalText:
      document.getElementById("journal-text"),
  
    journalStatus:
      document.getElementById("journal-status"),
  
    saveJournalButton:
      document.getElementById(
        "save-journal-button",
      ),
  
    moodButton:
      document.getElementById("mood-button"),
  
    moodEmoji:
      document.getElementById("mood-emoji"),
  
    moodMessage:
      document.getElementById("mood-message"),
  
    energyButton:
      document.getElementById("energy-button"),
  
    energyEmoji:
      document.getElementById("energy-emoji"),
  
    energyMessage:
      document.getElementById("energy-message"),
  
    weatherButton:
      document.getElementById("weather-button"),
  
    weatherEmoji:
      document.getElementById("weather-emoji"),
  
    weatherMessage:
      document.getElementById(
        "weather-message",
      ),
  };
  
  let currentJournalDate =
    getTodayKey();

  let dayState =
    createEmptyDay(
      currentJournalDate,
    );

  let isSavingToCloud = false;
  let pendingDailySignalSave = false;
  let restoreRequestId = 0;
  
  

  function getStoredAccessKey() {
    return (
      localStorage.getItem(
        ACCESS_KEY_STORAGE,
      ) ?? ""
    ).trim();
  }

  function storeAccessKey(key) {
    const cleanKey =
      typeof key === "string"
        ? key.trim()
        : "";

    if (!cleanKey) {
      return;
    }

    localStorage.setItem(
      ACCESS_KEY_STORAGE,
      cleanKey,
    );
  }

  function clearAccessKey() {
    localStorage.removeItem(
      ACCESS_KEY_STORAGE,
    );
  }

  function createAuthorizedHeaders(
    headers = {},
  ) {
    const key =
      getStoredAccessKey();

    return {
      ...headers,

      ...(key
        ? {
            "X-Grimoire-Key":
              key,
          }
        : {}),
    };
  }

  async function grimoireFetch(
    input,
    init = {},
  ) {
    const method =
      String(init.method || "GET")
        .toUpperCase();

    const requestUrl =
      typeof input === "string"
        ? input
        : input?.url ||
          "unknown URL";

    let response;

    try {
      response = await fetch(input, {
        ...init,

        headers:
          createAuthorizedHeaders(
            init.headers ?? {},
          ),
      });
    } catch (error) {
      const browserMessage =
        error instanceof Error
          ? error.message
          : "Unknown browser error";

      throw new Error(
        `${method} request could not reach ${requestUrl}. ` +
        `Browser message: ${browserMessage}. ` +
        "This usually means a wrong function URL, a CORS failure, or an unavailable Cloud Function.",
      );
    }

    if (response.status === 401) {
      clearAccessKey();

      document.dispatchEvent(
        new CustomEvent(
          "grimoire:access-denied",
        ),
      );
    }

    return response;
  }

  window.grimoireFetch =
    grimoireFetch;

  function createWelcomeDialog() {
    const existing =
      document.getElementById(
        "welcome-home-dialog",
      );

    if (existing) {
      return existing;
    }

    const dialog =
      document.createElement(
        "dialog",
      );

    dialog.id =
      "welcome-home-dialog";

    dialog.className =
      "house-window welcome-home-dialog";

    dialog.innerHTML = `
      <div class="house-window__shell">
        <header class="house-window__header">
          <div class="house-window__heading">
            <div
              class="house-window__symbol"
              aria-hidden="true"
            >
              ✦
            </div>

            <div class="house-window__titles">
              <p class="house-window__eyebrow">
                The door is listening
              </p>

              <h2 class="house-window__title">
                Welcome home.
              </h2>

              <p class="house-window__subtitle">
                The House will open for its keeper.
              </p>
            </div>
          </div>
        </header>

        <form
          class="house-window__content"
          id="welcome-home-form"
        >
          <div class="quest-form-field">
            <label for="welcome-home-key">
              Your key
            </label>

            <input
              id="welcome-home-key"
              name="access-key"
              type="password"
              autocomplete="current-password"
              placeholder="Enter the key to your House"
              required
            />
          </div>

          <p
            class="quest-form-error"
            id="welcome-home-error"
            role="alert"
            hidden
          ></p>

          <footer class="house-window__actions">
            <button
              class="primary-button"
              id="welcome-home-submit"
              type="submit"
            >
              Open the door
            </button>
          </footer>
        </form>
      </div>
    `;

    document.body.append(
      dialog,
    );

    dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
      },
    );

    return dialog;
  }

  async function validateAccessKey(
    key,
  ) {
    const response =
      await fetch(
        `${JOURNAL_API_URL}` +
          `?date=${encodeURIComponent(
            getTodayKey(),
          )}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            "X-Grimoire-Key":
              key,
          },
        },
      );

    if (response.status === 401) {
      return false;
    }

    let result;

    try {
      result =
        await response.json();
    } catch {
      throw new Error(
        "The House returned an unreadable response.",
      );
    }

    if (!response.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          "The House could not check this key.",
      );
    }

    return Boolean(result?.ok);
  }

  async function requestAccessKey() {
    const dialog =
      createWelcomeDialog();

    const form =
      dialog.querySelector(
        "#welcome-home-form",
      );

    const input =
      dialog.querySelector(
        "#welcome-home-key",
      );

    const error =
      dialog.querySelector(
        "#welcome-home-error",
      );

    const submit =
      dialog.querySelector(
        "#welcome-home-submit",
      );

    return new Promise(
      (resolve) => {
        form.onsubmit =
          async (event) => {
            event.preventDefault();

            const key =
              input.value.trim();

            if (!key) {
              error.hidden =
                false;

              error.textContent =
                "The House needs a key.";

              return;
            }

            submit.disabled =
              true;

            submit.textContent =
              "The House is listening…";

            error.hidden =
              true;

            try {
              const isValid =
                await validateAccessKey(
                  key,
                );

              if (!isValid) {
                error.hidden =
                  false;

                error.textContent =
                  "The House does not recognize this key.";

                return;
              }

              storeAccessKey(key);

              dialog.close();

              resolve(true);
            } catch (requestError) {
              console.error(
                "Access key check failed:",
                requestError,
              );

              error.hidden =
                false;

              error.textContent =
                "The House could not check the key yet.";
            } finally {
              submit.disabled =
                false;

              submit.textContent =
                "Open the door";
            }
          };

        dialog.showModal();

        window.requestAnimationFrame(
          () => {
            input.focus();
          },
        );
      },
    );
  }

  async function ensureAccess() {
    const storedKey =
      getStoredAccessKey();

    if (storedKey) {
      try {
        const isValid =
          await validateAccessKey(
            storedKey,
          );

        if (isValid) {
          return true;
        }
      } catch (error) {
        console.error(
          "Stored access key check failed:",
          error,
        );
      }

      clearAccessKey();
    }

    return requestAccessKey();
  }

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
  
  function getStorageKey(
    date = currentJournalDate,
  ) {
    return `${STORAGE_PREFIX}-${date}`;
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

    return Number.isFinite(
      date.getTime(),
    )
      ? date
      : null;
  }

  function normalizeDateKey(
    value,
  ) {
    return parseDateKey(value)
      ? value
      : getTodayKey();
  }

  function formatJournalDate(
    dateKey =
      currentJournalDate,
  ) {
    const date =
      parseDateKey(dateKey) ??
      new Date();

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

  function renderJournalDate() {
    if (!elements.todayDate) {
      return;
    }

    elements.todayDate.textContent =
      formatJournalDate();
  }
  
  function createEmptyDay(
    date =
      currentJournalDate,
  ) {
    return {
      date:
        normalizeDateKey(date),
      journal: "",
      mood: null,
      energy: null,
      weather: [],
      weatherMessage: "",
      updatedAt: null,
      cloudSavedAt: null,
    };
  }
  
  function normalizeDay(value) {
    const source =
      value &&
      typeof value === "object"
        ? value
        : {};
  
    return {
      ...createEmptyDay(
        currentJournalDate,
      ),
      ...source,

      date:
        typeof source.date === "string"
          ? normalizeDateKey(
              source.date,
            )
          : currentJournalDate,
  
      journal:
        typeof source.journal === "string"
          ? source.journal
          : "",
      mood:
        source.mood &&
        typeof source.mood === "object"
          ? source.mood
          : null,
  
      energy:
        source.energy &&
        typeof source.energy === "object"
          ? source.energy
          : null,
  
      weather: Array.isArray(
        source.weather,
      )
        ? source.weather
        : [],
  
      weatherMessage:
        typeof source.weatherMessage ===
        "string"
          ? source.weatherMessage
          : "",
  
      updatedAt:
        typeof source.updatedAt === "string"
          ? source.updatedAt
          : null,
  
      cloudSavedAt:
        typeof source.cloudSavedAt ===
        "string"
          ? source.cloudSavedAt
          : null,
    };
  }
  
  function loadLocalDay(
    date =
      currentJournalDate,
  ) {
    const savedDay =
      localStorage.getItem(
        getStorageKey(date),
      );
  
    if (!savedDay) {
      return null;
    }
  
    try {
      return normalizeDay(
        JSON.parse(savedDay),
      );
    } catch {
      return null;
    }
  }
  
  function saveCurrentStateLocally() {
    localStorage.setItem(
      getStorageKey(
        dayState.date,
      ),
      JSON.stringify(dayState),
    );
  }
  
  function collectDayFromPage() {
    return normalizeDay({
      ...dayState,
  
      date:
        currentJournalDate,
  
      journal:
        elements.journalText?.value ?? "",
      updatedAt:
        new Date().toISOString(),
    });
  }
  
  function saveDayLocally() {
    dayState = collectDayFromPage();
  
    saveCurrentStateLocally();
  
    return dayState;
  }
  
  function getTimestamp(value) {
    if (!value) {
      return 0;
    }
  
    const timestamp =
      new Date(value).getTime();
  
    return Number.isFinite(timestamp)
      ? timestamp
      : 0;
  }
  
  function hasMeaningfulDayContent(
    day,
  ) {
    if (
      !day ||
      typeof day !== "object"
    ) {
      return false;
    }

    return Boolean(
      (
        typeof day.journal ===
          "string" &&
        day.journal.trim()
      ) ||
      day.mood ||
      day.energy ||
      (
        Array.isArray(
          day.weather,
        ) &&
        day.weather.length > 0
      ) ||
      (
        typeof day.weatherMessage ===
          "string" &&
        day.weatherMessage.trim()
      )
    );
  }

  function hasUnsavedLocalChanges(
    localDay,
  ) {
    if (
      !localDay ||
      !hasMeaningfulDayContent(
        localDay,
      )
    ) {
      return false;
    }
  
    const localUpdated =
      getTimestamp(localDay.updatedAt);
  
    const localCloudSaved =
      getTimestamp(
        localDay.cloudSavedAt,
      );
  
    return (
      localUpdated > localCloudSaved
    );
  }
  
  async function fetchDayFromCloud(
    date =
      currentJournalDate,
  ) {
    const url =
      `${JOURNAL_API_URL}` +
      `?date=${encodeURIComponent(
        date,
      )}`;
  
    const response = await grimoireFetch(url, {
      method: "GET",
  
      headers: {
        Accept: "application/json",
      },
    });
  
    let result;
  
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The House returned an unreadable response.",
      );
    }
  
    if (!response.ok || !result?.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          "The House could not open its memory.",
      );
    }
  
    if (!result.found || !result.entry) {
      return null;
    }
  
    const cloudDay =
      normalizeDay(result.entry);
  
    cloudDay.cloudSavedAt =
      cloudDay.updatedAt ??
      new Date().toISOString();
  
    return cloudDay;
  }
  
  function chooseRestoredDay(
    localDay,
    cloudDay,
  ) {
    if (
      localDay &&
      hasUnsavedLocalChanges(localDay)
    ) {
      return {
        day: localDay,
        source: "local-draft",
      };
    }
  
    if (cloudDay) {
      return {
        day: cloudDay,
        source: "cloud",
      };
    }
  
    if (localDay) {
      return {
        day: localDay,
        source: "local",
      };
    }
  
    return {
      day:
        createEmptyDay(
          currentJournalDate,
        ),
      source: "empty",
    };
  }
  
  function createCloudPayload() {
    return {
      entry_date: dayState.date,
  
      journal_text: dayState.journal,
      mood: dayState.mood
        ? {
            key: dayState.mood.key,
            emoji:
              dayState.mood.emoji,
            message:
              dayState.mood.message,
          }
        : null,
  
      energy: dayState.energy
        ? {
            key:
              dayState.energy.key,
            emoji:
              dayState.energy.emoji,
            message:
              dayState.energy.message,
          }
        : null,
  
      outside: Array.isArray(
        dayState.weather,
      )
        ? dayState.weather.map(
            (item) => ({
              key: item.key,
              emoji: item.emoji,
            }),
          )
        : [],
  
      outside_message:
        dayState.weatherMessage ?? "",
    };
  }
  
  async function saveDayToCloud() {
    const response = await grimoireFetch(
      JOURNAL_API_URL,
      {
        method: "POST",
  
        headers: {
          "Content-Type":
            "application/json",
        },
  
        body: JSON.stringify(
          createCloudPayload(),
        ),
      },
    );
  
    let result;
  
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The House returned an unreadable response.",
      );
    }
  
    if (!response.ok || !result?.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          "The House could not reach its memory.",
      );
    }
  
    return result;
  }
  
  function createSelection(
    group,
    option,
  ) {
    return {
      key: option.key,
      emoji: option.emoji,
  
      message:
        randomMessage(
          group,
          option.key,
        ) || option.label,
    };
  }
  
  function renderMood() {
    if (!dayState.mood) {
      elements.moodEmoji.textContent =
        "😊";
  
      elements.moodMessage.textContent =
        "Every feeling has a place here.";
  
      return;
    }
  
    elements.moodEmoji.textContent =
      dayState.mood.emoji;
  
    elements.moodMessage.textContent =
      dayState.mood.message;
  }
  
  function renderEnergy() {
    if (!dayState.energy) {
      elements.energyEmoji.textContent =
        "🌿";
  
      elements.energyMessage.textContent =
        "The house will meet you at your pace.";
  
      return;
    }
  
    elements.energyEmoji.textContent =
      dayState.energy.emoji;
  
    elements.energyMessage.textContent =
      dayState.energy.message;
  }
  
  function resetOutsideEmojiStyle() {
    elements.weatherEmoji.style.width =
      "";
  
    elements.weatherEmoji.style.minWidth =
      "";
  
    elements.weatherEmoji.style.padding =
      "";
  
    elements.weatherEmoji.style.whiteSpace =
      "";
  }
  
  function renderOutside() {
    if (
      !Array.isArray(
        dayState.weather,
      ) ||
      dayState.weather.length === 0
    ) {
      resetOutsideEmojiStyle();
  
      elements.weatherEmoji.textContent =
        "🌤️";
  
      elements.weatherMessage.textContent =
        "The windows are waiting for today's story.";
  
      return;
    }
  
    elements.weatherEmoji.textContent =
      dayState.weather
        .map((item) => item.emoji)
        .join(" ");
  
    elements.weatherEmoji.style.width =
      "auto";
  
    elements.weatherEmoji.style.minWidth =
      "38px";
  
    elements.weatherEmoji.style.padding =
      "0 8px";
  
    elements.weatherEmoji.style.whiteSpace =
      "nowrap";
  
    elements.weatherMessage.textContent =
      dayState.weatherMessage ||
      "The view outside has found its place in today's page.";
  }
  
  function renderDailySignals() {
    renderMood();
    renderEnergy();
    renderOutside();
  }
  

  function renderDayOnPage() {
    elements.journalText.value =
      dayState.journal;
    renderDailySignals();
  }
  
  function showJournalStatus(message) {
    if (!elements.journalStatus) {
      return;
    }
  
    elements.journalStatus.textContent =
      message;
  }
  
  function formatSavedTime(value) {
    const date = new Date(value);
  
    if (
      !Number.isFinite(date.getTime())
    ) {
      return "";
    }
  
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(date);
  }
  
  function showSavedTime() {
    if (dayState.cloudSavedAt) {
      const time = formatSavedTime(
        dayState.cloudSavedAt,
      );
  
      showJournalStatus(
        time
          ? `Safe in the House at ${time}`
          : "Safe in the House",
      );
  
      return;
    }
  
    if (dayState.updatedAt) {
      const time = formatSavedTime(
        dayState.updatedAt,
      );
  
      showJournalStatus(
        time
          ? `Local draft kept at ${time}`
          : "A local draft is waiting",
      );
  
      return;
    }
  
    showJournalStatus(
      "Waiting for your words",
    );
  }
  
  async function restoreDay(
    date =
      currentJournalDate,
  ) {
    const requestedDate =
      normalizeDateKey(date);

    currentJournalDate =
      requestedDate;

    renderJournalDate();

    const requestId =
      ++restoreRequestId;

    showJournalStatus(
      requestedDate ===
      getTodayKey()
        ? "The House is opening today's page…"
        : "The House is opening this page…",
    );

    const localDay =
      loadLocalDay(
        requestedDate,
      );

    let cloudDay = null;
    let cloudUnavailable = false;

    try {
      cloudDay =
        await fetchDayFromCloud(
          requestedDate,
        );
    } catch (error) {
      cloudUnavailable = true;

      console.error(
        "Cloud journal load failed:",
        error,
      );
    }

    if (
      requestId !==
      restoreRequestId
    ) {
      return;
    }

    const restored =
      chooseRestoredDay(
        localDay,
        cloudDay,
      );

    dayState = normalizeDay({
      ...restored.day,
      date:
        requestedDate,
    });

    saveCurrentStateLocally();
    renderDayOnPage();

    if (
      restored.source ===
      "local-draft"
    ) {
      showJournalStatus(
        "Your newer local draft is waiting to be saved.",
      );

      return;
    }

    if (
      restored.source === "cloud"
    ) {
      showSavedTime();
      return;
    }

    if (
      cloudUnavailable &&
      restored.source === "local"
    ) {
      showJournalStatus(
        "The House is offline, but your local page is safe.",
      );

      return;
    }

    if (
      cloudUnavailable &&
      restored.source === "empty"
    ) {
      showJournalStatus(
        "The House is offline. A fresh local page is ready.",
      );

      return;
    }

    showSavedTime();
  }

  async function openJournalDate(
    date,
  ) {
    if (isSavingToCloud) {
      return;
    }

    const nextDate =
      normalizeDateKey(date);

    if (
      nextDate !==
      currentJournalDate
    ) {
      saveDayLocally();
    }

    await restoreDay(
      nextDate,
    );

    window.requestAnimationFrame(
      () => {
        elements.journalText?.focus();
      },
    );
  }

  function saveDraftQuietly() {
    saveDayLocally();
  
    showJournalStatus(
      "Keeping a local draft…",
    );
  }
  
  function setSaveButtonState({
    disabled,
    text,
  }) {
    if (!elements.saveJournalButton) {
      return;
    }
  
    elements.saveJournalButton.disabled =
      disabled;
  
    elements.saveJournalButton.textContent =
      text;
  }
  

  async function saveDailySignalsToCloud() {
    pendingDailySignalSave = true;

    if (isSavingToCloud) {
      return;
    }

    while (pendingDailySignalSave) {
      pendingDailySignalSave = false;
      isSavingToCloud = true;

      saveDayLocally();

      showJournalStatus(
        "The House is keeping this choice…",
      );

      try {
        await saveDayToCloud();

        const savedAt =
          new Date().toISOString();

        dayState.updatedAt = savedAt;
        dayState.cloudSavedAt = savedAt;

        saveCurrentStateLocally();
        showSavedTime();

        document.dispatchEvent(
          new CustomEvent(
            "grimoire:journal-changed",
            {
              detail: {
                date:
                  dayState.date,
              },
            },
          ),
        );
      } catch (error) {
        console.error(
          "Daily signals cloud save failed:",
          error,
        );

        showJournalStatus(
          "This choice is safe locally, but the House could not reach its memory.",
        );
      } finally {
        isSavingToCloud = false;
      }
    }
  }

  async function handleManualSave() {
    if (isSavingToCloud) {
      return;
    }
  
    isSavingToCloud = true;
  
    saveDayLocally();
  
    const originalText =
      elements.saveJournalButton
        .textContent;
  
    setSaveButtonState({
      disabled: true,
      text: "Keeping today safe…",
    });
  
    showJournalStatus(
      "The House is opening its memory…",
    );
  
    try {
      await saveDayToCloud();
  
      const savedAt =
        new Date().toISOString();
  
      dayState.updatedAt = savedAt;
      dayState.cloudSavedAt = savedAt;
  
      saveCurrentStateLocally();
      showSavedTime();

      document.dispatchEvent(
        new CustomEvent(
          "grimoire:journal-changed",
          {
            detail: {
              date:
                dayState.date,
            },
          },
        ),
      );

      setSaveButtonState({
        disabled: true,
        text: "Today is safe",
      });
  
      window.setTimeout(() => {
        setSaveButtonState({
          disabled: false,
          text: originalText,
        });
      }, 1800);
    } catch (error) {
      console.error(
        "Cloud journal save failed:",
        error,
      );
  
      showJournalStatus(
        "Your local draft is safe, but the House could not reach its memory.",
      );
  
      setSaveButtonState({
        disabled: true,
        text: "Try again",
      });
  
      window.setTimeout(() => {
        setSaveButtonState({
          disabled: false,
          text: originalText,
        });
      }, 2500);
    } finally {
      isSavingToCloud = false;

      if (pendingDailySignalSave) {
        void saveDailySignalsToCloud();
      }
    }
  }
  


  function createDialog(
    title,
    description,
  ) {
    const dialog =
      document.createElement("dialog");
  
    dialog.className =
      "home-choice-dialog";
  
    const heading =
      document.createElement("h2");
  
    heading.textContent = title;
  
    const text =
      document.createElement("p");
  
    text.textContent = description;
  
    const choices =
      document.createElement("div");
  
    choices.className =
      "home-choice-list";
  
    const actions =
      document.createElement("div");
  
    actions.className =
      "home-choice-actions";
  
    dialog.append(
      heading,
      text,
      choices,
      actions,
    );
  
    document.body.append(dialog);
  
    dialog.addEventListener(
      "click",
      (event) => {
        if (event.target === dialog) {
          dialog.close();
        }
      },
    );
  
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
      },
    );
  
    return {
      dialog,
      choices,
      actions,
    };
  }
  
  function createChoiceButton(
    option,
    selected,
  ) {
    const button =
      document.createElement("button");
  
    button.type = "button";
  
    button.className =
      "home-choice-button";
  
    button.setAttribute(
      "aria-pressed",
      String(selected),
    );
  
    const check =
      document.createElement("span");
  
    check.className =
      "home-choice-check";
  
    check.textContent =
      selected ? "✓" : "";
  
    const emoji =
      document.createElement("span");
  
    emoji.className =
      "home-choice-emoji";
  
    emoji.textContent = option.emoji;
  
    const label =
      document.createElement("span");
  
    label.textContent = option.label;
  
    button.append(
      check,
      emoji,
      label,
    );
  
    if (selected) {
      button.classList.add(
        "is-selected",
      );
    }
  
    return {
      button,
      check,
    };
  }
  
  function openSingleChoice({
    title,
    description,
    group,
    options,
    currentKey,
    onSelect,
  }) {
    const {
      dialog,
      choices,
      actions,
    } = createDialog(
      title,
      description,
    );
  
    options.forEach((option) => {
      const {
        button,
      } = createChoiceButton(
        option,
        option.key === currentKey,
      );
  
      button.addEventListener(
        "click",
        () => {
          onSelect(
            createSelection(
              group,
              option,
            ),
          );
  
          dialog.close();
        },
      );
  
      choices.append(button);
    });
  
    const closeButton =
      document.createElement("button");
  
    closeButton.type = "button";
  
    closeButton.className =
      "home-choice-cancel";
  
    closeButton.textContent =
      "Leave it for now";
  
    closeButton.addEventListener(
      "click",
      () => {
        dialog.close();
      },
    );
  
    actions.append(closeButton);
  
    dialog.showModal();
  }
  
  function markDayAsChanged() {
    dayState.cloudSavedAt = null;
  }
  
  function openMoodChoice() {
    openSingleChoice({
      title: "Mood",
  
      description:
        "Every feeling is welcome here.",
  
      group: "mood",
  
      options: moodOptions,
  
      currentKey:
        dayState.mood?.key,
  
      onSelect: (selection) => {
        dayState.mood = selection;
  
        markDayAsChanged();
        saveDayLocally();
        renderMood();

        void saveDailySignalsToCloud();
      },
    });
  }
  
  function openEnergyChoice() {
    openSingleChoice({
      title: "Energy",
  
      description:
        "The house will meet you at your pace.",
  
      group: "energy",
  
      options: energyOptions,
  
      currentKey:
        dayState.energy?.key,
  
      onSelect: (selection) => {
        dayState.energy = selection;
  
        markDayAsChanged();
        saveDayLocally();
        renderEnergy();

        void saveDailySignalsToCloud();
      },
    });
  }
  
  function openOutsideChoice() {
    const {
      dialog,
      choices,
      actions,
    } = createDialog(
      "Outside",
      "Choose everything the windows are telling us.",
    );
  
    const selectedKeys =
      new Set(
        dayState.weather.map(
          (item) => item.key,
        ),
      );
  
    outsideOptions.forEach(
      (option) => {
        const {
          button,
          check,
        } = createChoiceButton(
          option,
          selectedKeys.has(
            option.key,
          ),
        );
  
        button.addEventListener(
          "click",
          () => {
            const isSelected =
              selectedKeys.has(
                option.key,
              );
  
            if (isSelected) {
              selectedKeys.delete(
                option.key,
              );
  
              button.classList.remove(
                "is-selected",
              );
  
              button.setAttribute(
                "aria-pressed",
                "false",
              );
  
              check.textContent = "";
            } else {
              selectedKeys.add(
                option.key,
              );
  
              button.classList.add(
                "is-selected",
              );
  
              button.setAttribute(
                "aria-pressed",
                "true",
              );
  
              check.textContent = "✓";
            }
          },
        );
  
        choices.append(button);
      },
    );
  
    const cancelButton =
      document.createElement("button");
  
    cancelButton.type = "button";
  
    cancelButton.className =
      "home-choice-cancel";
  
    cancelButton.textContent =
      "Leave it for now";
  
    cancelButton.addEventListener(
      "click",
      () => {
        dialog.close();
      },
    );
  
    const saveButton =
      document.createElement("button");
  
    saveButton.type = "button";
  
    saveButton.className =
      "home-choice-save";
  
    saveButton.textContent =
      "Keep this view";
  
    saveButton.addEventListener(
      "click",
      () => {
        const selectedOptions =
          outsideOptions.filter(
            (option) => {
              return selectedKeys.has(
                option.key,
              );
            },
          );
  
        dayState.weather =
          selectedOptions.map(
            (option) => ({
              key: option.key,
              emoji: option.emoji,
            }),
          );
  
        dayState.weatherMessage =
          createOutsideStory(
            selectedOptions.map(
              (option) =>
                option.key,
            ),
          );
  
        markDayAsChanged();
        saveDayLocally();
        renderOutside();
        dialog.close();

        void saveDailySignalsToCloud();
      },
    );
  
    actions.append(
      cancelButton,
      saveButton,
    );
  
    dialog.showModal();
  }
  
  function connectEvents() {
    elements.journalText
      .addEventListener(
        "input",
        () => {
          markDayAsChanged();
          saveDraftQuietly();
        },
      );
  
    elements.saveJournalButton
      .addEventListener(
        "click",
        handleManualSave,
      );
  
    elements.moodButton
      .addEventListener(
        "click",
        openMoodChoice,
      );
  
    elements.energyButton
      .addEventListener(
        "click",
        openEnergyChoice,
      );
  
    elements.weatherButton
      .addEventListener(
        "click",
        openOutsideChoice,
      );

    document.addEventListener(
      "grimoire:open-journal",
      async (event) => {
        await openJournalDate(
          event.detail?.date,
        );
      },
    );

    document.addEventListener(
      "grimoire:access-denied",
      async () => {
        await requestAccessKey();

        window.location.reload();
      },
    );
  }
  
  async function startApp() {
    renderJournalDate();

    const hasAccess =
      await ensureAccess();

    if (!hasAccess) {
      return;
    }

    homeCore.start();

    connectEvents();

    await Promise.all([
      restoreDay(
        currentJournalDate,
      ),
      initGratitude(),
      libraryService.start()
        .catch((error) => {
          console.error(
            "Library service start failed:",
            error,
          );
        }),
    ]);
  }

  startApp();