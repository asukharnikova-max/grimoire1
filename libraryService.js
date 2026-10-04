import {
  homeCore,
} from "./homeCore.js";

const LIBRARY_API_URL =
  "https://functions.yandexcloud.net/d4epbt2pee77bk1s615b";

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createQueryString(parameters = {}) {
  const query =
    new URLSearchParams();

  Object.entries(parameters)
    .forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      query.set(
        key,
        String(value),
      );
    });

  const serialized =
    query.toString();

  return serialized
    ? `?${serialized}`
    : "";
}

async function readJsonResponse(
  response,
) {
  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The Library returned an unreadable response.",
    );
  }

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result?.error ||
      result?.message ||
      `Library request failed (${response.status}).`,
    );
  }

  return result;
}

function normalizeItem(source) {
  if (!source) {
    return null;
  }

  return {
    id: cleanText(source.id),
    type: cleanText(source.type),
    title: source.title ?? "",
    author: source.author ?? "",
    coverUrl:
      source.coverUrl ??
      source.cover_url ??
      "",
    status: cleanText(source.status),
    totalUnits:
      Number(
        source.totalUnits ??
        source.total_units ??
        0,
      ),
    currentUnit:
      Number(
        source.currentUnit ??
        source.current_unit ??
        0,
      ),
    notes: source.notes ?? "",
    seriesName:
      cleanText(
        source.seriesName ??
        source.series_name,
      ),
    seriesNumber:
      Number(
        source.seriesNumber ??
        source.series_number ??
        0,
      ),
    tags:
      Array.isArray(source.tags)
        ? source.tags
        : [],
    createdAt:
      source.createdAt ??
      source.created_at ??
      null,
    updatedAt:
      source.updatedAt ??
      source.updated_at ??
      null,
  };
}

function normalizeSession(source) {
  if (!source) {
    return null;
  }

  return {
    id: cleanText(source.id),
    libraryItemId:
      cleanText(
        source.libraryItemId ??
        source.library_item_id,
      ),
    sessionNumber:
      Number(
        source.sessionNumber ??
        source.session_number ??
        0,
      ),
    mode: cleanText(source.mode),
    status: cleanText(source.status),
    isReread:
      Boolean(
        source.isReread ??
        source.is_reread,
      ),
    startedAt:
      source.startedAt ??
      source.started_at ??
      null,
    finishedAt:
      source.finishedAt ??
      source.finished_at ??
      null,
    startUnit:
      Number(
        source.startUnit ??
        source.start_unit ??
        0,
      ),
    currentUnit:
      Number(
        source.currentUnit ??
        source.current_unit ??
        0,
      ),
    endUnit:
      Number(
        source.endUnit ??
        source.end_unit ??
        0,
      ),
    createdAt:
      source.createdAt ??
      source.created_at ??
      null,
    updatedAt:
      source.updatedAt ??
      source.updated_at ??
      null,
  };
}

function normalizeLog(source) {
  if (!source) {
    return null;
  }

  return {
    id: cleanText(source.id),
    libraryItemId:
      cleanText(
        source.libraryItemId ??
        source.library_item_id,
      ),
    readingSessionId:
      cleanText(
        source.readingSessionId ??
        source.reading_session_id,
      ),
    date:
      cleanText(
        source.date ??
        source.log_date,
      ),
    startUnit:
      Number(
        source.startUnit ??
        source.start_unit ??
        0,
      ),
    endUnit:
      Number(
        source.endUnit ??
        source.end_unit ??
        0,
      ),
    note: source.note ?? "",
    place: source.place ?? "",
    words:
      Array.isArray(source.words)
        ? source.words
        : [],
    createdAt:
      source.createdAt ??
      source.created_at ??
      null,
    updatedAt:
      source.updatedAt ??
      source.updated_at ??
      null,
  };
}

