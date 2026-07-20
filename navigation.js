const navigationButton =
  document.getElementById(
    "navigation-button",
  );

const navigationMenu =
  document.getElementById(
    "navigation-menu",
  );

function isMenuOpen() {
  return (
    navigationButton?.getAttribute(
      "aria-expanded",
    ) === "true"
  );
}

function openNavigation() {
  if (
    !navigationButton ||
    !navigationMenu
  ) {
    return;
  }

  navigationMenu.hidden = false;

  navigationButton.setAttribute(
    "aria-expanded",
    "true",
  );
}

function closeNavigation() {
  if (
    !navigationButton ||
    !navigationMenu
  ) {
    return;
  }

  navigationMenu.hidden = true;

  navigationButton.setAttribute(
    "aria-expanded",
    "false",
  );
}

function toggleNavigation() {
  if (isMenuOpen()) {
    closeNavigation();
    return;
  }

  openNavigation();
}

function handleDocumentClick(event) {
  if (
    !navigationButton ||
    !navigationMenu
  ) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  const clickedButton =
    navigationButton.contains(target);

  const clickedMenu =
    navigationMenu.contains(target);

  if (
    !clickedButton &&
    !clickedMenu
  ) {
    closeNavigation();
  }
}

function handleKeydown(event) {
  if (
    event.key === "Escape" &&
    isMenuOpen()
  ) {
    closeNavigation();

    navigationButton?.focus();
  }
}

function connectNavigation() {
  if (
    !navigationButton ||
    !navigationMenu
  ) {
    return;
  }

  navigationButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      toggleNavigation();
    },
  );

  navigationMenu.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      const target = event.target;
      if (target instanceof Element && target.closest("[data-room-link]")) {
        closeNavigation();
      }
    },
  );

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

