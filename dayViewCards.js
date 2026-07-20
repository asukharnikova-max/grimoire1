const cardRegistry =
  new Map();

function cleanId(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeOrder(value) {
  return Number.isFinite(value)
    ? value
    : 100;
}

function validateCard(card) {
  if (
    !card ||
    typeof card !== "object"
  ) {
    throw new Error(
      "A Day View card must be an object.",
    );
  }

  const id =
    cleanId(card.id);

  if (!id) {
    throw new Error(
      "A Day View card needs an id.",
    );
  }

  if (
    typeof card.load !==
    "function"
  ) {
    throw new Error(
      `Day View card "${id}" needs a load function.`,
    );
  }

  if (
    typeof card.render !==
    "function"
  ) {
    throw new Error(
      `Day View card "${id}" needs a render function.`,
    );
  }

  return {
    id,

    order:
      normalizeOrder(
        card.order,
      ),

    load:
      card.load,

    render:
      card.render,

    shouldShow:
      typeof card.shouldShow ===
      "function"
        ? card.shouldShow
        : () => true,
  };
}

export function registerDayViewCard(
  card,
) {
  const normalized =
    validateCard(card);

  cardRegistry.set(
    normalized.id,
    normalized,
  );

  return () => {
    unregisterDayViewCard(
      normalized.id,
    );
  };
}

export function unregisterDayViewCard(
  cardId,
) {
  const id =
    cleanId(cardId);

  if (!id) {
    return false;
  }

  return cardRegistry.delete(
    id,
  );
}

export function hasDayViewCard(
  cardId,
) {
  const id =
    cleanId(cardId);

  return id
    ? cardRegistry.has(id)
    : false;
}

export function getDayViewCards() {
  return Array.from(
    cardRegistry.values(),
  ).sort(
    (left, right) => {
      if (
        left.order !==
        right.order
      ) {
        return (
          left.order -
          right.order
        );
      }

      return left.id.localeCompare(
        right.id,
      );
    },
  );
}

export async function loadDayViewCards(
  date,
) {
  const cards =
    getDayViewCards();

  const results =
    await Promise.all(
      cards.map(
        async (card) => {
          try {
            const data =
              await card.load(
                date,
              );

            const visible =
              await card.shouldShow(
                data,
                date,
              );

            return {
              id:
                card.id,

              order:
                card.order,

              card,

              data,

              visible:
                Boolean(
                  visible,
                ),

              error:
                null,
            };
          } catch (error) {
            console.error(
              `Day View card "${card.id}" failed to load:`,
              error,
            );

            return {
              id:
                card.id,

              order:
                card.order,

              card,

              data:
                null,

              visible:
                true,

              error,
            };
          }
        },
      ),
    );

  return results.filter(
    (result) =>
      result.visible,
  );
}

export function renderDayViewCard(
  result,
  date,
) {
  if (
    !result ||
    !result.card
  ) {
    return null;
  }

  if (result.error) {
    const fallback =
      document.createElement(
        "section",
      );

    fallback.className =
      "day-view-section day-view-card-error";

    const title =
      document.createElement(
        "h3",
      );

    title.textContent =
      "This memory is resting";

    const message =
      document.createElement(
        "p",
      );

    message.textContent =
      "The House could not open this part of the day yet.";

    fallback.append(
      title,
      message,
    );

    return fallback;
  }

  try {
    const rendered =
      result.card.render(
        result.data,
        date,
      );

    return rendered instanceof
      HTMLElement
      ? rendered
      : null;
  } catch (error) {
    console.error(
      `Day View card "${result.id}" failed to render:`,
      error,
    );

    return null;
  }
}

export function clearDayViewCards() {
  cardRegistry.clear();
}
