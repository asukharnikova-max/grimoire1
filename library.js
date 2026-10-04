import { libraryService } from "./libraryService.js?v=25";

const state = {
  items: [],
  lists: [],
  dictionary: [],
  tags: [],
  filter: "all",
  initialized: false,
  activePanel: null,
  collectionSearch: "",
  collectionSort: "recent",
  dictionarySearch: "",
  dictionarySort: "recent",
  dictionaryItem: "all",
};

const elements = {
  room: document.getElementById("library-room"),
  status: document.getElementById("library-status"),
  current: document.getElementById("library-current-grid"),
  books: document.getElementById("library-books-grid"),
  lists: document.getElementById("library-reading-lists"),
  dictionary: document.getElementById("library-dictionary-preview"),
  filters: Array.from(document.querySelectorAll("[data-library-filter]")),
  addButton: document.getElementById("library-add-item-button"),
  dialog: document.getElementById("library-item-dialog"),
  form: document.getElementById("library-item-form"),
  closeButton: document.getElementById("library-item-dialog-close"),
  cancelButton: document.getElementById("library-item-cancel"),
  formStatus: document.getElementById("library-item-form-status"),
  storyDialog: document.getElementById("library-story-dialog"),
  storyDialogClose: document.getElementById("library-story-dialog-close"),
  storyDialogBody: document.getElementById("library-story-dialog-body"),
  wordDialog: document.getElementById("library-word-dialog"),
  wordDialogClose: document.getElementById("library-word-dialog-close"),
  wordDialogBody: document.getElementById("library-word-dialog-body"),
};

function getProgress(item) {
  if (!item.totalUnits) return 0;
  return Math.max(0, Math.min(100, Math.round((item.currentUnit / item.totalUnits) * 100)));
}

function isTimedItem(itemOrType) {
  const type =
    typeof itemOrType === "string"
      ? itemOrType
      : itemOrType?.type;

  return (
    type === "audiobook"
  );
}

function unitLabel(item) {
  return isTimedItem(item)
    ? "time"
    : "pages";
}

function clampTimePart(value, maximum = null) {
  const number = Math.max(
    0,
    Math.floor(Number(value || 0)),
  );

  return maximum === null
    ? number
    : Math.min(maximum, number);
}

function timePartsToSeconds(
  hours,
  minutes,
  seconds,
) {
  return (
    clampTimePart(hours) * 3600 +
    clampTimePart(minutes, 59) * 60 +
    clampTimePart(seconds, 59)
  );
}

function secondsToTimeParts(value) {
  const total = Math.max(
    0,
    Math.floor(Number(value || 0)),
  );

  return {
    hours: Math.floor(total / 3600),
    minutes:
      Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function formatClock(value) {
  const { hours, minutes, seconds } =
    secondsToTimeParts(value);

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

function formatDurationBrief(value) {
  const { hours, minutes } =
    secondsToTimeParts(value);

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}

function formatItemPosition(item, value, exact = false) {
  return isTimedItem(item)
    ? (
        exact
          ? formatClock(value)
          : formatDurationBrief(value)
      )
    : `${Number(value || 0)} pages`;
}

function createTimeFields(
  prefix,
  value,
) {
  const parts =
    secondsToTimeParts(value);

  return `
    <div class="library-time-inputs" data-time-prefix="${prefix}">
      <label>
        <span>Hours</span>
        <input type="number" min="0" name="${prefix}_hours" value="${parts.hours}" required>
      </label>
      <label>
        <span>Minutes</span>
        <input type="number" min="0" max="59" name="${prefix}_minutes" value="${parts.minutes}" required>
      </label>
      <label>
        <span>Seconds</span>
        <input type="number" min="0" max="59" name="${prefix}_seconds" value="${parts.seconds}" required>
      </label>
    </div>
  `;
}

function readTimeFromForm(data, prefix) {
  return timePartsToSeconds(
    data.get(`${prefix}_hours`),
    data.get(`${prefix}_minutes`),
    data.get(`${prefix}_seconds`),
  );
}

function pretty(value) {
  return String(value || "").replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function hasSeries(item) {
  return Boolean(String(item?.seriesName || "").trim());
}

function formatSeriesNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? String(number).replace(/\.0+$/, "")
    : "";
}

function seriesLabel(item) {
  if (!hasSeries(item)) return "Standalone";
  const number = formatSeriesNumber(item.seriesNumber);
  return number
    ? `${item.seriesName} · Book ${number}`
    : item.seriesName;
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function createCover(item) {
  const cover = document.createElement("div");
  cover.className = "library-cover";

  if (item.coverUrl) {
    const image = document.createElement("img");
    image.src = item.coverUrl;
    image.alt = `${item.title} cover`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      cover.replaceChildren(document.createTextNode(item.type === "audiobook" ? "🎧" : "📖"));
    }, { once: true });
    cover.append(image);
  } else {
    cover.textContent = item.type === "audiobook" ? "🎧" : "📖";
  }

  return cover;
}

function makeClickable(card, handler, label) {
  card.classList.add("library-clickable-card");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", label);
  card.addEventListener("click", handler);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  });
  return card;
}


function ensureLibraryLayout() {
  if (!elements.room || elements.room.dataset.libraryLayoutReady === "true") return;

  const dashboard = elements.room.querySelector(".library-dashboard");
  const mainColumn = elements.room.querySelector(".library-main-column");
  const sideColumn = elements.room.querySelector(".library-side-column");
  const currentSection = elements.current?.closest("section");
  const booksSection = elements.books?.closest("section");
  const listsSection = elements.lists?.closest("section");
  const dictionarySection = elements.dictionary?.closest("section");

  if (!dashboard || !mainColumn || !sideColumn || !currentSection || !booksSection || !listsSection || !dictionarySection) return;

  elements.room.dataset.libraryLayoutReady = "true";

  dashboard.classList.add("library-dashboard-refined");
  mainColumn.classList.add("library-current-column");
  sideColumn.classList.add("library-paths-column");

  booksSection.classList.add("library-hidden-source-section");
  listsSection.classList.add("library-hidden-source-section");
  dictionarySection.classList.add("library-hidden-source-section");
  elements.addButton?.classList.add("library-original-add-button");

  sideColumn.replaceChildren();

  const label = document.createElement("p");
  label.className = "section-label library-paths-label";
  label.textContent = "Library paths";

  sideColumn.append(
    label,
    createLibraryPathButton("🗂️", "Collections", "Browse every story in the Library.", () => openSidePanel("collections")),
    createLibraryPathButton("✦", "Add a story", "Make room for something new.", openDialog),
  );

  createSidePanel();
  injectLibraryLayoutStyles();
}

function createLibraryPathButton(icon, title, text, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "library-path-card";
  button.innerHTML = `
    <span class="library-path-icon" aria-hidden="true">${icon}</span>
    <span class="library-path-content"><strong>${title}</strong><span>${text}</span></span>
    <span class="library-path-arrow" aria-hidden="true">›</span>
  `;
  button.addEventListener("click", handler);
  return button;
}

