/**
 * Grimoire Home Core
 *
 * The quiet centre of the House.
 *
 * Object Registry knows what lives here.
 * Panel Manager knows what is currently open.
 * Event Bus carries every change through the House.
 */

import {
  objectRegistry,
} from "./objectRegistry.js";

import {
  panelManager,
} from "./panelManager.js";

import {
  eventBus,
} from "./eventBus.js";

export class HomeCore {
  constructor({
    objects = objectRegistry,
    panels = panelManager,
    events = eventBus,
  } = {}) {
    this.objects = objects;
    this.panels = panels;
    this.events = events;

    this.started = false;
    this.unsubscribeFromObjects =
      null;
    this.unsubscribeFromPanels =
      null;
  }

  start() {
    if (this.started) {
      return this;
    }

    this.unsubscribeFromObjects =
      this.objects.subscribe(
        (registryEvent) => {
          this.events.emit(
            `object:${registryEvent.action}`,
            {
              object:
                registryEvent.object,
              registryEvent,
            },
          );
        },
      );

    this.unsubscribeFromPanels =
      this.panels.subscribe(
        (panelEvent) => {
          this.events.emit(
            `panel:${panelEvent.action}`,
            {
              panel:
                panelEvent.panel,
              panelEvent,
            },
          );
        },
      );

    this.started = true;

    this.events.emit(
      "home:started",
      {
        startedAt:
          new Date().toISOString(),
      },
    );

    return this;
  }

  stop() {
    if (!this.started) {
      return this;
    }

    this.unsubscribeFromObjects?.();
    this.unsubscribeFromPanels?.();

    this.unsubscribeFromObjects =
      null;
    this.unsubscribeFromPanels =
      null;

    this.started = false;

    this.events.emit(
      "home:stopped",
      {
        stoppedAt:
          new Date().toISOString(),
      },
    );

    return this;
  }

  createObject(data) {
    return this.objects.create(data);
  }

  getObject(id) {
    return this.objects.get(id);
  }

  updateObject(id, changes) {
    return this.objects.update(
      id,
      changes,
    );
  }

  removeObject(id) {
    return this.objects.remove(id);
  }

  searchObjects(query) {
    return this.objects.search(
      query,
    );
  }

  openPanel(panel) {
    return this.panels.open(panel);
  }

  replacePanel(panel) {
    return this.panels.replace(panel);
  }

  goBack() {
    return this.panels.back();
  }

  closePanel() {
    return this.panels.close();
  }

  emit(type, detail) {
    return this.events.emit(
      type,
      detail,
    );
  }

  on(type, listener) {
    return this.events.on(
      type,
      listener,
    );
  }

  once(type, listener) {
    return this.events.once(
      type,
      listener,
    );
  }
}

export const homeCore =
  new HomeCore();
