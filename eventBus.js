/**
 * Grimoire Event Bus
 *
 * One event can create many consequences.
 *
 * The Event Bus does not decide what an event means.
 * It only carries events safely between parts of the House.
 */

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const createEventId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return [
    "event",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
};

export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.history = [];
  }

  emit(type, detail = {}) {
    const eventType =
      normalizeText(type);

    if (!eventType) {
      throw new Error(
        "Every Grimoire event needs a type.",
      );
    }

    const event =
      Object.freeze({
        id: createEventId(),
        type: eventType,
        detail:
          detail &&
          typeof detail === "object" &&
          !Array.isArray(detail)
            ? Object.freeze({
                ...detail,
              })
            : Object.freeze({
                value: detail,
              }),
        timestamp:
          new Date().toISOString(),
      });

    this.history.push(event);

    this.#notify(
      eventType,
      event,
    );

    this.#notify(
      "*",
      event,
    );

    return event;
  }

  on(type, listener) {
    const eventType =
      normalizeText(type);

    if (!eventType) {
      throw new Error(
        "An event listener needs an event type.",
      );
    }

    if (
      typeof listener !==
      "function"
    ) {
      throw new TypeError(
        "An Event Bus listener must be a function.",
      );
    }

    if (
      !this.listeners.has(
        eventType,
      )
    ) {
      this.listeners.set(
        eventType,
        new Set(),
      );
    }

    const listenersForType =
      this.listeners.get(
        eventType,
      );

    listenersForType.add(
      listener,
    );

    return () => {
      this.off(
        eventType,
        listener,
      );
    };
  }

  once(type, listener) {
    if (
      typeof listener !==
      "function"
    ) {
      throw new TypeError(
        "An Event Bus listener must be a function.",
      );
    }

    let unsubscribe =
      null;

    const onceListener =
      (event) => {
        unsubscribe?.();
        listener(event);
      };

    unsubscribe =
      this.on(
        type,
        onceListener,
      );

    return unsubscribe;
  }

  off(type, listener) {
    const eventType =
      normalizeText(type);

    const listenersForType =
      this.listeners.get(
        eventType,
      );

    if (!listenersForType) {
      return false;
    }

    const removed =
      listenersForType.delete(
        listener,
      );

    if (
      listenersForType.size === 0
    ) {
      this.listeners.delete(
        eventType,
      );
    }

    return removed;
  }

  clear(type) {
    const eventType =
      normalizeText(type);

    if (!eventType) {
      this.listeners.clear();
      return;
    }

    this.listeners.delete(
      eventType,
    );
  }

  allHistory() {
    return [...this.history];
  }

  historyByType(type) {
    const eventType =
      normalizeText(type);

    if (!eventType) {
      return [];
    }

    return this.history.filter(
      (event) =>
        event.type === eventType,
    );
  }

  clearHistory() {
    this.history = [];
  }

  #notify(type, event) {
    const listenersForType =
      this.listeners.get(type);

    if (!listenersForType) {
      return;
    }

    listenersForType.forEach(
      (listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(
            `Grimoire Event Bus listener failed for "${type}":`,
            error,
          );
        }
      },
    );
  }
}

export const eventBus =
  new EventBus();