function createSidePanel() {
  if (document.getElementById("library-side-panel")) return;

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.id = "library-side-panel-backdrop";
  backdrop.className = "library-side-panel-backdrop";
  backdrop.setAttribute("aria-label", "Close Library panel");

  const panel = document.createElement("aside");
  panel.id = "library-side-panel";
  panel.className = "library-side-panel";
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <header class="library-side-panel-header">
      <div><p class="section-label">Library</p><h2 id="library-side-panel-title"></h2></div>
      <button type="button" class="library-side-panel-close" aria-label="Close panel">×</button>
    </header>
    <div id="library-side-panel-body" class="library-side-panel-body"></div>
  `;

  document.body.append(backdrop, panel);
  backdrop.addEventListener("click", closeSidePanel);
  panel.querySelector(".library-side-panel-close")?.addEventListener("click", closeSidePanel);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.activePanel) closeSidePanel();
  });
}

function openSidePanel(panelName) {
  const panel = document.getElementById("library-side-panel");
  const backdrop = document.getElementById("library-side-panel-backdrop");
  const title = document.getElementById("library-side-panel-title");
  const body = document.getElementById("library-side-panel-body");
  if (!panel || !backdrop || !title || !body) return;

  state.activePanel = panelName;

  const panels = {
    collections: {
      title: "Collections",
      content: createCollectionsPanel,
    },
    dictionary: {
      title: "Dictionary",
      content: createDictionaryPanel,
    },
  };

  const selectedPanel = panels[panelName] || panels.collections;
  title.textContent = selectedPanel.title;
  body.replaceChildren(selectedPanel.content());
  panel.classList.add("is-open");
  backdrop.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("library-panel-open");
}

function closeSidePanel() {
  state.activePanel = null;
  document.getElementById("library-side-panel")?.classList.remove("is-open");
  document.getElementById("library-side-panel-backdrop")?.classList.remove("is-open");
  document.getElementById("library-side-panel")?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("library-panel-open");
}

function createCollectionsPanel() {
  const wrapper = document.createElement("div");
  wrapper.className = "library-panel-stack library-collections-panel library-collections-landing";

  const intro = document.createElement("section");
  intro.className = "library-collection-overview library-collections-intro";
  intro.innerHTML = `
    <div>
      <p class="section-label">Your shelves</p>
      <h3>Where the stories are.</h3>
      <p>Choose a shelf. The books can stay tucked away until you want them.</p>
    </div>
  `;

  const shelves = document.createElement("div");
  shelves.className = "library-collection-shelves";

  const definitions = [
    ["want_to_read", "🌙", "TBR", "Stories waiting for their turn."],
    ["reading", "📖", "Reading", "Stories currently open."],
    ["listening", "🎧", "Listening", "Stories in your ears."],
    ["finished", "✨", "Finished", "Stories that stayed with you."],
    ["dnf", "🍂", "DNF", "Stories you chose to leave behind."],
  ];

  definitions.forEach(([value, icon, label, description]) => {
    const count = state.items.filter((item) => item.status === value).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-collection-shelf-card";
    button.innerHTML = `
      <span class="library-collection-shelf-icon" aria-hidden="true">${icon}</span>
      <span class="library-collection-shelf-copy">
        <strong>${label}</strong>
        <span>${description}</span>
      </span>
      <span class="library-collection-shelf-count">${count}</span>
      <span class="library-collection-shelf-arrow" aria-hidden="true">›</span>
    `;
    button.addEventListener("click", () => openCollectionShelf(value, label));
    shelves.append(button);
  });

  wrapper.append(intro, shelves);
  return wrapper;
}

function openCollectionShelf(filter, label) {
  const body = document.getElementById("library-side-panel-body");
  const title = document.getElementById("library-side-panel-title");
  if (!body || !title) return;

  state.filter = filter;
  state.collectionSearch = "";
  title.textContent = label;
  body.replaceChildren(createCollectionShelfPanel(label));
}

function createCollectionShelfPanel(label) {
  const wrapper = document.createElement("div");
  wrapper.className = "library-panel-stack library-collection-shelf-panel";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "library-collection-back";
  back.textContent = "‹ All collections";
  back.addEventListener("click", () => {
    const body = document.getElementById("library-side-panel-body");
    const title = document.getElementById("library-side-panel-title");
    if (!body || !title) return;
    title.textContent = "Collections";
    body.replaceChildren(createCollectionsPanel());
  });

  const searchWrap = document.createElement("label");
  searchWrap.className = "library-collection-search";
  searchWrap.innerHTML = '<span aria-hidden="true">⌕</span>';
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = `Search ${label.toLowerCase()}`;
  search.setAttribute("aria-label", `Search ${label} collection`);
  searchWrap.append(search);

  const heading = document.createElement("div");
  heading.className = "library-panel-section-heading";
  const headingTitle = document.createElement("h3");
  headingTitle.textContent = label;
  const count = document.createElement("span");
  heading.append(headingTitle, count);

  const items = document.createElement("div");
  items.className = "library-panel-books";

  search.addEventListener("input", () => {
    state.collectionSearch = search.value;
    renderCollectionItems(items, count);
  });

  renderCollectionItems(items, count);
  wrapper.append(back, searchWrap, heading, items);
  return wrapper;
}

function getVisibleCollectionItems() {
  const query = state.collectionSearch.trim().toLowerCase();
  const visible = state.items.filter((item) => {
    if (!matchesFilter(item)) return false;
    if (!query) return true;
    return `${item.title} ${item.author} ${item.seriesName || ""}`.toLowerCase().includes(query);
  });

  return visible.sort((a, b) => {
    if (state.collectionSort === "title") {
      return String(a.title).localeCompare(String(b.title));
    }

    if (state.collectionSort === "author") {
      return String(a.author).localeCompare(String(b.author));
    }

    if (state.collectionSort === "progress") {
      return getProgress(b) - getProgress(a);
    }

    if (
      state.collectionSort === "series" ||
      state.collectionSort === "series_order"
    ) {
      const aHasSeries = hasSeries(a);
      const bHasSeries = hasSeries(b);

      if (aHasSeries !== bHasSeries) {
        return aHasSeries ? -1 : 1;
      }

      if (aHasSeries && bHasSeries) {
        const seriesCompare =
          String(a.seriesName).localeCompare(
            String(b.seriesName),
          );

        if (seriesCompare) return seriesCompare;

        const numberCompare =
          Number(a.seriesNumber || 0) -
          Number(b.seriesNumber || 0);

        if (numberCompare) return numberCompare;
      }

      return String(a.title).localeCompare(
        String(b.title),
      );
    }

    return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
  });
}

function renderCollectionCard(item) {
  const card = document.createElement("article");
  card.className = "library-collection-card";
  card.append(createCover(item));

  const content = document.createElement("div");
  content.className = "library-collection-card-content";

  const top = document.createElement("div");
  top.className = "library-collection-card-top";
  const type = document.createElement("span");
  type.className = "library-collection-type";
  type.textContent = pretty(item.type);
  const status = document.createElement("span");
  status.className = "library-collection-status";
  status.textContent = pretty(item.status);
  top.append(type, status);

  const title = document.createElement("h4");
  title.textContent = item.title;
  const author = document.createElement("p");
  author.className = "library-card-author";
  author.textContent = item.author || "Unknown author";

  content.append(top, title, author);

  const series = document.createElement("p");
  series.className = "library-card-series";
  series.textContent = seriesLabel(item);
  content.append(series);

  if (item.totalUnits > 0 && item.currentUnit > 0) {
    const progress = document.createElement("div");
    progress.className = "library-collection-progress";
    const track = document.createElement("span");
    const fill = document.createElement("span");
    fill.style.width = `${getProgress(item)}%`;
    track.append(fill);
    const label = document.createElement("small");
    label.textContent = `${getProgress(item)}%`;
    progress.append(track, label);
    content.append(progress);
  }

  card.append(content);
  return makeClickable(card, () => openStoryCard(item), `Open ${item.title}`);
}

function renderCollectionItems(container, countElement = null) {
  container.replaceChildren();
  const visible = getVisibleCollectionItems();
  if (countElement) countElement.textContent = String(visible.length);

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "library-empty-card library-collection-empty";
    empty.textContent = state.items.length
      ? "Nothing matches this shelf yet."
      : "Your Library is waiting for its first story.";
    container.append(empty);
    return;
  }

  visible.forEach((item) => container.append(renderCollectionCard(item)));
}

function renderCollectionLists(container) {
  container.replaceChildren();
  if (!state.lists.length) {
    const empty = document.createElement("article");
    empty.className = "library-small-card library-list-card";
    empty.innerHTML = "<strong>No reading lists yet.</strong><p>Collections with their own purpose will appear here.</p>";
    container.append(empty);
    return;
  }

  state.lists.forEach((list) => {
    const card = document.createElement("article");
    card.className = "library-list-card";
    const icon = document.createElement("span");
    icon.className = "library-list-icon";
    icon.textContent = "✦";
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = list.name;
    const text = document.createElement("p");
    text.textContent = list.description || "A shelf with its own purpose.";
    content.append(title, text);
    card.append(icon, content);
    container.append(card);
  });
}

function createDictionaryPanel() {
  const wrapper = document.createElement("div");
  wrapper.className = "library-panel-stack library-dictionary-panel";

  const overview = document.createElement("section");
  overview.className = "library-dictionary-overview";
  const overviewText = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "section-label";
  eyebrow.textContent = "Words kept by the House";
  const heading = document.createElement("h3");
  heading.textContent = `${state.dictionary.length} ${state.dictionary.length === 1 ? "word" : "words"} gathered`;
  const intro = document.createElement("p");
  intro.textContent = "Search the words you met, return to their stories, and remember where each one found you.";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "library-collection-add library-dictionary-add";
  addButton.textContent = "+ Add a word";
  addButton.addEventListener("click", openDictionaryAddDialog);

  overviewText.append(eyebrow, heading, intro);
  overview.append(overviewText, addButton);

  const toolbar = document.createElement("div");
  toolbar.className = "library-dictionary-toolbar";

  const searchWrap = document.createElement("label");
  searchWrap.className = "library-collection-search library-dictionary-search";
  searchWrap.innerHTML = '<span aria-hidden="true">⌕</span>';
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search word, meaning or story";
  search.value = state.dictionarySearch;
  search.setAttribute("aria-label", "Search dictionary");
  searchWrap.append(search);

  const storyFilter = document.createElement("select");
  storyFilter.className = "library-collection-sort library-dictionary-story-filter";
  storyFilter.setAttribute("aria-label", "Filter dictionary by story");
  const allStories = document.createElement("option");
  allStories.value = "all";
  allStories.textContent = "All stories";
  storyFilter.append(allStories);

  getDictionaryStories().forEach((story) => {
    const option = document.createElement("option");
    option.value = story.id;
    option.textContent = story.title;
    option.selected = state.dictionaryItem === story.id;
    storyFilter.append(option);
  });

  const sort = document.createElement("select");
  sort.className = "library-collection-sort library-dictionary-sort";
  sort.setAttribute("aria-label", "Sort dictionary");
  [["recent", "Recently gathered"], ["word", "Word A–Z"], ["story", "By story"]]
    .forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = state.dictionarySort === value;
      sort.append(option);
    });

  toolbar.append(searchWrap, storyFilter, sort);

  const sectionHeading = document.createElement("div");
  sectionHeading.className = "library-panel-section-heading";
  const wordsTitle = document.createElement("h3");
  wordsTitle.textContent = "Collected words";
  const count = document.createElement("span");
  sectionHeading.append(wordsTitle, count);

  const list = document.createElement("div");
  list.className = "library-panel-dictionary library-dictionary-list";

  const rerender = () => renderDictionaryPanelEntries(list, count);
  search.addEventListener("input", () => {
    state.dictionarySearch = search.value;
    rerender();
  });
  storyFilter.addEventListener("change", () => {
    state.dictionaryItem = storyFilter.value;
    rerender();
  });
  sort.addEventListener("change", () => {
    state.dictionarySort = sort.value;
    rerender();
  });

  renderDictionaryPanelEntries(list, count);
  wrapper.append(overview, toolbar, sectionHeading, list);
  return wrapper;
}


function ensureDictionaryAddDialog() {
  let dialog = document.getElementById("library-dictionary-add-dialog");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = "library-dictionary-add-dialog";
  dialog.className = "library-dialog library-dictionary-add-dialog";
  dialog.innerHTML = `
    <form class="library-dictionary-add-form" id="library-dictionary-add-form">
      <header class="library-dictionary-add-header">
        <div class="library-dictionary-add-heading">
          <span class="library-dictionary-add-icon" aria-hidden="true">✦</span>
          <div>
            <p class="section-label">Dictionary</p>
            <h2>Add a word</h2>
            <p class="library-dictionary-add-subtitle">Keep a word the House should remember.</p>
          </div>
        </div>
        <button type="button" class="library-side-panel-close" id="library-dictionary-add-close" aria-label="Close">×</button>
      </header>

      <div class="library-dictionary-add-fields">
        <label class="library-form-field">
          <span>Word</span>
          <input name="word" type="text" autocomplete="off" required maxlength="160" placeholder="A word worth keeping">
        </label>
        <label class="library-form-field">
          <span>Meaning</span>
          <textarea name="meaning" rows="3" placeholder="What it means"></textarea>
        </label>
        <label class="library-form-field">
          <span>Note</span>
          <textarea name="note" rows="3" placeholder="Why you want to remember it"></textarea>
        </label>
      </div>

      <p class="library-item-form-status" id="library-dictionary-add-status" aria-live="polite"></p>
      <footer class="library-dictionary-add-actions">
        <button type="button" class="library-secondary-button" id="library-dictionary-add-cancel">Cancel</button>
        <button type="submit" class="library-primary-button">Keep this word</button>
      </footer>
    </form>
  `;

  document.body.append(dialog);
  const form = dialog.querySelector("#library-dictionary-add-form");
  const close = () => dialog.close();
  dialog.querySelector("#library-dictionary-add-close")?.addEventListener("click", close);
  dialog.querySelector("#library-dictionary-add-cancel")?.addEventListener("click", close);
  form?.addEventListener("submit", submitDictionaryWord);
  return dialog;
}

function openDictionaryAddDialog() {
  const dialog = ensureDictionaryAddDialog();
  const form = dialog.querySelector("#library-dictionary-add-form");
  const status = dialog.querySelector("#library-dictionary-add-status");
  form?.reset();
  if (status) status.textContent = "";
  dialog.showModal();
  requestAnimationFrame(() => form?.elements?.word?.focus());
}

async function submitDictionaryWord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector("#library-dictionary-add-status");
  const submit = form.querySelector('button[type="submit"]');
  const data = new FormData(form);

  if (status) status.textContent = "The Library is keeping this word…";
  if (submit) submit.disabled = true;

  try {
    await libraryService.createDictionaryEntry({
      word: data.get("word"),
      meaning: data.get("meaning"),
      note: data.get("note"),
    });

    const dictionary = await libraryService.getDictionary();
    state.dictionary = Array.isArray(dictionary) ? dictionary : [];
    renderDictionary();
    form.closest("dialog")?.close();
    openSidePanel("dictionary");
  } catch (error) {
    if (status) {
      status.textContent = error instanceof Error
        ? error.message
        : "The Library could not keep this word.";
    }
  } finally {
    if (submit) submit.disabled = false;
  }
}

function getDictionaryStories() {
  const stories = new Map();
  state.dictionary.forEach((entry) => {
    (Array.isArray(entry.contexts) ? entry.contexts : []).forEach((context) => {
      const item = context.item;
      if (item?.id && item?.title) stories.set(item.id, item);
    });
  });
  return Array.from(stories.values()).sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

function getEntryLatestContext(entry) {
  const contexts = Array.isArray(entry.contexts) ? entry.contexts : [];
  return contexts.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null;
}

function getVisibleDictionaryEntries() {
  const query = state.dictionarySearch.trim().toLowerCase();
  const visible = state.dictionary.filter((entry) => {
    const contexts = Array.isArray(entry.contexts) ? entry.contexts : [];
    const matchesStory = state.dictionaryItem === "all" || contexts.some((context) => context.item?.id === state.dictionaryItem);
    if (!matchesStory) return false;
    if (!query) return true;
    const stories = contexts.map((context) => `${context.item?.title || ""} ${context.item?.author || ""}`).join(" ");
    return `${entry.word || ""} ${entry.meaning || ""} ${entry.note || ""} ${stories}`.toLowerCase().includes(query);
  });

  return visible.sort((a, b) => {
    if (state.dictionarySort === "word") return String(a.word).localeCompare(String(b.word));
    if (state.dictionarySort === "story") {
      const aStory = getEntryLatestContext(a)?.item?.title || "";
      const bStory = getEntryLatestContext(b)?.item?.title || "";
      return aStory.localeCompare(bStory) || String(a.word).localeCompare(String(b.word));
    }
    const aDate = getEntryLatestContext(a)?.date || a.createdAt || 0;
    const bDate = getEntryLatestContext(b)?.date || b.createdAt || 0;
    return new Date(bDate) - new Date(aDate);
  });
}

function renderDictionaryPanelEntries(container, countElement = null) {
  container.replaceChildren();
  const visible = getVisibleDictionaryEntries();
  if (countElement) countElement.textContent = String(visible.length);

  if (!state.dictionary.length) {
    const empty = document.createElement("article");
    empty.className = "library-small-card library-dictionary-empty";
    empty.innerHTML = "<strong>No words collected yet.</strong><p>Words saved from reading logs will live here.</p>";
    container.append(empty);
    return;
  }

  if (!visible.length) {
    const empty = document.createElement("article");
    empty.className = "library-small-card library-dictionary-empty";
    empty.innerHTML = "<strong>No word matches this search.</strong><p>Try another word, meaning, or story.</p>";
    container.append(empty);
    return;
  }

  visible.forEach((entry) => container.append(renderDictionaryEntryCard(entry)));
}

function renderDictionaryEntryCard(entry) {
  const card = document.createElement("article");
  card.className = "library-dictionary-card";
  const context = getEntryLatestContext(entry);

  const top = document.createElement("div");
  top.className = "library-dictionary-card-top";
  const word = document.createElement("h4");
  word.textContent = entry.word;
  const date = document.createElement("span");
  date.textContent = context?.date ? formatDate(context.date) : "Date not recorded";
  top.append(word, date);

  const meaning = document.createElement("p");
  meaning.className = "library-dictionary-card-meaning";
  meaning.textContent = entry.meaning || "No meaning has been written yet.";

  const source = document.createElement("div");
  source.className = "library-dictionary-source";
  const story = document.createElement("strong");
  story.textContent = context?.item?.title || "Unknown story";
  const meta = document.createElement("span");
  const parts = [context?.item?.author, context?.place].filter(Boolean);
  meta.textContent = parts.join(" · ") || "Reading context kept";
  source.append(story, meta);

  if (context?.readingNote) {
    const quote = document.createElement("p");
    quote.className = "library-dictionary-context-preview";
    quote.textContent = context.readingNote;
    card.append(top, meaning, source, quote);
  } else {
    card.append(top, meaning, source);
  }

  return makeClickable(card, () => openWordCard(entry), `Open word ${entry.word}`);
}

function injectLibraryLayoutStyles() {
  if (document.getElementById("library-layout-styles")) return;
  const style = document.createElement("style");
  style.id = "library-layout-styles";
  style.textContent = `
    .library-dashboard.library-dashboard-refined{grid-template-columns:minmax(0,1fr) 320px;gap:2rem;width:100%}
    .library-current-column{min-width:0;width:100%}.library-current-column>section{margin:0;width:100%}
    .library-paths-column{display:grid;gap:.75rem;align-content:start;position:sticky;top:1rem}.library-paths-label{margin:0 0 .1rem}
    .library-path-card{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.75rem;align-items:center;padding:.9rem;border:1px solid rgba(103,76,49,.22);border-radius:1rem;background:rgba(248,242,229,.62);color:inherit;text-align:left;box-shadow:0 10px 30px rgba(35,28,20,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);cursor:pointer}
    .library-path-card:hover,.library-path-card:focus-visible{transform:translateY(-1px);border-color:rgba(103,76,49,.38);background:rgba(251,247,237,.74)}
    .library-path-icon{display:grid;place-items:center;width:2.35rem;height:2.35rem;border-radius:.8rem;background:rgba(88,94,63,.13);font-size:1.15rem}
    .library-path-content{display:grid;gap:.16rem;min-width:0}.library-path-content strong{font-size:.98rem}.library-path-content span{font-size:.78rem;line-height:1.35;opacity:.72}.library-path-arrow{font-size:1.4rem;opacity:.55}
    .library-hidden-source-section,.library-original-add-button{display:none!important}
    .library-side-panel-backdrop{position:fixed;inset:0;z-index:1090;border:0;padding:0;background:rgba(20,16,12,.26);opacity:0;pointer-events:none;transition:opacity 180ms ease}.library-side-panel-backdrop.is-open{opacity:1;pointer-events:auto}
    .library-side-panel{position:fixed;z-index:1100;top:0;right:0;width:min(92vw,620px);height:100dvh;display:grid;grid-template-rows:auto minmax(0,1fr);border-left:1px solid rgba(103,76,49,.24);background:rgba(244,237,222,.94);box-shadow:-18px 0 60px rgba(25,20,16,.2);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);transform:translateX(104%);transition:transform 220ms ease}.library-side-panel.is-open{transform:translateX(0)}
    .library-side-panel-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.15rem 1.2rem .9rem;border-bottom:1px solid rgba(103,76,49,.16)}.library-side-panel-header h2{margin:.2rem 0 0}.library-side-panel-close{width:2.35rem;height:2.35rem;border:1px solid rgba(103,76,49,.22);border-radius:999px;background:rgba(255,255,255,.34);color:inherit;font-size:1.45rem;line-height:1;cursor:pointer}
    .library-side-panel-body{min-height:0;overflow-y:auto;padding:1rem 1.2rem 2rem}.library-panel-stack{display:grid;gap:1rem}.library-panel-stack>h3{margin:.4rem 0 -.2rem}.library-panel-intro{margin:0;opacity:.74;line-height:1.5}
    .library-panel-filters{display:flex;gap:.45rem;overflow-x:auto;padding-bottom:.25rem;scrollbar-width:thin}.library-panel-filter{flex:0 0 auto;border:1px solid rgba(103,76,49,.2);border-radius:999px;padding:.48rem .72rem;background:rgba(255,255,255,.28);color:inherit;cursor:pointer}.library-panel-filter.is-active{background:rgba(78,83,55,.16);border-color:rgba(78,83,55,.34)}
    .library-panel-books,.library-panel-lists,.library-panel-dictionary{display:grid;gap:.8rem}.library-panel-books{grid-template-columns:repeat(2,minmax(0,1fr))}
    .library-collection-overview{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;padding:1rem;border:1px solid rgba(103,76,49,.16);border-radius:1rem;background:rgba(255,255,255,.24)}.library-collection-overview h3{margin:.12rem 0 .2rem;font-size:1.25rem}.library-collection-overview p{margin:0;line-height:1.45;opacity:.72}.library-collection-add{flex:0 0 auto;border:1px solid rgba(78,83,55,.3);border-radius:999px;padding:.55rem .8rem;background:rgba(78,83,55,.12);color:inherit;font-weight:700;cursor:pointer}
    .library-collection-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem}.library-collection-search{display:flex;align-items:center;gap:.5rem;border:1px solid rgba(103,76,49,.18);border-radius:.85rem;padding:.62rem .75rem;background:rgba(255,255,255,.28)}.library-collection-search input{width:100%;border:0;outline:0;background:transparent;color:inherit;font:inherit}.library-collection-sort{border:1px solid rgba(103,76,49,.18);border-radius:.85rem;padding:.62rem .75rem;background:rgba(255,255,255,.28);color:inherit}.library-card-series,.library-detail-series{margin:.15rem 0 0;font-size:.72rem;font-weight:700;letter-spacing:.02em;color:#6f5c68;opacity:.82}.library-series-form{grid-template-columns:1fr 1fr}.library-series-form label:first-child,.library-series-form button,.library-series-form .library-action-status{grid-column:1/-1}.library-series-form [hidden]{display:none!important}@media(max-width:700px){.library-series-form{grid-template-columns:1fr}}
    .library-panel-section-heading{display:flex;justify-content:space-between;align-items:baseline;gap:1rem}.library-panel-section-heading h3{margin:.35rem 0 -.2rem}.library-panel-section-heading span{font-size:.78rem;opacity:.58}
    .library-collection-card{display:grid;grid-template-columns:72px minmax(0,1fr);gap:.8rem;align-items:stretch;padding:.75rem;border:1px solid rgba(103,76,49,.16);border-radius:1rem;background:rgba(255,255,255,.3);min-width:0}.library-collection-card .library-cover{width:72px;min-width:72px;height:96px;border-radius:.72rem}.library-collection-card-content{display:grid;align-content:start;gap:.25rem;min-width:0}.library-collection-card-top{display:flex;justify-content:space-between;gap:.5rem;align-items:center}.library-collection-type,.library-collection-status{font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;opacity:.62}.library-collection-card h4{margin:.12rem 0 0;font-size:1rem;line-height:1.2}.library-collection-progress{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;align-items:center;margin-top:.35rem}.library-collection-progress>span{height:.3rem;border-radius:999px;background:rgba(86,71,62,.12);overflow:hidden}.library-collection-progress>span>span{display:block;height:100%;border-radius:inherit;background:rgba(95,103,68,.55)}.library-collection-progress small{font-size:.68rem;opacity:.65}
    .library-list-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.75rem;align-items:start;padding:.85rem;border:1px solid rgba(103,76,49,.15);border-radius:1rem;background:rgba(255,255,255,.24)}.library-list-icon{display:grid;place-items:center;width:2rem;height:2rem;border-radius:.7rem;background:rgba(88,94,63,.12)}.library-list-card p{margin:.2rem 0 0;opacity:.7;line-height:1.4}.library-collection-empty{grid-column:1/-1}
    .library-reading-lists-overview{align-items:center}.library-reading-list-create:disabled{opacity:.58;cursor:not-allowed}.library-reading-lists-grid{display:grid;gap:.8rem}.library-reading-lists-empty{min-height:5.5rem;align-items:center}
    .library-dictionary-overview{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1rem;align-items:center;padding:1rem;border:1px solid rgba(103,76,49,.16);border-radius:1rem;background:rgba(255,255,255,.24)}.library-dictionary-add{justify-self:end}.library-dictionary-add-dialog{width:min(92vw,560px);max-width:560px;padding:0;border:1px solid rgba(121,94,65,.28);border-radius:1.35rem;background:rgba(239,229,210,.94);color:inherit;box-shadow:0 30px 90px rgba(27,20,14,.34);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);overflow:hidden}.library-dictionary-add-dialog::backdrop{background:rgba(18,14,11,.42);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}.library-dictionary-add-form{display:grid;gap:0;padding:0}.library-dictionary-add-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.25rem 1.35rem 1.05rem;border-bottom:1px solid rgba(103,76,49,.14);background:linear-gradient(135deg,rgba(255,255,255,.28),rgba(91,99,68,.07))}.library-dictionary-add-heading{display:flex;gap:.85rem;align-items:flex-start}.library-dictionary-add-icon{display:grid;place-items:center;width:2.65rem;height:2.65rem;flex:0 0 auto;border:1px solid rgba(95,103,68,.22);border-radius:.9rem;background:rgba(95,103,68,.12);font-size:1.15rem}.library-dictionary-add-header h2{margin:.15rem 0 0}.library-dictionary-add-subtitle{margin:.25rem 0 0;font-size:.8rem;line-height:1.4;opacity:.66}.library-dictionary-add-fields{display:grid;gap:.95rem;padding:1.2rem 1.35rem}.library-form-field{display:grid;gap:.4rem}.library-form-field>span{font-size:.75rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;opacity:.72}.library-dictionary-add-form input,.library-dictionary-add-form textarea{width:100%;box-sizing:border-box;border:1px solid rgba(103,76,49,.2);border-radius:.9rem;padding:.8rem .9rem;background:rgba(255,255,255,.38);color:inherit;font:inherit;outline:none;transition:border-color 160ms ease,background 160ms ease,box-shadow 160ms ease}.library-dictionary-add-form textarea{resize:vertical;min-height:88px}.library-dictionary-add-form input:focus,.library-dictionary-add-form textarea:focus{border-color:rgba(95,103,68,.5);background:rgba(255,255,255,.5);box-shadow:0 0 0 3px rgba(95,103,68,.1)}.library-dictionary-add-form .library-item-form-status{min-height:1.2rem;margin:0;padding:0 1.35rem;font-size:.78rem;opacity:.72}.library-dictionary-add-actions{display:flex;justify-content:flex-end;gap:.65rem;padding:1rem 1.35rem 1.2rem;border-top:1px solid rgba(103,76,49,.12);background:rgba(255,255,255,.12)}.library-dictionary-add-actions button{border-radius:999px;padding:.68rem 1.05rem;font:inherit;font-weight:700;cursor:pointer}.library-primary-button{border:1px solid rgba(78,83,55,.35);background:rgba(78,83,55,.18);color:inherit}.library-primary-button:hover,.library-primary-button:focus-visible{background:rgba(78,83,55,.26)}.library-secondary-button{border:1px solid rgba(103,76,49,.22);background:rgba(255,255,255,.28);color:inherit}.library-dictionary-overview h3{margin:.12rem 0 .2rem;font-size:1.25rem}.library-dictionary-overview p{margin:0;line-height:1.45;opacity:.72}
    .library-dictionary-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:.65rem}.library-dictionary-list{grid-template-columns:1fr}.library-dictionary-card{display:grid;gap:.55rem;padding:.9rem 1rem;border:1px solid rgba(103,76,49,.16);border-radius:1rem;background:rgba(255,255,255,.3)}.library-dictionary-card-top{display:flex;justify-content:space-between;align-items:baseline;gap:1rem}.library-dictionary-card h4{margin:0;font-size:1.08rem}.library-dictionary-card-top span{flex:0 0 auto;font-size:.68rem;opacity:.56}.library-dictionary-card-meaning{margin:0;line-height:1.45}.library-dictionary-source{display:grid;gap:.1rem;padding-top:.45rem;border-top:1px solid rgba(103,76,49,.12)}.library-dictionary-source strong{font-size:.78rem}.library-dictionary-source span{font-size:.72rem;opacity:.66}.library-dictionary-context-preview{margin:0;padding:.55rem .7rem;border-left:2px solid rgba(95,103,68,.35);background:rgba(95,103,68,.06);font-size:.78rem;line-height:1.45;opacity:.82}.library-dictionary-empty{grid-column:1/-1}
    #library-story-dialog{width:min(92vw,900px);max-width:900px}#library-story-dialog-body{width:100%;max-width:none;box-sizing:border-box}.library-story-workspace{display:grid;gap:1rem;width:100%;max-width:none;box-sizing:border-box}.library-story-heading{min-width:0}.library-story-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;width:100%}.library-story-action-card{display:grid;align-content:start;gap:.8rem;padding:1rem;border:1px solid rgba(103,76,49,.16);border-radius:1rem;background:rgba(255,255,255,.26)}.library-story-action-card>header h3{margin:0;font-size:1rem}.library-story-action-card>header p{margin:.2rem 0 0;font-size:.76rem;line-height:1.4;opacity:.68}.library-inline-form{display:grid;gap:.7rem}.library-inline-form label{display:grid;gap:.32rem}.library-inline-form label>span{font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;opacity:.67}.library-inline-form input,.library-inline-form select{width:100%;box-sizing:border-box;border:1px solid rgba(103,76,49,.19);border-radius:.78rem;padding:.62rem .72rem;background:rgba(255,255,255,.38);color:inherit;font:inherit;outline:none}.library-progress-form{grid-template-columns:repeat(2,minmax(0,1fr))}.library-progress-form button,.library-progress-form .library-action-status{grid-column:1/-1}.library-status-form{grid-template-columns:minmax(0,1fr) auto;align-items:end}.library-status-form .library-action-status{grid-column:1/-1}.library-session-actions{display:flex;flex-wrap:wrap;gap:.55rem;align-items:center}.library-session-actions button,.library-story-action-card button{border-radius:999px;padding:.62rem .88rem;font:inherit;font-weight:700;cursor:pointer}.library-session-badge{display:inline-flex;align-items:center;border:1px solid rgba(95,103,68,.25);border-radius:999px;padding:.5rem .7rem;background:rgba(95,103,68,.1);font-size:.75rem;font-weight:700}.library-action-status{min-height:1rem;margin:0;font-size:.72rem;opacity:.72}.library-action-hint{margin:0;padding:.55rem .7rem;border-left:2px solid rgba(95,103,68,.34);background:rgba(95,103,68,.06);font-size:.74rem;line-height:1.4;opacity:.82}.library-story-action-card button:disabled{opacity:.55;cursor:wait}@media(max-width:700px){.library-story-actions{grid-template-columns:1fr}}\n    .library-add-story-tags{display:grid;gap:.75rem;grid-column:1/-1;padding:1rem;border:1px solid rgba(103,76,49,.16);border-radius:1rem;background:rgba(255,255,255,.22)}.library-add-story-tags-heading span,.library-add-story-new-tag>span{display:block;font-size:.78rem;font-weight:750;color:#5f4e58}.library-add-story-tags-heading p{margin:.25rem 0 0;font-size:.76rem;line-height:1.4;opacity:.66}.library-add-story-tag-options{display:flex;flex-wrap:wrap;gap:.5rem}.library-add-story-tag-option{display:inline-flex;align-items:center;gap:.42rem;padding:.45rem .65rem;border:1px solid var(--library-tag-border,rgba(95,103,68,.22));border-radius:999px;background:var(--library-tag-soft,rgba(255,255,255,.34));box-shadow:inset 3px 0 0 var(--library-tag-color,#71815f);cursor:pointer}.library-add-story-tag-option input{width:auto;min-height:0;margin:0}.library-add-story-tag-option span{font-size:.76rem;font-weight:700}.library-add-story-tags-empty{margin:0;font-size:.76rem;opacity:.64}.library-add-story-new-tag{display:grid;gap:.4rem}.library-add-story-new-tag input{width:100%;min-height:46px;box-sizing:border-box;padding:12px 13px;color:#342931;background:rgba(255,255,255,.62);border:1px solid rgba(122,96,108,.14);border-radius:14px;font:inherit}.library-add-story-new-tag small{font-size:.7rem;opacity:.62}
    .library-word-danger-zone{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.8rem;align-items:center;margin-top:1.1rem;padding:1rem;border:1px solid rgba(125,63,70,.22);border-radius:1rem;background:rgba(125,63,70,.06)}.library-word-danger-zone h3{margin:0;font-size:1rem}.library-word-danger-zone p{margin:.25rem 0 0;font-size:.76rem;line-height:1.4;opacity:.7}.library-word-danger-zone>.library-action-status{grid-column:1/-1;margin:0}@media(max-width:700px){.library-word-danger-zone{grid-template-columns:1fr}.library-word-danger-zone .library-danger-button{width:100%}}.library-story-tags-card{grid-column:1/-1}.library-story-tag-chip{gap:.35rem}.library-story-tag-remove{display:grid;place-items:center;width:1.25rem;height:1.25rem;padding:0!important;border:0!important;border-radius:999px!important;background:rgba(103,76,49,.12)!important;color:inherit;font-size:.9rem!important;line-height:1;cursor:pointer}.library-story-danger-zone{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.8rem;align-items:center;margin-top:.25rem;padding:1rem;border:1px solid rgba(125,63,70,.22);border-radius:1rem;background:rgba(125,63,70,.06)}.library-story-danger-zone h3{margin:0;font-size:1rem}.library-story-danger-zone p{margin:.25rem 0 0;font-size:.76rem;line-height:1.4;opacity:.7}.library-danger-button{border:1px solid rgba(125,63,70,.35);border-radius:999px;padding:.65rem .95rem;background:rgba(125,63,70,.12);color:inherit;font:inherit;font-weight:750;cursor:pointer}.library-danger-button:disabled{opacity:.45;cursor:not-allowed}.library-story-danger-zone>.library-action-status{grid-column:1/-1;margin:0}@media(max-width:700px){.library-story-danger-zone{grid-template-columns:1fr}.library-danger-button{width:100%}}.library-story-tag-chips{display:flex;flex-wrap:wrap;gap:.5rem;min-height:2rem;align-items:center}.library-story-tag-chip{display:inline-flex;align-items:center;min-height:2rem;padding:.4rem .68rem;border:1px solid var(--library-tag-border,rgba(95,103,68,.23));border-radius:999px;background:var(--library-tag-soft,rgba(95,103,68,.11));box-shadow:inset 3px 0 0 var(--library-tag-color,#71815f);font-size:.76rem;font-weight:750}.library-story-tags-empty{margin:0;font-size:.78rem;opacity:.65}.library-story-tag-forms{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.library-tag-attach-form,.library-tag-create-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.55rem;align-items:end}.library-tag-attach-form label,.library-tag-create-form label{display:grid;gap:.32rem}.library-tag-attach-form label>span,.library-tag-create-form label>span{font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;opacity:.67}.library-tag-attach-form select,.library-tag-create-form input{width:100%;box-sizing:border-box;border:1px solid rgba(103,76,49,.19);border-radius:.78rem;padding:.62rem .72rem;background:rgba(255,255,255,.38);color:inherit;font:inherit;outline:none}.library-tag-attach-form .library-action-status,.library-tag-create-form .library-action-status{grid-column:1/-1}@media(max-width:700px){.library-story-tag-forms{grid-template-columns:1fr}.library-tag-attach-form,.library-tag-create-form{grid-template-columns:1fr}.library-tag-attach-form button,.library-tag-create-form button{width:100%}}
    .library-time-field{display:grid;gap:.42rem}
    .library-time-field>span,.library-time-total-field>span,.library-time-current-field>span{font-size:.74rem;font-weight:750}
    .library-time-inputs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}
    .library-time-inputs label{display:grid;gap:.28rem}
    .library-time-inputs label span{font-size:.68rem;opacity:.72}
    .library-time-inputs input{width:100%;box-sizing:border-box}
    .library-time-total-field[hidden],.library-time-current-field[hidden],.library-page-total-field[hidden],.library-page-current-field[hidden]{display:none!important}
    @media(max-width:700px){.library-time-inputs{grid-template-columns:repeat(3,minmax(0,1fr));gap:.38rem}}
    .library-story-completed-dialog{width:min(92vw,560px);max-width:560px;padding:0;border:1px solid rgba(103,76,49,.24);border-radius:1.4rem;background:rgba(242,234,219,.96);color:inherit;box-shadow:0 30px 90px rgba(25,20,16,.32);overflow:hidden}.library-story-completed-dialog::backdrop{background:rgba(20,16,12,.42);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.library-story-completed-shell{display:grid;gap:0}.library-story-completed-header{display:flex;gap:.9rem;align-items:flex-start;padding:1.25rem 1.35rem 1rem;border-bottom:1px solid rgba(103,76,49,.13);background:linear-gradient(135deg,rgba(255,255,255,.3),rgba(95,103,68,.08))}.library-story-completed-symbol{display:grid;place-items:center;width:2.7rem;height:2.7rem;flex:0 0 auto;border-radius:.9rem;background:rgba(95,103,68,.13);font-size:1.2rem}.library-story-completed-header h2{margin:.15rem 0 .25rem}.library-story-completed-header p:last-child{margin:0;font-size:.8rem;line-height:1.45;opacity:.68}.library-story-completed-body{display:grid;gap:1rem;padding:1.2rem 1.35rem}.library-story-completed-story{display:grid;gap:.15rem;padding:.85rem 1rem;border:1px solid rgba(103,76,49,.14);border-radius:1rem;background:rgba(255,255,255,.28)}.library-story-completed-story strong{font-size:1.02rem}.library-story-completed-story span{font-size:.78rem;opacity:.65}.library-completion-scale{display:grid;gap:.55rem;margin:0;padding:.9rem 1rem;border:1px solid rgba(103,76,49,.14);border-radius:1rem;background:rgba(255,255,255,.24)}.library-completion-scale legend{padding:0;font-size:.75rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;opacity:.72}.library-completion-choices{display:flex;gap:.45rem}.library-completion-choice{display:grid;place-items:center;width:2.5rem;height:2.5rem;border:1px solid rgba(103,76,49,.18);border-radius:.8rem;background:rgba(255,255,255,.3);font-size:1.2rem;filter:grayscale(1);opacity:.45;cursor:pointer}.library-completion-choice.is-selected{filter:none;opacity:1;background:rgba(95,103,68,.12);border-color:rgba(95,103,68,.3)}.library-story-completed-note{margin:0;padding:0 1.35rem 1rem;font-size:.76rem;line-height:1.45;opacity:.66}.library-story-completed-actions{display:flex;justify-content:flex-end;gap:.65rem;padding:1rem 1.35rem 1.2rem;border-top:1px solid rgba(103,76,49,.12)}.library-story-completed-actions button{border-radius:999px;padding:.68rem 1rem;font:inherit;font-weight:700;cursor:pointer}@media(max-width:560px){.library-story-completed-actions{display:grid;grid-template-columns:1fr}.library-story-completed-actions button{width:100%}}
    .library-collections-landing{gap:1.15rem}.library-collections-intro{display:block}.library-collection-shelves{display:grid;gap:.75rem}.library-collection-shelf-card{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:.8rem;align-items:center;padding:1rem;border:1px solid rgba(103,76,49,.16);border-radius:1rem;background:rgba(255,255,255,.3);color:inherit;text-align:left;cursor:pointer}.library-collection-shelf-card:hover,.library-collection-shelf-card:focus-visible{background:rgba(255,255,255,.46);border-color:rgba(95,103,68,.34);transform:translateY(-1px)}.library-collection-shelf-icon{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:.85rem;background:rgba(95,103,68,.1);font-size:1.2rem}.library-collection-shelf-copy{display:grid;gap:.15rem;min-width:0}.library-collection-shelf-copy strong{font-size:1rem}.library-collection-shelf-copy span{font-size:.76rem;line-height:1.35;opacity:.66}.library-collection-shelf-count{display:grid;place-items:center;min-width:2rem;height:2rem;padding:0 .45rem;border-radius:999px;background:rgba(103,76,49,.08);font-size:.76rem;font-weight:750;opacity:.72}.library-collection-shelf-arrow{font-size:1.35rem;opacity:.45}.library-collection-back{justify-self:start;border:0;padding:.2rem 0;background:transparent;color:inherit;font:inherit;font-size:.8rem;font-weight:750;opacity:.7;cursor:pointer}.library-collection-back:hover,.library-collection-back:focus-visible{opacity:1}.library-collection-shelf-panel .library-collection-search{width:100%;box-sizing:border-box}
    body.library-panel-open{overflow:hidden}
    @media(max-width:760px){.library-dashboard.library-dashboard-refined{grid-template-columns:minmax(0,1fr)}.library-paths-column{position:static;grid-template-columns:repeat(3,minmax(0,1fr))}.library-paths-label{grid-column:1/-1}.library-path-card{grid-template-columns:1fr;align-items:start}.library-path-arrow{display:none}.library-side-panel{width:min(96vw,620px)}}
    @media(max-width:560px){.library-paths-column{grid-template-columns:1fr}.library-path-card{grid-template-columns:auto minmax(0,1fr) auto}.library-path-arrow{display:inline}.library-panel-books{grid-template-columns:1fr}.library-collection-toolbar,.library-dictionary-toolbar{grid-template-columns:1fr}.library-collection-overview{display:grid}.library-collection-add{justify-self:start}.library-dictionary-overview{grid-template-columns:1fr}.library-dictionary-add{justify-self:start}}
  `;
  document.head.append(style);
}

function renderCurrentCard(item, label) {
  const card = document.createElement("article");
  card.className = "library-current-card";
  card.append(createCover(item));

  const content = document.createElement("div");
  content.className = "library-card-content";
  const kicker = document.createElement("p");
  kicker.className = "library-card-kicker";
  kicker.textContent = label;
  const title = document.createElement("h3");
  title.className = "library-card-title";
  title.textContent = item.title;
  const author = document.createElement("p");
  author.className = "library-card-author";
  author.textContent = item.author;
  const series = document.createElement("p");
  series.className = "library-card-series";
  series.textContent = seriesLabel(item);
  content.append(kicker, title, author, series);
  card.append(content);
  return makeClickable(card, () => openStoryCard(item), `Open ${item.title}`);
}

function renderCurrent() {
  elements.current.replaceChildren();

  const activeItems = state.items.filter(
    (item) =>
      item.status === "reading" ||
      item.status === "listening",
  );

  activeItems.forEach((item) => {
    const label =
      item.status === "listening"
        ? "Currently listening"
        : "Currently reading";

    elements.current.append(
      renderCurrentCard(item, label),
    );
  });

  if (!activeItems.length) {
    const empty = document.createElement("div");
    empty.className = "library-empty-card";
    empty.textContent = "No story is open right now. The shelves are quiet.";
    elements.current.append(empty);
  }
}

function matchesFilter(item) {
  if (state.filter === "all") return true;
  if (["book", "audiobook"].includes(state.filter)) return item.type === state.filter;
  return item.status === state.filter;
}

function renderBookCard(item) {
  const card = document.createElement("article");
  card.className = "library-book-card";
  card.append(createCover(item));
  const content = document.createElement("div");
  content.className = "library-card-content";
  const title = document.createElement("h3");
  title.className = "library-card-title";
  title.textContent = item.title;
  const author = document.createElement("p");
  author.className = "library-card-author";
  author.textContent = item.author;
  const meta = document.createElement("p");
  meta.className = "library-book-meta";
  meta.textContent = `${pretty(item.type)} · ${pretty(item.status)} · ${seriesLabel(item)}`;
  content.append(title, author, meta);
  card.append(content);
  return makeClickable(card, () => openStoryCard(item), `Open ${item.title}`);
}

function renderBooks() {
  elements.books.replaceChildren();
  const visible = state.items.filter(matchesFilter);
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "library-empty-card";
    empty.textContent = state.items.length ? "Nothing is resting on this shelf yet." : "Your Library is waiting for its first story.";
    elements.books.append(empty);
    return;
  }
  visible.forEach((item) => elements.books.append(renderBookCard(item)));
}

function renderLists() {
  elements.lists.replaceChildren();
  if (!state.lists.length) {
    const empty = document.createElement("article");
    empty.className = "library-small-card";
    empty.innerHTML = "<strong>No reading lists yet.</strong><p>Collections will appear here when you create them.</p>";
    elements.lists.append(empty);
    return;
  }
  state.lists.slice(0, 4).forEach((list) => {
    const card = document.createElement("article");
    card.className = "library-small-card";
    const title = document.createElement("strong");
    title.textContent = list.name;
    const text = document.createElement("p");
    text.textContent = list.description || "A shelf with its own purpose.";
    card.append(title, text);
    elements.lists.append(card);
  });
}

function renderDictionary() {
  elements.dictionary.replaceChildren();
  if (!state.dictionary.length) {
    const empty = document.createElement("article");
    empty.className = "library-small-card";
    empty.innerHTML = "<strong>No words collected yet.</strong><p>Words saved from reading logs will live here.</p>";
    elements.dictionary.append(empty);
    return;
  }
  state.dictionary.slice(0, 4).forEach((entry) => {
    const card = document.createElement("article");
    card.className = "library-small-card";
    const title = document.createElement("strong");
    title.textContent = entry.word;
    const text = document.createElement("p");
    const context = entry.contexts?.[0];
    text.textContent = entry.meaning || context?.item?.title || "A word kept by the House.";
    card.append(title, text);
    elements.dictionary.append(makeClickable(card, () => openWordCard(entry), `Open word ${entry.word}`));
  });
}

function detailRow(label, value) {
  const row = document.createElement("div");
  row.className = "library-detail-row";
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value || "—";
  row.append(term, description);
  return row;
}

function createCompletionScale(label, symbol, value = 0) {
  const group = document.createElement("fieldset");
  group.className = "library-completion-scale";

  const legend = document.createElement("legend");
  legend.textContent = label;

  const choices = document.createElement("div");
  choices.className = "library-completion-choices";
  choices.setAttribute("role", "radiogroup");
  choices.setAttribute("aria-label", label);

  let selectedValue = value;

  const updateChoices = () => {
    choices.querySelectorAll("button").forEach((button) => {
      const choiceValue = Number(button.dataset.value || 0);
      const selected = choiceValue <= selectedValue;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", choiceValue === selectedValue ? "true" : "false");
    });
  };

  for (let index = 1; index <= 5; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-completion-choice";
    button.dataset.value = String(index);
    button.textContent = symbol;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", `${label}: ${index} of 5`);
    button.addEventListener("click", () => {
      selectedValue = selectedValue === index ? 0 : index;
      group.dataset.value = String(selectedValue);
      updateChoices();
    });
    choices.append(button);
  }

  group.dataset.value = String(selectedValue);
  updateChoices();
  group.append(legend, choices);
  return group;
}

function ensureStoryCompletedDialog() {
  let dialog = document.getElementById("library-story-completed-dialog");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = "library-story-completed-dialog";
  dialog.className = "library-story-completed-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="library-story-completed-shell">
      <header class="library-story-completed-header">
        <span class="library-story-completed-symbol" aria-hidden="true">✦</span>
        <div>
          <p class="section-label">The House noticed</p>
          <h2>Story completed</h2>
          <p>Another world has settled onto the shelves.</p>
        </div>
      </header>
      <div class="library-story-completed-body"></div>
      <p class="library-story-completed-note">Ratings are optional. The House can wait until the feeling settles.</p>
      <footer class="library-story-completed-actions">
        <button type="button" class="library-secondary-button" data-completion-skip>Skip for now</button>
        <button type="button" class="library-primary-button" data-completion-finish>Finish story</button>
      </footer>
    </form>
  `;

  document.body.append(dialog);
  return dialog;
}

function openStoryCompletedDialog(item) {
  const dialog = ensureStoryCompletedDialog();
  const body = dialog.querySelector(".library-story-completed-body");
  const skipButton = dialog.querySelector("[data-completion-skip]");
  const finishButton = dialog.querySelector("[data-completion-finish]");

  if (!body || !skipButton || !finishButton) return;

  body.replaceChildren();

  const story = document.createElement("div");
  story.className = "library-story-completed-story";

  const title = document.createElement("strong");
  title.textContent = item?.title || "This story";

  const author = document.createElement("span");
  author.textContent = item?.author || "Unknown author";

  story.append(title, author);

  const rating = createCompletionScale("Overall feeling", "★");
  const spice = createCompletionScale("Spice level", "🌶️");

  body.append(story, rating, spice);

  const closeAndRefresh = async () => {
    dialog.close();
    await refreshLibraryViews();
    await openStoryCard(item);
  };

  skipButton.onclick = closeAndRefresh;
  finishButton.onclick = closeAndRefresh;

  if (!dialog.open) dialog.showModal();
}

function closeStoryCard() {
  elements.storyDialog?.close();
}

async function openStoryCard(item) {
  if (!elements.storyDialog || !elements.storyDialogBody) return;

  closeSidePanel();
  elements.storyDialogBody.innerHTML = '<p class="library-detail-loading">The Library is finding this story…</p>';
  if (!elements.storyDialog.open) elements.storyDialog.showModal();

  try {
    const [freshItem, sessions, allTags] = await Promise.all([
      libraryService.getItem(item.id),
      libraryService.listSessions({ libraryItemId: item.id }),
      libraryService.listTags(),
    ]);

    const currentItem = freshItem || state.items.find((candidate) => candidate.id === item.id) || item;

    let itemTags = Array.isArray(currentItem.tags)
      ? currentItem.tags
      : [];

    try {
      const fetchedItemTags = await libraryService.listItemTags(item.id);
      if (Array.isArray(fetchedItemTags)) itemTags = fetchedItemTags;
    } catch (error) {
      console.warn("Attached Library tags could not be loaded:", error);
    }
    const activeSession = sessions.find((session) => ["active", "reading", "listening", "in_progress"].includes(session.status));
    const wrapper = document.createElement("div");
    wrapper.className = "library-story-detail library-story-workspace";

    const hero = document.createElement("header");
    hero.className = "library-detail-hero";
    hero.append(createCover(currentItem));

    const heading = document.createElement("div");
    heading.className = "library-story-heading";
    const eyebrow = document.createElement("p");
    eyebrow.className = "section-label";
    eyebrow.textContent = `${pretty(currentItem.type)} · ${pretty(currentItem.status)}`;
    const title = document.createElement("h2");
    title.textContent = currentItem.title;
    const author = document.createElement("p");
    author.className = "library-detail-author";
    author.textContent = currentItem.author || "Unknown author";
    const series = document.createElement("p");
    series.className = "library-detail-series";
    series.textContent = seriesLabel(currentItem);
    heading.append(eyebrow, title, author, series);

    const canFinishStory = ["reading", "listening"].includes(currentItem.status);
    if (canFinishStory) {
      const finishStoryButton = document.createElement("button");
      finishStoryButton.type = "button";
      finishStoryButton.className = "library-primary-button";
      finishStoryButton.textContent = "Finish story";
      finishStoryButton.style.marginTop = ".65rem";

      const finishStoryStatus = document.createElement("p");
      finishStoryStatus.className = "library-action-status";
      finishStoryStatus.setAttribute("aria-live", "polite");

      finishStoryButton.addEventListener("click", async () => {
        finishStoryButton.disabled = true;
        finishStoryStatus.textContent = "Closing this story gently…";

        try {
          let updated = currentItem;

          if (activeSession) {
            const finishingPosition =
              currentItem.totalUnits > 0
                ? currentItem.totalUnits
                : activeSession.currentUnit ?? currentItem.currentUnit ?? 0;

            const sessionResult = await libraryService.finishSession(
              activeSession.id,
              finishingPosition,
            );

            updated = sessionResult.item || updated;
          }

          updated =
            await libraryService.updateItem(
              currentItem.id,
              {
                status: "finished",
                ...(currentItem.totalUnits > 0
                  ? { current_unit: currentItem.totalUnits }
                  : {}),
              },
            ) || updated;

          syncLocalItem(updated);
          await refreshLibraryViews();
          closeStoryCard();
          openStoryCompletedDialog(updated || currentItem);
        } catch (error) {
          finishStoryStatus.textContent =
            error instanceof Error
              ? error.message
              : "This story could not be finished.";
          finishStoryButton.disabled = false;
        }
      });

      heading.append(finishStoryButton, finishStoryStatus);
    }

    if (currentItem.status === "finished") {
      const memoriesButton = document.createElement("button");
      memoriesButton.type = "button";
      memoriesButton.className = "library-primary-button";
      memoriesButton.textContent = "Story memories";
      memoriesButton.style.marginTop = ".65rem";
      memoriesButton.addEventListener("click", () => {
        closeStoryCard();
        openStoryCompletedDialog(currentItem);
      });
      heading.append(memoriesButton);

      const againButton = document.createElement("button");
      againButton.type = "button";
      againButton.className = "library-primary-button";
      againButton.textContent =
        getSessionMode(currentItem) === "listening"
          ? "Listen again"
          : "Read again";
      againButton.style.marginTop = ".65rem";

      const againStatus = document.createElement("p");
      againStatus.className = "library-action-status";
      againStatus.setAttribute("aria-live", "polite");

      againButton.addEventListener("click", async () => {
        againButton.disabled = true;
        againStatus.textContent =
          getSessionMode(currentItem) === "listening"
            ? "Opening another listen…"
            : "Opening another reading…";

        try {
          if (activeSession) {
            await libraryService.finishSession(
              activeSession.id,
              activeSession.currentUnit ?? currentItem.currentUnit ?? 0,
            );
          }

          await libraryService.startSession({
            library_item_id: currentItem.id,
            mode: getSessionMode(currentItem),
            is_reread: true,
            start_unit: 0,
            current_unit: 0,
          });

          await refreshLibraryViews();
          await openStoryCard(currentItem);
        } catch (error) {
          againStatus.textContent =
            error instanceof Error
              ? error.message
              : "This story could not be opened again.";
          againButton.disabled = false;
        }
      });

      heading.append(againButton, againStatus);
    }

    hero.append(heading);

    const tagsCard = createStoryTagsCard(
      currentItem,
      Array.isArray(allTags) ? allTags : [],
      Array.isArray(itemTags) ? itemTags : [],
    );

    const actions = document.createElement("section");
    actions.className = "library-story-actions";

    const seriesCard = createStoryActionCard(
      "Series",
      "Keep this story on the right shelf and in the right order.",
    );

    const seriesForm = document.createElement("form");
    seriesForm.className =
      "library-inline-form library-series-form";

    seriesForm.innerHTML = `
      <label>
        <span>Story place</span>
        <select name="series_mode">
          <option value="standalone" ${hasSeries(currentItem) ? "" : "selected"}>Standalone</option>
          <option value="series" ${hasSeries(currentItem) ? "selected" : ""}>Part of a series</option>
        </select>
      </label>
      <label class="library-series-edit-name" ${hasSeries(currentItem) ? "" : "hidden"}>
        <span>Series name</span>
        <input type="text" name="series_name" value="${String(currentItem.seriesName || "").replace(/"/g, "&quot;")}">
      </label>
      <label class="library-series-edit-number" ${hasSeries(currentItem) ? "" : "hidden"}>
        <span>Book number</span>
        <input type="number" name="series_number" min="0" step="0.1" value="${Number(currentItem.seriesNumber || 1)}">
      </label>
      <button type="submit" class="library-primary-button">Save series</button>
      <p class="library-action-status" aria-live="polite"></p>
    `;

    const seriesMode =
      seriesForm.elements.series_mode;
    const seriesNameField =
      seriesForm.querySelector(
        ".library-series-edit-name",
      );
    const seriesNumberField =
      seriesForm.querySelector(
        ".library-series-edit-number",
      );

    const syncSeriesFields = () => {
      const visible =
        seriesMode.value === "series";

      seriesNameField.hidden = !visible;
      seriesNumberField.hidden = !visible;
    };

    seriesMode.addEventListener(
      "change",
      syncSeriesFields,
    );

    seriesForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const status =
          seriesForm.querySelector(
            ".library-action-status",
          );

        const data =
          new FormData(seriesForm);

        const isSeries =
          data.get("series_mode") ===
          "series";

        const seriesName =
          isSeries
            ? String(
                data.get("series_name") ||
                "",
              ).trim()
            : "";

        if (isSeries && !seriesName) {
          status.textContent =
            "Give this series a name.";
          return;
        }

        status.textContent =
          "The Library is arranging this series…";

        try {
          const updated =
            await libraryService.updateItem(
              currentItem.id,
              {
                series_name: seriesName,
                series_number: isSeries
                  ? Number(
                      data.get(
                        "series_number",
                      ) || 1,
                    )
                  : 0,
              },
            );

          await loadLibrary();
          await openStoryCard(
            updated || currentItem,
          );
        } catch (error) {
          status.textContent =
            error instanceof Error
              ? error.message
              : "The series could not be saved.";
        }
      },
    );

    seriesCard.append(seriesForm);

    const statusCard = createStoryActionCard("Status", "Tell the Library where this story belongs now.");
    const statusForm = document.createElement("form");
    statusForm.className = "library-inline-form library-status-form";
    const statusSelect = document.createElement("select");
    statusSelect.name = "status";
    statusSelect.setAttribute("aria-label", "Story status");
    getStatusOptions(currentItem).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = currentItem.status === value;
      statusSelect.append(option);
    });
    const statusButton = document.createElement("button");
    statusButton.type = "submit";
    statusButton.className = "library-primary-button";
    statusButton.textContent = "Change status";
    const statusMessage = document.createElement("p");
    statusMessage.className = "library-action-status";
    statusMessage.setAttribute("aria-live", "polite");
    statusForm.append(statusSelect, statusButton, statusMessage);
    statusForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextStatus = statusSelect.value;
      statusMessage.textContent =
        nextStatus === "finished"
          ? "Closing this story gently…"
          : "Moving this story…";
      statusButton.disabled = true;

      try {
        let updated = currentItem;

        if (nextStatus === "finished" && activeSession) {
          const finishingPosition =
            currentItem.totalUnits > 0
              ? currentItem.totalUnits
              : activeSession.currentUnit ?? currentItem.currentUnit ?? 0;

          const sessionResult =
            await libraryService.finishSession(
              activeSession.id,
              finishingPosition,
            );

          updated =
            sessionResult.item ||
            updated;
        }

        updated =
          await libraryService.updateItem(
            currentItem.id,
            {
              status: nextStatus,
              ...(nextStatus === "finished" && currentItem.totalUnits > 0
                ? {
                    current_unit:
                      currentItem.totalUnits,
                  }
                : {}),
            },
          ) ||
          updated;

        syncLocalItem(updated);
        await refreshLibraryViews();

        if (nextStatus === "finished") {
          closeStoryCard();
          openStoryCompletedDialog(
            updated || currentItem,
          );
        } else {
          await openStoryCard(
            updated || currentItem,
          );
        }
      } catch (error) {
        statusMessage.textContent =
          error instanceof Error
            ? error.message
            : "The status could not be changed.";
        statusButton.disabled = false;
      }
    });
    statusCard.append(statusForm);

    const sessionCard = createStoryActionCard(
      "Reading session",
      activeSession
        ? `Session ${activeSession.sessionNumber || ""} is active from ${formatItemPosition(currentItem, activeSession.currentUnit ?? currentItem.currentUnit, isTimedItem(currentItem))}.`
        : "Start a session for this reading period."
    );
    const sessionActions = document.createElement("div");
    sessionActions.className = "library-session-actions";
    if (!activeSession) {
      const startButton = document.createElement("button");
      startButton.type = "button";
      startButton.className = "library-primary-button";
      startButton.textContent = "Start reading session";
      const startRereadButton = document.createElement("button");
      startRereadButton.type = "button";
      startRereadButton.className = "library-secondary-button";
      startRereadButton.textContent = "Start reread";
      const sessionStatus = document.createElement("p");
      sessionStatus.className = "library-action-status";
      sessionStatus.setAttribute("aria-live", "polite");

      const start = async (isReread) => {
        sessionStatus.textContent = isReread ? "Opening a reread…" : "Opening a reading session…";
        startButton.disabled = true;
        startRereadButton.disabled = true;
        try {
          await libraryService.startSession({
            library_item_id: currentItem.id,
            mode: getSessionMode(currentItem),
            is_reread: isReread,
            start_unit: isReread ? 0 : currentItem.currentUnit,
            current_unit: isReread ? 0 : currentItem.currentUnit,
          });
          await refreshLibraryViews();
          await openStoryCard(currentItem);
        } catch (error) {
          sessionStatus.textContent = error instanceof Error ? error.message : "A session could not be started.";
          startButton.disabled = false;
          startRereadButton.disabled = false;
        }
      };

      startButton.addEventListener("click", () => start(false));
      startRereadButton.addEventListener("click", () => start(true));
      sessionActions.append(startButton, startRereadButton, sessionStatus);
    } else {
      const activeBadge = document.createElement("span");
      activeBadge.className = "library-session-badge";
      activeBadge.textContent = activeSession.isReread ? "Reread in progress" : "Session in progress";
      sessionActions.append(activeBadge);
    }
    sessionCard.append(sessionActions);

    const danger = document.createElement("section");
    danger.className = "library-story-danger-zone";

    const dangerText = document.createElement("div");
    const dangerTitle = document.createElement("h3");
    dangerTitle.textContent = "Remove from the Library";
    const dangerDescription = document.createElement("p");
    dangerDescription.textContent =
      sessions.length
        ? "This permanently deletes the story and its reading sessions."
        : "Delete this test or accidental entry permanently.";

    dangerText.append(
      dangerTitle,
      dangerDescription,
    );

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "library-danger-button";
    deleteButton.textContent = "Delete story";

    const deleteStatus = document.createElement("p");
    deleteStatus.className = "library-action-status";
    deleteStatus.setAttribute("aria-live", "polite");

    deleteButton.addEventListener("click", async () => {
      const hasHistory =
        sessions.length > 0;

      const confirmed = window.confirm(
        hasHistory
          ? `Delete “${currentItem.title}” and all of its reading history? This cannot be undone.`
          : `Delete “${currentItem.title}” from the Library? This cannot be undone.`,
      );

      if (!confirmed) return;

      if (hasHistory) {
        const confirmedAgain = window.confirm(
          "This will permanently remove the reading sessions for this story. Delete it anyway?",
        );

        if (!confirmedAgain) return;
      }

      deleteButton.disabled = true;
      deleteStatus.textContent = "Removing this story…";

      try {
        await libraryService.deleteItem(currentItem.id);
        closeStoryCard();
        await loadLibrary();
      } catch (error) {
        deleteStatus.textContent =
          error instanceof Error
            ? error.message
            : "This story could not be removed.";
        deleteButton.disabled = false;
      }
    });

    danger.append(
      dangerText,
      deleteButton,
      deleteStatus,
    );

    wrapper.append(hero, tagsCard, danger);
    elements.storyDialogBody.replaceChildren(wrapper);
  } catch (error) {
    elements.storyDialogBody.textContent = error instanceof Error ? error.message : "This story could not be opened.";
  }
}

