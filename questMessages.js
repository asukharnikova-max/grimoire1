export const questDifficulties = {
  micro: {
    value: "micro",
    label: "Small",
    cardLabel: "SMALL",
    description: "A little thing that still counts.",
  },

  regular: {
    value: "regular",
    label: "Everyday",
    cardLabel: "EVERYDAY",
    description: "A clear task for an ordinary day.",
  },

  boss: {
    value: "boss",
    label: "Big",
    cardLabel: "BIG",
    description: "Something that may need more room.",
  },
};

export const questCategories = {
  shopping: {
    key: "shopping",
    label: "Shopping",
    emoji: "🛒",
    color: "rose",

    messages: {
      micro: [
        "A small errand before the cupboards start complaining.",
        "One useful thing can now leave your head.",
        "A quick supply run for the household.",
      ],

      regular: [
        "The shopping bag has accepted this task.",
        "The cupboards will appreciate the reinforcements.",
        "A practical journey into the outside world.",
      ],

      boss: [
        "A serious expedition. The shopping list should probably come too.",
        "The cupboards have submitted a rather ambitious request.",
        "The house recommends sturdy bags and realistic expectations.",
      ],
    },
  },

  cooking: {
    key: "cooking",
    label: "Cooking",
    emoji: "🍳",
    color: "gold",

    messages: {
      micro: [
        "A small kitchen task before hunger becomes theatrical.",
        "The kitchen is ready for one quick favour.",
        "A little preparation will make later much easier.",
      ],

      regular: [
        "The kitchen is ready when you are.",
        "A warm meal is a perfectly respectable achievement.",
        "The pans have been informed.",
      ],

      boss: [
        "The kitchen recommends a plan, clear surfaces and perhaps music.",
        "A considerable cooking task has entered the house.",
        "The pans appear nervous, but we believe in them.",
      ],
    },
  },

  cleaning: {
    key: "cleaning",
    label: "Cleaning",
    emoji: "🧹",
    color: "sage",

    messages: {
      micro: [
        "One small corner at a time.",
        "A tiny act of rebellion against the mess.",
        "This should make the room breathe a little easier.",
      ],

      regular: [
        "The dust has enjoyed its stay long enough.",
        "A little order may make the whole day feel lighter.",
        "The house is prepared to supervise from a safe distance.",
      ],

      boss: [
        "The wardrobe has enjoyed diplomatic immunity for long enough.",
        "The house believes this particular chaos has become overconfident.",
        "We shall approach the mess with courage and perhaps snacks.",
      ],
    },
  },

  workout: {
    key: "workout",
    label: "Workout",
    emoji: "👟",
    color: "blue",

    messages: {
      micro: [
        "A little movement still changes the shape of the day.",
        "One small step is already movement.",
        "The walking shoes have received a polite invitation.",
      ],

      regular: [
        "A little movement might make the day feel lighter.",
        "The walking shoes have been informed.",
        "The path only asks for the first step.",
      ],

      boss: [
        "An ambitious movement plan. Pacing is strongly encouraged.",
        "The shoes appear ready for something dramatic.",
        "The house recommends water, music and no heroic nonsense.",
      ],
    },
  },

  reading: {
    key: "reading",
    label: "Reading",
    emoji: "📖",
    color: "plum",

    messages: {
      micro: [
        "A few pages are enough to reopen the door.",
        "The story has kept your place.",
        "One page still counts as returning.",
      ],

      regular: [
        "The story is waiting where you left it.",
        "The book has been waiting very patiently.",
        "Another small visit to a different world.",
      ],

      boss: [
        "A considerable reading plan. The bookmark has been warned.",
        "A long road lies between these covers.",
        "The book appears confident. We shall see about that.",
      ],
    },
  },

  trips: {
    key: "trips",
    label: "Trips",
    emoji: "🚋",
    color: "sky",

    messages: {
      micro: [
        "A small journey beyond the front door.",
        "The outside world has been added to the plan.",
        "A quick trip, then safely home again.",
      ],

      regular: [
        "The road has been informed of your arrival.",
        "A little journey has found its place in the day.",
        "The house will keep your spot warm.",
      ],

      boss: [
        "A serious expedition requires snacks and charged devices.",
        "The house recommends checking the route twice and then trusting it.",
        "A bigger journey has entered today's plans.",
      ],
    },
  },

  selfCare: {
    key: "selfCare",
    label: "Self-care",
    emoji: "🧴",
    color: "pink",

    messages: {
      micro: [
        "A small ritual of looking after yourself.",
        "A little care can soften the whole day.",
        "This moment belongs to you.",
      ],

      regular: [
        "This appointment with yourself is officially approved.",
        "The mirror has been asked to remain polite.",
        "A little care can change the texture of a day.",
      ],

      boss: [
        "A full maintenance ritual has entered the schedule.",
        "The house supports this ambitious level of pampering.",
        "A considerable self-care plan. Robes are encouraged.",
      ],
    },
  },

  appointment: {
    key: "appointment",
    label: "Appointment",
    emoji: "📅",
    color: "amber",

    messages: {
      micro: [
        "A small appointment has been safely removed from your head.",
        "The calendar will remember this for you.",
        "One less date to carry around mentally.",
      ],

      regular: [
        "The appointment now has a proper place to wait.",
        "The calendar has accepted responsibility for this.",
        "You no longer need to keep repeating this date in your head.",
      ],

      boss: [
        "An important appointment has entered the calendar.",
        "The house will help keep this one from disappearing into the void.",
        "A serious date, now safely held somewhere other than your brain.",
      ],
    },
  },

  crafts: {
    key: "crafts",
    label: "Crafts",
    emoji: "🧵",
    color: "lavender",

    messages: {
      micro: [
        "A few quiet stitches will keep the project warm.",
        "One small mark is still progress.",
        "The craft corner has been saving your place.",
      ],

      regular: [
        "A quiet project is still a living project.",
        "The threads appear ready for negotiations.",
        "Small progress will still be visible tomorrow.",
      ],

      boss: [
        "A bigger creative plan has entered the craft corner.",
        "The threads have organised themselves into a minor rebellion.",
        "The house recommends patience, good light and absolutely no counting panic.",
      ],
    },
  },

  general: {
    key: "general",
    label: "General",
    emoji: "✦",
    color: "neutral",

    messages: {
      micro: [
        "A tiny task with excellent manners.",
        "A little thing that will make the day lighter.",
        "Small enough to begin without a committee meeting.",
        "One small promise to your future self.",
      ],

      regular: [
        "One clear step is enough to begin.",
        "The task has been safely removed from your head.",
        "A good, ordinary task for an ordinary human day.",
        "A little progress will be more than enough.",
      ],

      boss: [
        "A bigger task has entered the house.",
        "The house recommends courage, snacks and realistic expectations.",
        "This task looks dramatic, but so does everything before it begins.",
        "We shall deal with this one piece at a time.",
      ],
    },
  },
};

