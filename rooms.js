import {
  initCalendar,
  openEventCreator,
} from "./calendar.js?v=4";

const rooms =
  Array.from(
    document.querySelectorAll(
      "[data-room]",
    ),
  );

const roomLinks =
  Array.from(
    document.querySelectorAll(
      "[data-room-link]",
    ),
  );

function getRoomNameFromHash() {
  const value =
    window.location.hash
      .replace(/^#/, "")
      .trim();

  return value || "home";
}

function roomExists(name) {
  return rooms.some(
    (room) =>
      room.dataset.room === name,
  );
}

function updateRoomLinks(
  activeRoom,
) {
  roomLinks.forEach((link) => {
    const isActive =
      link.dataset.roomLink ===
      activeRoom;

    link.classList.toggle(
      "is-current",
      isActive,
    );

    if (isActive) {
      link.setAttribute(
        "aria-current",
        "page",
      );
    } else {
      link.removeAttribute(
        "aria-current",
      );
    }
  });
}

async function initializeRoom(name) {
  if (name === "calendar") {
    await initCalendar();
  }
}

export async function openRoom(
  requestedRoom,
  {
    updateHash = true,
  } = {},
) {
  const roomName =
    roomExists(requestedRoom)
      ? requestedRoom
      : "home";

  rooms.forEach((room) => {
    room.hidden =
      room.dataset.room !==
      roomName;
  });

  updateRoomLinks(roomName);

  await initializeRoom(
    roomName,
  );

  if (updateHash) {
    const nextHash =
      `#${roomName}`;

    if (
      window.location.hash !==
      nextHash
    ) {
      window.history.replaceState(
        null,
        "",
        nextHash,
      );
    }
  }

  window.scrollTo({
    top: 0,
    behavior: "auto",
  });
}

function connectRoomLinks() {
  roomLinks.forEach((link) => {
    link.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();

        const roomName =
          link.dataset.roomLink;

        if (!roomName) {
          return;
        }

        await openRoom(
          roomName,
        );

        document.dispatchEvent(
          new CustomEvent(
            "grimoire:room-changed",
            {
              detail: {
                room:
                  roomExists(
                    roomName,
                  )
                    ? roomName
                    : "home",
              },
            },
          ),
        );
      },
    );
  });
}


function connectHomeEventButton() {
  const button =
    document.getElementById(
      "home-add-event-button",
    );

  button?.addEventListener(
    "click",
    async () => {
      await openEventCreator();
    },
  );
}

function connectHashNavigation() {
  window.addEventListener(
    "hashchange",
    async () => {
      await openRoom(
        getRoomNameFromHash(),
        {
          updateHash: false,
        },
      );
    },
  );
}

async function startRooms() {
  if (rooms.length === 0) {
    return;
  }

  connectRoomLinks();
  connectHomeEventButton();
  connectHashNavigation();

  await openRoom(
    getRoomNameFromHash(),
    {
      updateHash: false,
    },
  );
}

startRooms();