function getTagId(tag) {
  return String(
    tag?.id ??
    tag?.tagId ??
    tag?.tag_id ??
    "",
  );
}

function getTagName(tag) {
  return String(
    tag?.name ??
    tag?.title ??
    tag?.label ??
    "",
  ).trim();
}

const TAG_COLOR_PALETTE = [
  "#8f6f78",
  "#71815f",
  "#9a7652",
  "#6d7f91",
  "#8b6f9a",
  "#9a6b62",
  "#5f847e",
  "#91834f",
];

function getTagColor(tagOrName) {
  const savedColor =
    typeof tagOrName === "object"
      ? String(tagOrName?.color || "").trim()
      : "";

  if (/^#[0-9a-f]{6}$/i.test(savedColor)) {
    return savedColor;
  }

  const name =
    typeof tagOrName === "object"
      ? getTagName(tagOrName)
      : String(tagOrName || "").trim();

  let hash = 0;

  for (const character of name.toLocaleLowerCase()) {
    hash =
      ((hash << 5) - hash +
        character.codePointAt(0)) |
      0;
  }

  return TAG_COLOR_PALETTE[
    Math.abs(hash) %
      TAG_COLOR_PALETTE.length
  ];
}

function hexToRgba(hex, alpha) {
  const normalized =
    String(hex).replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return `rgba(95, 103, 68, ${alpha})`;
  }

  const number = Number.parseInt(
    normalized,
    16,
  );

  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function applyTagColor(element, tagOrName) {
  const color = getTagColor(tagOrName);

  element.style.setProperty(
    "--library-tag-color",
    color,
  );
  element.style.setProperty(
    "--library-tag-soft",
    hexToRgba(color, 0.16),
  );
  element.style.setProperty(
    "--library-tag-border",
    hexToRgba(color, 0.38),
  );
}

