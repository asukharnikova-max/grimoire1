/**
 * Grimoire Object Registry
 *
 * The House knows that something exists.
 * Individual rooms decide what that something means.
 */

const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return [
    "object",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
};

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map(normalizeText)
        .filter(Boolean),
    ),
  ];
};

const createSearchText = (object) => {
  return [
    object.title,
    object.subtitle,
    object.type,
    ...object.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
};

export class ObjectRegistry {
  constructor() {
    this.objects = new Map();
    this.listeners = new Set();
  }

  create(data = {}) {
    const now =
      new Date().toISOString();

    const object =
      this.#normalizeObject({
        ...data,
        id:
          normalizeText(data.id) ||
          createId(),
        createdAt:
          data.createdAt ?? now,
        updatedAt:
          data.updatedAt ?? now,
      });

    if (this.objects.has(object.id)) {
      throw new Error(
        `A Grimoire object with id "${object.id}" already exists.`,
      );
    }

    this.objects.set(
      object.id,
      object,
    );

    this.#emit(
      "created",
      object,
    );

    return object;
  }

  add(data = {}) {
    return this.create(data);
  }

  get(id) {
    const objectId =
      normalizeText(id);

    if (!objectId) {
      return null;
    }

    return (
      this.objects.get(objectId) ??
      null
    );
  }

  has(id) {
    return this.get(id) !== null;
  }

  update(id, changes = {}) {
    const existing =
      this.get(id);

    if (!existing) {
      throw new Error(
        `Grimoire object "${id}" was not found.`,
      );
    }

    const updated =
      this.#normalizeObject({
        ...existing,
        ...changes,
        id: existing.id,
        createdAt:
          existing.createdAt,
        updatedAt:
          new Date().toISOString(),
      });

    this.objects.set(
      updated.id,
      updated,
    );

    this.#emit(
      "updated",
      updated,
    );

    return updated;
  }

  remove(id) {
    const existing =
      this.get(id);

    if (!existing) {
      return false;
    }

    this.objects.delete(
      existing.id,
    );

    this.#emit(
      "removed",
      existing,
    );

    return true;
  }

  all() {
    return [
      ...this.objects.values(),
    ];
  }

  byType(type) {
    const objectType =
      normalizeText(type);

    if (!objectType) {
      return [];
    }

    return this.all().filter(
      (object) =>
        object.type === objectType,
    );
  }

  search(query) {
    const searchQuery =
      normalizeText(query)
        .toLocaleLowerCase();

    if (!searchQuery) {
      return this.all();
    }

    return this.all().filter(
      (object) =>
        createSearchText(
          object,
        ).includes(searchQuery),
    );
  }

  clear() {
    const removedObjects =
      this.all();

    this.objects.clear();

    removedObjects.forEach(
      (object) => {
        this.#emit(
          "removed",
          object,
        );
      },
    );
  }

  subscribe(listener) {
    if (
      typeof listener !==
      "function"
    ) {
      throw new TypeError(
        "Object Registry listener must be a function.",
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

  #normalizeObject(data) {
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      throw new TypeError(
        "A Grimoire object must be a plain object.",
      );
    }

    const id =
      normalizeText(data.id);

    const type =
      normalizeText(data.type);

    const title =
      normalizeText(data.title);

    if (!id) {
      throw new Error(
        "Every Grimoire object needs an id.",
      );
    }

    if (!type) {
      throw new Error(
        `Grimoire object "${id}" needs a type.`,
      );
    }

    if (!title) {
      throw new Error(
        `Grimoire object "${id}" needs a title.`,
      );
    }

    return Object.freeze({
      ...data,
      id,
      type,
      title,
      subtitle:
        normalizeText(
          data.subtitle,
        ),
      tags:
        normalizeTags(
          data.tags,
        ),
      createdAt:
        data.createdAt,
      updatedAt:
        data.updatedAt,
    });
  }

  #emit(action, object) {
    const event =
      Object.freeze({
        action,
        object,
        timestamp:
          new Date().toISOString(),
      });

    this.listeners.forEach(
      (listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(
            "Grimoire Object Registry listener failed:",
            error,
          );
        }
      },
    );
  }
}

export const objectRegistry =
  new ObjectRegistry();
