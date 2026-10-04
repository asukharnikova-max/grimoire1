function getNavigationPairs() {
  return Array.from(
    document.querySelectorAll(
      ".home-navigation",
    ),
  )
    .map((navigation) => {
      const button =
        navigation.querySelector(
          ".navigation-button",
        );

      const menu =
        navigation.querySelector(
          ".navigation-menu",
        );

      if (!button || !menu) {
        return null;
      }

      return {
        navigation,
        button,
        menu,
      };
    })
    .filter(Boolean);
}

const navigationPairs =
  getNavigationPairs();

function isMenuOpen(pair) {
  return (
    pair?.button?.getAttribute(
      "aria-expanded",
    ) === "true"
  );
}

function openNavigation(pair) {
  if (!pair) {
    return;
  }

  navigationPairs.forEach(
    (otherPair) => {
      if (otherPair !== pair) {
        closeNavigation(otherPair);
      }
    },
  );

  pair.menu.hidden = false;

  pair.button.setAttribute(
    "aria-expanded",
    "true",
  );
}

function closeNavigation(pair) {
  if (!pair) {
    return;
  }

  pair.menu.hidden = true;

  pair.button.setAttribute(
    "aria-expanded",
    "false",
  );
}

function toggleNavigation(pair) {
  if (isMenuOpen(pair)) {
    closeNavigation(pair);
    return;
  }

  openNavigation(pair);
}

function handleDocumentClick(event) {
  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  navigationPairs.forEach((pair) => {
    if (
      !pair.navigation.contains(target)
    ) {
      closeNavigation(pair);
    }
  });
}

function handleKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  const openPair =
    navigationPairs.find(
      isMenuOpen,
    );

  if (!openPair) {
    return;
  }

  closeNavigation(openPair);
  openPair.button.focus();
}

function connectNavigation() {
  if (
    navigationPairs.length === 0
  ) {
    return;
  }

  navigationPairs.forEach((pair) => {
    pair.button.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        toggleNavigation(pair);
      },
    );

    pair.menu.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        const target =
          event.target;

        if (
          target instanceof Element &&
          target.closest(
            "[data-room-link]",
          )
        ) {
          closeNavigation(pair);
        }
      },
    );
  });

  document.addEventListener(
    "click",
    handleDocumentClick,
  );

  document.addEventListener(
    "keydown",
    handleKeydown,
  );
}

connectNavigation();