function createStoryTagsCard(
  item,
  allTags,
  attachedTags,
) {
  const card =
    createStoryActionCard(
      "Tags",
      "Keep the moods, themes and little shelves that make this story yours. Tag tools are ready here.",
    );

  card.classList.add(
    "library-story-tags-card",
  );

  const attachedIds =
    new Set(
      attachedTags
        .map(getTagId)
        .filter(Boolean),
    );

  const chips =
    document.createElement("div");

  chips.className =
    "library-story-tag-chips";

  if (!attachedTags.length) {
    const empty =
      document.createElement("p");

    empty.className =
      "library-story-tags-empty";

    empty.textContent =
      "No tags attached yet.";

    chips.append(empty);
  } else {
    attachedTags.forEach((tag) => {
      const chip =
        document.createElement("span");

      chip.className =
        "library-story-tag-chip";
      applyTagColor(chip, tag);

      const chipText =
        document.createElement("span");

      chipText.textContent =
        getTagName(tag) ||
        "Untitled tag";

      const removeButton =
        document.createElement("button");

      removeButton.type = "button";
      removeButton.className =
        "library-story-tag-remove";
      removeButton.setAttribute(
        "aria-label",
        `Remove ${chipText.textContent} from this story`,
      );
      removeButton.textContent = "×";

      removeButton.addEventListener(
        "click",
        async () => {
          removeButton.disabled = true;

          try {
            await libraryService.detachTag(
              item.id,
              getTagId(tag),
            );

            await openStoryCard(item);
          } catch (error) {
            removeButton.disabled = false;
            window.alert(
              error instanceof Error
                ? error.message
                : "This tag could not be removed.",
            );
          }
        },
      );

      chip.append(
        chipText,
        removeButton,
      );

      chips.append(chip);
    });
  }

  const existingForm =
    document.createElement("form");

  existingForm.className =
    "library-tag-attach-form";

  const selectLabel =
    document.createElement("label");

  const selectTitle =
    document.createElement("span");

  selectTitle.textContent =
    "Existing tag";

  const select =
    document.createElement("select");

  select.name = "tag_id";
  select.setAttribute(
    "aria-label",
    "Choose an existing tag",
  );

  const availableTags =
    allTags.filter(
      (tag) =>
        getTagId(tag) &&
        !attachedIds.has(getTagId(tag)),
    );

  const placeholder =
    document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    availableTags.length
      ? "Choose a tag"
      : "No unused tags";
  placeholder.selected = true;

  select.append(placeholder);

  availableTags.forEach((tag) => {
    const option =
      document.createElement("option");

    option.value = getTagId(tag);
    option.textContent =
      getTagName(tag) ||
      "Untitled tag";

    select.append(option);
  });

  select.disabled =
    !availableTags.length;

  selectLabel.append(
    selectTitle,
    select,
  );

  const attachButton =
    document.createElement("button");

  attachButton.type = "submit";
  attachButton.className =
    "library-secondary-button";
  attachButton.textContent =
    "Attach tag";
  attachButton.disabled =
    !availableTags.length;

  const existingStatus =
    document.createElement("p");

  existingStatus.className =
    "library-action-status";
  existingStatus.setAttribute(
    "aria-live",
    "polite",
  );

  existingForm.append(
    selectLabel,
    attachButton,
    existingStatus,
  );

  existingForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!select.value) {
        existingStatus.textContent =
          "Choose a tag first.";
        return;
      }

      existingStatus.textContent =
        "Attaching this tag…";
      attachButton.disabled = true;
      select.disabled = true;

      try {
        await libraryService.attachTag(
          item.id,
          select.value,
        );

        await openStoryCard(item);
      } catch (error) {
        existingStatus.textContent =
          error instanceof Error
            ? error.message
            : "This tag could not be attached.";

        attachButton.disabled = false;
        select.disabled = false;
      }
    },
  );

  const newForm =
    document.createElement("form");

  newForm.className =
    "library-tag-create-form";

  const inputLabel =
    document.createElement("label");

  const inputTitle =
    document.createElement("span");

  inputTitle.textContent =
    "New tag";

  const input =
    document.createElement("input");

  input.type = "text";
  input.name = "name";
  input.maxLength = 80;
  input.placeholder =
    "Cozy, fantasy, comfort read…";
  input.autocomplete = "off";

  inputLabel.append(
    inputTitle,
    input,
  );

  const createButton =
    document.createElement("button");

  createButton.type = "submit";
  createButton.className =
    "library-primary-button";
  createButton.textContent =
    "Create & attach";

  const createStatus =
    document.createElement("p");

  createStatus.className =
    "library-action-status";
  createStatus.setAttribute(
    "aria-live",
    "polite",
  );

  newForm.append(
    inputLabel,
    createButton,
    createStatus,
  );

  newForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const name =
        input.value.trim();

      if (!name) {
        createStatus.textContent =
          "Write a tag name first.";
        input.focus();
        return;
      }

      const matchingTag =
        allTags.find(
          (tag) =>
            getTagName(tag)
              .toLocaleLowerCase() ===
            name.toLocaleLowerCase(),
        );

      createStatus.textContent =
        matchingTag
          ? "Attaching the existing tag…"
          : "Creating this tag…";

      createButton.disabled = true;
      input.disabled = true;

      try {
        const tag =
          matchingTag ||
          await libraryService.createTag({
            name,
            color: getTagColor(name),
          });

        const tagId =
          getTagId(tag);

        if (!tagId) {
          throw new Error(
            "The Library created the tag but returned no tag id.",
          );
        }

        await libraryService.attachTag(
          item.id,
          tagId,
        );

        await openStoryCard(item);
      } catch (error) {
        createStatus.textContent =
          error instanceof Error
            ? error.message
            : "This tag could not be created.";

        createButton.disabled = false;
        input.disabled = false;
      }
    },
  );

  const forms =
    document.createElement("div");

  forms.className =
    "library-story-tag-forms";

  forms.append(
    existingForm,
    newForm,
  );

  card.append(
    chips,
    forms,
  );

  return card;
}

