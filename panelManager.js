/**
 * Grimoire Panel Manager
 *
 * One panel language for every object in the House.
 *
 * This module manages panel state and history only.
 * It does not know how a book, recipe, word or project should look.
 * Individual rooms provide the panel content later.
 */

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const createPanelId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return [
    "panel",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
};

export class PanelManager {
  constructor() {
    this.stack = [];
    this.listeners = new Set();
  }

  open(panel = {}) {
    const normalizedPanel =
      this.#normalizePanel(panel);

    this.stack.push(
      normalizedPanel,
    );

    this.#emit(
      "opened",
      normalizedPanel,
    );

    return normalizedPanel;
  }

  replace(panel = {}) {
    const normalizedPanel =
      this.#normalizePanel(panel);

    const previousPanel =
      this.current();

    if (this.stack.length > 0) {
      this.stack[
        this.stack.length - 1
      ] = normalizedPanel;
    } else {
      this.stack.push(
        normalizedPanel,
      );
    }

    this.#emit(
      "replaced",
      normalizedPanel,
      {
        previousPanel,
      },
    );

    return normalizedPanel;
  }

  back() {
    if (this.stack.length <= 1) {
      return this.close();
    }

    const closedPanel =
      this.stack.pop();

    const currentPanel =
      this.current();

    this.#emit(
      "back",
      currentPanel,
      {
        closedPanel,
      },
    );

    return currentPanel;
  }

  close() {
    if (this.stack.length === 0) {
      return null;
    }

    const closedPanels =
      [...this.stack];

    this.stack = [];

    this.#emit(
      "closed",
      null,
      {
        closedPanels,
      },
    );

    return null;
  }

  current() {
    return (
      this.stack[
        this.stack.length - 1
      ] ?? null
    );
  }

  previous() {
    if (this.stack.length < 2) {
      return null;
    }

    return this.stack[
      this.stack.length - 2
    ];
  }

  all() {
    return [...this.stack];
  }

  isOpen() {
    return this.stack.length > 0;
  }

  canGoBack() {
    return this.stack.length > 1;
  }

  depth() {
    return this.stack.length;
  }

  subscribe(listener) {
    if (
      typeof listener !==
      "function"
    ) {
      throw new TypeError(
        "Panel Manager listener must be a function.",
      );
    }

    this.listeners.add(
      listener,
    );

    return () => {
      this.listeners.delete(
        listener,
      );
    };
  }

  #normalizePanel(panel) {
    if (
      !panel ||
      typeof panel !== "object" ||
      Array.isArray(panel)
    ) {
      throw new TypeError(
        "A Grimoire panel must be a plain object.",
      );
    }

    const type =
      normalizeText(panel.type);

    if (!type) {
      throw new Error(
        "Every Grimoire panel needs a type.",
      );
    }

    const id =
      normalizeText(panel.id) ||
      createPanelId();

    const title =
      normalizeText(panel.title);

    const objectId =
      normalizeText(panel.objectId);

    return Object.freeze({
      ...panel,
      id,
      type,
      title,
      objectId:
        objectId || null,
      openedAt:
        panel.openedAt ??
        new Date().toISOString(),
    });
  }

  #emit(
    action,
    panel,
    extra = {},
  ) {
    const event =
      Object.freeze({
        action,
        panel,
        stack: this.all(),
        depth: this.depth(),
        canGoBack:
          this.canGoBack(),
        timestamp:
          new Date().toISOString(),
        ...extra,
      });

    this.listeners.forEach(
      (listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(
            "Grimoire Panel Manager listener failed:",
            error,
          );
        }
      },
    );
  }
}

export const panelManager =
  new PanelManager();
