import {
  homeCore,
} from "./homeCore.js";

const WORKOUTS_API_URL =
  "https://functions.yandexcloud.net/d4e5lr7din6afqapf756";

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanLongText(value) {
  return typeof value === "string"
    ? value
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

async function readJsonResponse(response) {
  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The Workout Room returned an unreadable response.",
    );
  }

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result?.error ||
      result?.message ||
      `Workout request failed (${response.status}).`,
    );
  }

  return result;
}

function normalizeWorkout(source) {
  if (!source) {
    return null;
  }

  return {
    id:
      cleanText(
        source.id ??
        source.workoutId ??
        source.workout_id,
      ),

    date:
      cleanText(
        source.date ??
        source.workoutDate ??
        source.workout_date,
      ),

    durationMinutes:
      Number(
        source.durationMinutes ??
        source.duration_minutes ??
        0,
      ),

    distanceKm:
      Number(
        source.distanceKm ??
        source.distance_km ??
        0,
      ),

    calories:
      Number(
        source.calories ??
        0,
      ),

    companionType:
      cleanText(
        source.companionType ??
        source.companion_type,
      ),

    companionTitle:
      cleanLongText(
        source.companionTitle ??
        source.companion_title,
      ),

    notes:
      cleanLongText(
        source.notes,
      ),

    journalEntryId:
      cleanText(
        source.journalEntryId ??
        source.journal_entry_id,
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

function workoutToRegistryObject(workout) {
  return {
    id:
      `workout:${workout.id}`,

    type:
      "workout-session",

    title:
      `${workout.distanceKm || 0} km walk`,

    subtitle:
      `${workout.durationMinutes || 0} min`,

    tags: [
      "workout",
      workout.companionType,
    ].filter(Boolean),

    sourceId:
      workout.id,

    room:
      "workouts",

    data:
      workout,

    createdAt:
      workout.createdAt,

    updatedAt:
      workout.updatedAt,
  };
}

class WorkoutsService {
  constructor({
    apiUrl = WORKOUTS_API_URL,
    core = homeCore,
  } = {}) {
    this.apiUrl = apiUrl;
    this.core = core;
    this.workouts = new Map();
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
                body:
                  JSON.stringify({
                    resource,
                    ...body,
                  }),
              }),
        },
      );

    return readJsonResponse(response);
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

  syncWorkout(source) {
    const workout =
      normalizeWorkout(source);

    if (!workout?.id) {
      return null;
    }

    this.workouts.set(
      workout.id,
      workout,
    );

    const registryObject =
      workoutToRegistryObject(
        workout,
      );

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

    return workout;
  }

  async start() {
    if (this.started) {
      return this;
    }

    this.started = true;

    try {
      const workouts =
        await this.listWorkouts();

      this.emit(
        "workouts:ready",
        {
          workouts,
        },
      );
    } catch (error) {
      this.started = false;

      this.emit(
        "workouts:error",
        {
          operation:
            "start",

          error,

          message:
            error instanceof Error
              ? error.message
              : "Unknown Workout Room error",
        },
      );

      throw error;
    }

    return this;
  }

  async listWorkouts() {
    const result =
      await this.request(
        "workout-sessions",
      );

    const workouts =
      (result.workouts ?? [])
        .map(normalizeWorkout)
        .filter(Boolean);

    workouts.forEach(
      (workout) =>
        this.syncWorkout(
          workout,
        ),
    );

    return workouts;
  }

  async getWorkout(workoutId) {
    const result =
      await this.request(
        "workout-sessions",
        {
          query: {
            id:
              workoutId,
          },
        },
      );

    return result.workout
      ? this.syncWorkout(
          result.workout,
        )
      : null;
  }

  async createWorkout(data) {
    const result =
      await this.request(
        "workout-sessions",
        {
          method:
            "POST",

          body: {
            date:
              data.date,

            duration_minutes:
              data.durationMinutes,

            distance_km:
              data.distanceKm,

            calories:
              data.calories,

            companion_type:
              data.companionType,

            companion_title:
              data.companionTitle,

            notes:
              data.notes,
          },
        },
      );

    const workout =
      this.syncWorkout(
        result.workout,
      );

    this.emit(
      "workouts:session-created",
      {
        workout,
        workoutId:
          result.workoutId,
      },
    );

    return workout;
  }
}

export const workoutsService =
  new WorkoutsService();

window.workoutsService =
  workoutsService;