function createStoryActionCard(title, description) {
  const card = document.createElement("article");
  card.className = "library-story-action-card";
  const header = document.createElement("header");
  const heading = document.createElement("h3");
  heading.textContent = title;
  const text = document.createElement("p");
  text.textContent = description;
  header.append(heading, text);
  card.append(header);
  return card;
}

function getSessionMode(item) {
  return item.type === "audiobook" ? "listening" : "reading";
}

function getStatusOptions(item) {
  const activeLabel = item.type === "audiobook" ? "Listening" : "Reading";
  const activeValue = item.type === "audiobook" ? "listening" : "reading";
  return [
    ["want_to_read", "Want to read"],
    [activeValue, activeLabel],
    ["finished", "Finished"],
    ["dnf", "DNF"],
  ];
}

function syncLocalItem(item) {
  if (!item?.id) return;
  const index = state.items.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) state.items[index] = item;
  else state.items.push(item);
}

async function refreshLibraryViews() {
  const [items, dictionary] = await Promise.all([
    libraryService.listItems(),
    libraryService.getDictionary(),
  ]);
  state.items = Array.isArray(items) ? items.filter((item) => !["manga", "podcast"].includes(item.type)) : state.items;
  state.dictionary = Array.isArray(dictionary) ? dictionary : state.dictionary;
  renderCurrent();
  renderBooks();
  renderLists();
  renderDictionary();
}