function itemToRegistryObject(item) {
  return {
    id: `library:${item.id}`,
    type: "library-item",
    title: item.title,
    subtitle: item.author,
    tags: [
      item.type,
      item.status,
    ].filter(Boolean),
    sourceId: item.id,
    room: "library",
    data: item,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

class LibraryService {
  constructor({
    apiUrl = LIBRARY_API_URL,
    core = homeCore,
  } = {}) {
    this.apiUrl = apiUrl;
    this.core = core;
    this.items = new Map();
    this.started = false;
  }

  async request(
    resource,
    {
      method = "GET",
      query = {},
      body = null,
    } = {},
  ) {
    if (
      typeof window.grimoireFetch !==
      "function"
    ) {
      throw new Error(
        "Protected access is not ready.",
      );
    }

    const url =
      `${this.apiUrl}${createQueryString({
        resource,
        ...query,
      })}`;

    const response =
      await window.grimoireFetch(
        url,
        {
          method,
          headers:
            body === null
              ? {
                  Accept:
                    "application/json",
                }
              : {
                  Accept:
                    "application/json",
                  "Content-Type":
                    "application/json",
                },
          ...(body === null
            ? {}
            : {
                body: JSON.stringify({
                  resource,
                  ...body,
                }),
              }),
        },
      );

    return readJsonResponse(
      response,
    );
  }

  emit(type, detail = {}) {
    const event =
      this.core.emit(
        type,
        detail,
      );

    document.dispatchEvent(
      new CustomEvent(
        `grimoire:${type}`,
        {
          detail,
        },
      ),
    );

    return event;
  }

  syncItem(itemSource) {
    const item =
      normalizeItem(itemSource);

    if (!item?.id) {
      return null;
    }

    this.items.set(
      item.id,
      item,
    );

    const registryObject =
      itemToRegistryObject(item);

    if (
      this.core.getObject(
        registryObject.id,
      )
    ) {
      this.core.updateObject(
        registryObject.id,
        registryObject,
      );
    } else {
      this.core.createObject(
        registryObject,
      );
    }

    return item;
  }

  removeSyncedItem(itemId) {
    const id = cleanText(itemId);

    this.items.delete(id);
    this.core.removeObject(
      `library:${id}`,
    );
  }

  async start() {
    if (this.started) {
      return this;
    }

    this.started = true;

    try {
      const items =
        await this.listItems();

      this.emit(
        "library:ready",
        {
          items,
        },
      );
    } catch (error) {
      this.started = false;

      this.emit(
        "library:error",
        {
          operation: "start",
          error,
          message:
            error instanceof Error
              ? error.message
              : "Unknown Library error",
        },
      );

      throw error;
    }

    return this;
  }

  async listItems(filters = {}) {
    const result =
      await this.request(
        "library-items",
        {
          query: {
            type: filters.type,
            status: filters.status,
          },
        },
      );

    const items =
      (result.items ?? [])
        .map(normalizeItem)
        .filter(Boolean);

    items.forEach(
      (item) =>
        this.syncItem(item),
    );

    return items;
  }

  async getItem(itemId) {
    const result =
      await this.request(
        "library-items",
        {
          query: {
            id: itemId,
          },
        },
      );

    return result.item
      ? this.syncItem(result.item)
      : null;
  }

  async createItem(data) {
    const result =
      await this.request(
        "library-items",
        {
          method: "POST",
          body: data,
        },
      );

    const item =
      this.syncItem(result.item);

    this.emit(
      "library:item-created",
      {
        item,
        itemId: result.itemId,
      },
    );

    return item;
  }

  async updateItem(itemId, changes) {
    const result =
      await this.request(
        "library-items",
        {
          method: "PATCH",
          body: {
            id: itemId,
            ...changes,
          },
        },
      );

    const item =
      this.syncItem(result.item);

    this.emit(
      "library:item-updated",
      {
        item,
        itemId,
      },
    );

    return item;
  }

  async deleteItem(itemId) {
    await this.request(
      "library-items",
      {
        method: "DELETE",
        query: {
          id: itemId,
        },
      },
    );

    this.removeSyncedItem(itemId);

    this.emit(
      "library:item-removed",
      {
        itemId,
      },
    );
  }

  async listSessions(filters = {}) {
    const result =
      await this.request(
        "reading-sessions",
        {
          query: {
            id: filters.id,
            library_item_id:
              filters.libraryItemId,
            status: filters.status,
          },
        },
      );

    if (result.session) {
      return [
        normalizeSession(
          result.session,
        ),
      ];
    }

    return (result.sessions ?? [])
      .map(normalizeSession)
      .filter(Boolean);
  }

  async startSession(data) {
    const result =
      await this.request(
        "reading-sessions",
        {
          method: "POST",
          body: data,
        },
      );

    const session =
      normalizeSession(
        result.session,
      );

    const item =
      this.syncItem(result.item);

    this.emit(
      "library:session-started",
      {
        session,
        item,
      },
    );

    return {
      session,
      item,
    };
  }

  async updateSession(
    sessionId,
    changes,
  ) {
    const result =
      await this.request(
        "reading-sessions",
        {
          method: "PATCH",
          body: {
            id: sessionId,
            ...changes,
          },
        },
      );

    const session =
      normalizeSession(
        result.session,
      );

    const item =
      this.syncItem(result.item);

    const eventType =
      session?.status === "finished"
        ? "library:session-finished"
        : session?.status === "dnf"
          ? "library:session-dnf"
          : "library:session-updated";

    this.emit(
      eventType,
      {
        session,
        item,
      },
    );

    return {
      session,
      item,
    };
  }

  finishSession(
    sessionId,
    currentUnit,
  ) {
    return this.updateSession(
      sessionId,
      {
        status: "finished",
        current_unit:
          currentUnit,
      },
    );
  }

  markSessionDnf(
    sessionId,
    currentUnit,
  ) {
    return this.updateSession(
      sessionId,
      {
        status: "dnf",
        current_unit:
          currentUnit,
      },
    );
  }

  async listLogs(filters = {}) {
    const result =
      await this.request(
        "reading-logs",
        {
          query: {
            id: filters.id,
            date: filters.date,
            library_item_id:
              filters.libraryItemId,
            reading_session_id:
              filters.readingSessionId,
          },
        },
      );

    if (result.log) {
      return [
        normalizeLog({
          ...result.log,
          words: result.words,
        }),
      ];
    }

    return (result.logs ?? [])
      .map(normalizeLog)
      .filter(Boolean);
  }

  async createLog(data) {
    const result =
      await this.request(
        "reading-logs",
        {
          method: "POST",
          body: data,
        },
      );

    const log =
      normalizeLog({
        ...result.log,
        words: result.words,
      });

    const session =
      normalizeSession(
        result.session,
      );

    const item =
      this.syncItem(result.item);

    this.emit(
      "library:log-created",
      {
        log,
        words:
          result.words ?? [],
        session,
        item,
      },
    );

    return {
      log,
      words:
        result.words ?? [],
      session,
      item,
    };
  }

  async deleteLog(logId) {
    await this.request(
      "reading-logs",
      {
        method: "DELETE",
        query: {
          id: logId,
        },
      },
    );

    this.emit(
      "library:log-removed",
      {
        logId,
      },
    );
  }

  async updateLog(logId, changes) {
    const result =
      await this.request(
        "reading-logs",
        {
          method: "PATCH",
          body: {
            id: logId,
            ...changes,
          },
        },
      );

    const log =
      normalizeLog(result.log);

    const session =
      normalizeSession(
        result.session,
      );

    const item =
      this.syncItem(result.item);

    this.emit(
      "library:log-updated",
      {
        log,
        session,
        item,
      },
    );

    return {
      log,
      session,
      item,
    };
  }

  async listTags() {
    const result =
      await this.request("tags");

    return result.tags ?? [];
  }

  async createTag(data) {
    const result =
      await this.request(
        "tags",
        {
          method: "POST",
          body: data,
        },
      );

    this.emit(
      "library:tag-created",
      {
        tag: result.tag,
      },
    );

    return result.tag;
  }

  async listItemTags(libraryItemId) {
    const result =
      await this.request(
        "tags",
        {
          query: {
            library_item_id:
              libraryItemId,
          },
        },
      );

    return result.tags ?? [];
  }

  async detachTag(
    libraryItemId,
    tagId,
  ) {
    const result =
      await this.request(
        "library-item-tags",
        {
          method: "DELETE",
          query: {
            library_item_id:
              libraryItemId,
            tag_id: tagId,
          },
        },
      );

    this.emit(
      "library:item-tags-updated",
      {
        itemId: libraryItemId,
        tags: result.tags ?? [],
      },
    );

    return result.tags ?? [];
  }

  async attachTag(
    libraryItemId,
    tagId,
  ) {
    const result =
      await this.request(
        "library-item-tags",
        {
          method: "POST",
          body: {
            library_item_id:
              libraryItemId,
            tag_id: tagId,
          },
        },
      );

    this.emit(
      "library:item-tags-updated",
      {
        itemId:
          libraryItemId,
        tags: result.tags ?? [],
      },
    );

    return result.tags ?? [];
  }

  async listReadingLists() {
    const result =
      await this.request(
        "reading-lists",
      );

    return result.lists ?? [];
  }

  async createReadingList(data) {
    const result =
      await this.request(
        "reading-lists",
        {
          method: "POST",
          body: data,
        },
      );

    this.emit(
      "library:list-created",
      {
        list: result.list,
      },
    );

    return result.list;
  }

  async addItemToReadingList(
    readingListId,
    libraryItemId,
    position = 0,
  ) {
    const result =
      await this.request(
        "reading-list-items",
        {
          method: "POST",
          body: {
            reading_list_id:
              readingListId,
            library_item_id:
              libraryItemId,
            position,
          },
        },
      );

    this.emit(
      "library:list-items-updated",
      {
        listId:
          readingListId,
        items: result.items ?? [],
      },
    );

    return result.items ?? [];
  }

  async deleteReadingList(readingListId) {
    await this.request(
      "reading-lists",
      {
        method: "DELETE",
        query: {
          id: readingListId,
        },
      },
    );

    this.emit(
      "library:list-removed",
      {
        listId: readingListId,
      },
    );
  }

  async createDictionaryEntry(data) {
    const result =
      await this.request(
        "dictionary",
        {
          method: "POST",
          body: data,
        },
      );

    this.emit(
      "library:dictionary-entry-created",
      {
        entry: result.entry,
        entryId: result.entryId,
      },
    );

    return result.entry;
  }

  async deleteDictionaryEntry(entryId) {
    await this.request(
      "dictionary",
      {
        method: "DELETE",
        query: {
          id: entryId,
        },
      },
    );

    this.emit(
      "library:dictionary-entry-removed",
      {
        entryId,
      },
    );
  }

  async getDictionary(filters = {}) {
    const result =
      await this.request(
        "dictionary",
        {
          query: {
            id: filters.id,
            library_item_id:
              filters.libraryItemId,
            reading_log_id:
              filters.readingLogId,
          },
        },
      );

    return result.entries ??
      (result.entry
        ? [result.entry]
        : []);
  }
}

export const libraryService =
  new LibraryService();

window.libraryService =
  libraryService;