export const questCategoryOptions = Object.values(questCategories).map(
  ({ key, label, emoji, color }) => ({
    key,
    label,
    emoji,
    color,
  }),
);

export const questDifficultyOptions = Object.values(questDifficulties);

const completedMessages = {
  micro: [
    "A small thing, now safely behind you.",
    "Tiny task, properly finished.",
    "One less thought rattling around the house.",
    "The day is already a little lighter.",
  ],

  regular: [
    "One less thing waiting by the door.",
    "Done and tucked away.",
    "The task has officially stopped haunting the hallway.",
    "The house witnessed the entire success.",
  ],

  boss: [
    "A big task is finally behind you. Tea seems appropriate.",
    "A heavy door has finally closed behind you.",
    "The house would like the record to show that you did it.",
    "Big task complete. The furniture may now relax.",
  ],
};

function randomItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return items[Math.floor(Math.random() * items.length)];
}

export function getQuestCategoryDetails(categoryKey = "general") {
  const safeCategoryKey = questCategories[categoryKey]
    ? categoryKey
    : "general";

  const category = questCategories[safeCategoryKey];

  return {
    key: safeCategoryKey,
    label: category.label,
    emoji: category.emoji,
    color: category.color,
  };
}

export function getQuestDifficultyDetails(difficulty = "regular") {
  return questDifficulties[difficulty] ?? questDifficulties.regular;
}

export function createQuestHouseMessage({
  category = "general",
  difficulty = "regular",
} = {}) {
  const safeCategoryKey = questCategories[category]
    ? category
    : "general";

  const safeDifficulty = questDifficulties[difficulty]
    ? difficulty
    : "regular";

  const messages =
    questCategories[safeCategoryKey]?.messages?.[safeDifficulty] ??
    questCategories.general.messages.regular;

  return randomItem(messages);
}

export function createCompletedQuestMessage(difficulty = "regular") {
  return randomItem(
    completedMessages[difficulty] ?? completedMessages.regular,
  );
}