function closeWordCard() {
  elements.wordDialog?.close();
}

function openWordCard(entry) {
  if (!elements.wordDialog || !elements.wordDialogBody) return;
  const wrapper = document.createElement("div");
  wrapper.className = "library-word-detail";
  const eyebrow = document.createElement("p");
  eyebrow.className = "section-label";
  eyebrow.textContent = "A word gathered";
  const title = document.createElement("h2");
  title.textContent = entry.word;
  const meaning = document.createElement("p");
  meaning.className = "library-word-meaning";
  meaning.textContent = entry.meaning || "No meaning has been written yet.";
  wrapper.append(eyebrow, title, meaning);
  if (entry.note) {
    const note = document.createElement("blockquote");
    note.textContent = entry.note;
    wrapper.append(note);
  }
  const contextsTitle = document.createElement("h3");
  contextsTitle.textContent = "Where it was found";
  wrapper.append(contextsTitle);
  const contexts = Array.isArray(entry.contexts) ? entry.contexts : [];
  if (!contexts.length) {
    const empty = document.createElement("p");
    empty.className = "library-detail-muted";
    empty.textContent = "No reading context is attached.";
    wrapper.append(empty);
  } else {
    const list = document.createElement("div");
    list.className = "library-word-contexts";
    contexts.forEach((context) => {
      const card = document.createElement("article");
      card.className = "library-log-card";
      const story = document.createElement("strong");
      story.textContent = context.item?.title || "Unknown story";
      const byline = document.createElement("p");
      byline.textContent = context.item?.author || "";
      const meta = document.createElement("p");
      meta.textContent = `${formatDate(context.date)} · ${context.startUnit}–${context.endUnit} · ${context.place || "Place not recorded"}`;
      const note = document.createElement("p");
      note.textContent = context.readingNote || "No note from this reading.";
      card.append(story, byline, meta, note);
      list.append(card);
    });
    wrapper.append(list);
  }
  const danger = document.createElement("section");
  danger.className =
    "library-word-danger-zone";

  const dangerCopy =
    document.createElement("div");

  const dangerTitle =
    document.createElement("h3");
  dangerTitle.textContent =
    "Remove from the Dictionary";

  const dangerText =
    document.createElement("p");
  dangerText.textContent =
    "Delete this word and all of its saved reading contexts.";

  dangerCopy.append(
    dangerTitle,
    dangerText,
  );

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className =
    "library-danger-button";
  deleteButton.textContent =
    "Delete word";

  const deleteStatus =
    document.createElement("p");

  deleteStatus.className =
    "library-action-status";
  deleteStatus.setAttribute(
    "aria-live",
    "polite",
  );

  deleteButton.addEventListener(
    "click",
    async () => {
      const confirmed = window.confirm(
        `Delete “${entry.word}” from the Dictionary? This cannot be undone.`,
      );

      if (!confirmed) return;

      deleteButton.disabled = true;
      deleteStatus.textContent =
        "Removing this word…";

      try {
        await libraryService.deleteDictionaryEntry(
          entry.id,
        );

        closeWordCard();
        await refreshLibraryViews();

        if (
          state.activePanel ===
          "dictionary"
        ) {
          openSidePanel("dictionary");
        }
      } catch (error) {
        deleteStatus.textContent =
          error instanceof Error
            ? error.message
            : "This word could not be removed.";

        deleteButton.disabled = false;
      }
    },
  );

  danger.append(
    dangerCopy,
    deleteButton,
    deleteStatus,
  );

  wrapper.append(danger);

  elements.wordDialogBody.replaceChildren(wrapper);
  closeSidePanel();
  elements.wordDialog.showModal();
}

function setStatus(message) {
  if (elements.status) elements.status.textContent = message;
}

async function loadLibrary() {
  setStatus("The Library is opening…");
  try {
    const [items, lists, dictionary, tags] = await Promise.all([
      libraryService.listItems(),
      libraryService.listReadingLists(),
      libraryService.getDictionary(),
      libraryService.listTags(),
    ]);
    state.items = Array.isArray(items) ? items.filter((item) => !["manga", "podcast"].includes(item.type)) : [];
    state.lists = Array.isArray(lists) ? lists : [];
    state.dictionary = Array.isArray(dictionary) ? dictionary : [];
    state.tags = Array.isArray(tags) ? tags : [];
    renderCurrent();
    renderBooks();
    renderLists();
    renderDictionary();
    if (state.activePanel) openSidePanel(state.activePanel);
    setStatus(`${state.items.length} ${state.items.length === 1 ? "story" : "stories"} kept here`);
  } catch (error) {
    console.error("Library room load failed:", error);
    setStatus("The Library could not open yet.");
  }
}

function normalizeTagName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function ensureAddStoryTagsField() {
  if (!elements.form) return null;

  let field =
    elements.form.querySelector(
      "#library-add-story-tags",
    );

  if (field) return field;

  const notesField =
    elements.form
      .querySelector('[name="notes"]')
      ?.closest("label");

  field =
    document.createElement("section");

  field.id =
    "library-add-story-tags";

  field.className =
    "library-add-story-tags";

  field.innerHTML = `
    <div class="library-add-story-tags-heading">
      <div>
        <span>Tags</span>
        <p>Choose existing tags or create new ones for this story.</p>
      </div>
    </div>
    <div class="library-add-story-tag-options" data-library-add-tag-options></div>
    <label class="library-add-story-new-tag">
      <span>New tags</span>
      <input
        type="text"
        name="new_tags"
        autocomplete="off"
        placeholder="Cozy, fantasy, comfort read…"
      >
      <small>Separate several tags with commas.</small>
    </label>
  `;

  if (notesField) {
    notesField.after(field);
  } else {
    const actions =
      elements.form.querySelector(
        ".library-form-actions",
      );

    if (actions) {
      actions.before(field);
    } else {
      elements.form.append(field);
    }
  }

  return field;
}

function renderAddStoryTagsField() {
  const field =
    ensureAddStoryTagsField();

  const options =
    field?.querySelector(
      "[data-library-add-tag-options]",
    );

  if (!options) return;

  options.replaceChildren();

  if (!state.tags.length) {
    const empty =
      document.createElement("p");

    empty.className =
      "library-add-story-tags-empty";

    empty.textContent =
      "No tags exist yet. Create the first one below.";

    options.append(empty);
    return;
  }

  state.tags
    .slice()
    .sort((a, b) =>
      getTagName(a).localeCompare(
        getTagName(b),
      ),
    )
    .forEach((tag) => {
      const id =
        getTagId(tag);

      if (!id) return;

      const label =
        document.createElement("label");

      label.className =
        "library-add-story-tag-option";
      applyTagColor(label, tag);

      const input =
        document.createElement("input");

      input.type = "checkbox";
      input.name = "tag_ids";
      input.value = id;

      const text =
        document.createElement("span");

      text.textContent =
        getTagName(tag) ||
        "Untitled tag";

      label.append(input, text);
      options.append(label);
    });
}

function syncAddStoryUnitFields() {
  if (!elements.form) return;

  const typeSelect = elements.form.elements.type;
  if (typeSelect) {
    Array.from(typeSelect.options).forEach((option) => {
      if (["manga", "podcast"].includes(option.value)) option.remove();
    });
    if (!["book", "audiobook"].includes(typeSelect.value)) typeSelect.value = "book";
  }

  [
    ".library-page-total-field",
    ".library-page-current-field",
    ".library-time-total-field",
    ".library-time-current-field",
  ].forEach((selector) => elements.form.querySelector(selector)?.remove());
}

function syncAddStorySeriesFields() {
  if (!elements.form) return;

  const mode =
    elements.form.elements.series_mode;

  const nameField =
    elements.form.querySelector(
      ".library-series-name-field",
    );

  const numberField =
    elements.form.querySelector(
      ".library-series-number-field",
    );

  if (!mode || !nameField || !numberField) {
    return;
  }

  const visible =
    mode.value === "series";

  nameField.hidden = !visible;
  numberField.hidden = !visible;
}

async function openDialog() {
  elements.form?.reset();
  syncAddStorySeriesFields();
  syncAddStoryUnitFields();
  if (elements.formStatus) elements.formStatus.textContent = "";

  try {
    const tags =
      await libraryService.listTags();

    state.tags =
      Array.isArray(tags)
        ? tags
        : state.tags;
  } catch (error) {
    console.warn(
      "Library tags could not be loaded for Add a story:",
      error,
    );
  }

  renderAddStoryTagsField();
  elements.dialog?.showModal();
}
function closeDialog() { elements.dialog?.close(); }

async function submitItem(event) {
  event.preventDefault();
  const data = new FormData(elements.form);
  elements.formStatus.textContent = "The Library is making room…";
  try {
    const createdItem = await libraryService.createItem({
      type: data.get("type"), title: data.get("title"), author: data.get("author"),
      status: data.get("status"), cover_url: data.get("cover_url"),
      total_units: 0,
      current_unit: 0,
      notes: data.get("notes"),
      series_name:
        data.get("series_mode") === "series"
          ? String(data.get("series_name") || "").trim()
          : "",
      series_number:
        data.get("series_mode") === "series"
          ? Number(data.get("series_number") || 1)
          : 0,
    });

    const selectedTagIds =
      data.getAll("tag_ids")
        .map((value) => String(value))
        .filter(Boolean);

    const newTagNames =
      String(data.get("new_tags") || "")
        .split(",")
        .map(normalizeTagName)
        .filter(Boolean);

    for (const name of newTagNames) {
      let tag =
        state.tags.find(
          (candidate) =>
            getTagName(candidate)
              .toLocaleLowerCase() ===
            name.toLocaleLowerCase(),
        );

      if (!tag) {
        tag =
          await libraryService.createTag({
            name,
            color: getTagColor(name),
          });

        if (tag) state.tags.push(tag);
      }

      const tagId =
        getTagId(tag);

      if (
        tagId &&
        !selectedTagIds.includes(tagId)
      ) {
        selectedTagIds.push(tagId);
      }
    }

    for (const tagId of selectedTagIds) {
      await libraryService.attachTag(
        createdItem.id,
        tagId,
      );
    }

    closeDialog();
    await loadLibrary();
  } catch (error) {
    elements.formStatus.textContent = error instanceof Error ? error.message : "The Library could not save this story.";
  }
}

function connectEvents() {
  elements.filters.forEach((button) => button.addEventListener("click", () => {
    state.filter = button.dataset.libraryFilter || "all";
    elements.filters.forEach((item) => item.classList.toggle("is-active", item === button));
    renderBooks();
  }));
  elements.addButton?.addEventListener("click", openDialog);
  elements.closeButton?.addEventListener("click", closeDialog);
  elements.cancelButton?.addEventListener("click", closeDialog);
  elements.form?.addEventListener("submit", submitItem);
  elements.form?.elements.series_mode?.addEventListener(
    "change",
    syncAddStorySeriesFields,
  );

  elements.form?.elements.type?.addEventListener(
    "change",
    syncAddStoryUnitFields,
  );
  elements.storyDialogClose?.addEventListener("click", closeStoryCard);
  elements.wordDialogClose?.addEventListener("click", closeWordCard);
  document.addEventListener("grimoire:room-changed", (event) => {
    if (event.detail?.room === "library") loadLibrary();
    else closeSidePanel();
  });
  document.addEventListener("grimoire:library:item-created", loadLibrary);
  document.addEventListener("grimoire:library:item-updated", loadLibrary);
  document.addEventListener("grimoire:library:item-removed", loadLibrary);
}

function start() {
  if (!elements.room || state.initialized) return;
  state.initialized = true;
  ensureLibraryLayout();
  connectEvents();
  if (window.location.hash === "#library") loadLibrary();
}
start();
