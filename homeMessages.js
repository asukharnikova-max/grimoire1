export const homeMessages = {
  mood: {
    joyful: [
      "The day feels a little brighter.",
      "There's room for joy today.",
      "Even quiet happiness deserves a place.",
      "A little sunshine found its way inside.",
      "The house likes this feeling.",
    ],

    calm: [
      "Everything feels peacefully unhurried.",
      "Some days are simply gentle.",
      "Calm has its own kind of magic.",
      "The house feels wonderfully quiet today.",
      "Nothing needs to rush.",
    ],

    okay: [
      "An ordinary day is still worth remembering.",
      "Not every page needs fireworks.",
      "Today can simply be today.",
      "Steady days have their own beauty.",
      "The ordinary often becomes memorable.",
    ],

    tired: [
      "We'll keep today gentle.",
      "Heavy days deserve soft places too.",
      "Nothing needs to be solved right now.",
      "The house is just as warm today.",
      "Today asks for kindness.",
    ],

    overwhelmed: [
      "One step is enough.",
      "We'll make today a little smaller.",
      "Rest belongs here too.",
      "The kettle is on. That's a start.",
      "Nothing asks you to be perfect today.",
    ],
  },

  energy: {
    high: [
      "The day seems ready for adventures.",
      "Let's put that energy somewhere fun.",
      "Momentum has arrived.",
      "A wonderful day to begin something.",
      "We'll make good use of today.",
    ],

    medium: [
      "Steady energy is good company.",
      "There's plenty of time.",
      "Today has a comfortable pace.",
      "We'll move one thing at a time.",
      "No need to hurry.",
    ],

    low: [
      "Slow is still moving.",
      "We'll work with today's energy.",
      "Gentle days matter too.",
      "There is no rush here.",
      "Small steps are still steps.",
    ],

    exhausted: [
      "Today is asking for softness.",
      "Let's not carry more than we need.",
      "Rest is part of growing too.",
      "The house will wait.",
      "You don't have to earn your rest.",
    ],
  },

  outside: {
    single: {
      sun: [
        "Sunlight has found the windows today.",
        "Warm light is resting across the rooms.",
        "The sun is making itself useful.",
      ],

      clouds: [
        "Soft clouds are keeping watch outside.",
        "The sky has wrapped itself in clouds.",
        "The clouds have settled in for a while.",
      ],

      rain: [
        "Rain is keeping the house company.",
        "Raindrops are tapping gently on the windows.",
        "The roof has found its rhythm today.",
      ],

      storm: [
        "The sky has chosen drama today.",
        "A storm is making itself heard outside.",
        "The windows are listening to the thunder.",
      ],

      snow: [
        "Snow has quieted the world outside.",
        "Everything looks softer beneath the snow.",
        "Winter left a little magic beyond the windows.",
      ],

      wind: [
        "The wind is wandering around the house.",
        "The trees refuse to stand still today.",
        "The wind appears to have several opinions.",
      ],

      fog: [
        "Mist has hidden the edges of the world.",
        "Everything beyond the windows feels mysterious.",
        "The fog has softened the morning.",
      ],

      stars: [
        "The stars are keeping the house company tonight.",
        "The sky is beautifully clear tonight.",
        "The evening has filled itself with stars.",
      ],

      freezing: [
        "The air outside has turned properly freezing.",
        "It is bitterly cold beyond the windows today.",
        "The world outside is firmly in freezing territory.",
      ],

      cold: [
        "Cold air has settled outside today.",
        "There is a definite chill beyond the windows.",
        "The day outside has a crisp, cold edge.",
      ],

      cool: [
        "The air outside feels pleasantly cool.",
        "A cool day has settled beyond the windows.",
        "There is a fresh coolness in the air today.",
      ],

      mild: [
        "The air outside feels wonderfully mild.",
        "It is a gentle, mild sort of day outside.",
        "The temperature has found a comfortable middle ground.",
      ],

      warm: [
        "Warm air has settled around the house today.",
        "There is a lovely warmth beyond the windows.",
        "The day outside feels comfortably warm.",
      ],

      hot: [
        "The heat has properly arrived outside.",
        "It is decidedly hot beyond the windows today.",
        "The world outside is running rather warm today.",
      ],

      "very-hot": [
        "The world outside appears to be melting.",
        "It is very hot beyond the windows today.",
        "The heat outside has become a whole event.",
      ],
    },

    openings: {
      sun: [
        "Sunlight",
        "Warm light",
        "A bright sky",
      ],

      clouds: [
        "Soft clouds",
        "A quiet grey sky",
        "Clouds",
      ],

      rain: [
        "Gentle rain",
        "Raindrops",
        "The rain",
      ],

      storm: [
        "Thunder",
        "A dramatic storm",
        "The restless sky",
      ],

      snow: [
        "Soft snow",
        "Fresh snow",
        "The winter sky",
      ],

      wind: [
        "Wandering wind",
        "A restless breeze",
        "The wind",
      ],

      fog: [
        "Morning mist",
        "Soft fog",
        "The hidden world outside",
      ],

      stars: [
        "A clear night",
        "The stars",
        "The evening sky",
      ],

      freezing: [
        "Freezing air",
        "Bitter cold",
        "A properly freezing day",
      ],

      cold: [
        "Cold air",
        "A crisp chill",
        "The cold",
      ],

      cool: [
        "Cool air",
        "A fresh chill",
        "The cool weather",
      ],

      mild: [
        "Mild air",
        "A gentle temperature",
        "The mild weather",
      ],

      warm: [
        "Warm air",
        "A gentle warmth",
        "The warm weather",
      ],

      hot: [
        "Hot air",
        "The heat",
        "A hot day",
      ],

      "very-hot": [
        "Serious heat",
        "Very hot air",
        "The rather dramatic heat",
      ],
    },

    pairEndings: [
      "are keeping the house company.",
      "have settled quietly beyond the windows.",
      "have made the world outside feel a little different.",
      "are sharing the day outside.",
      "have found their way to the house.",
    ],

    manyEndings: [
      "have turned the world outside into quite a story.",
      "are all competing for the windows' attention.",
      "have made the view outside especially memorable.",
      "are keeping the house thoroughly entertained.",
    ],
  },
};

export function randomMessage(group, key) {
  const messages = homeMessages[group]?.[key];

  if (!Array.isArray(messages) || messages.length === 0) {
    return "";
  }

  return messages[
    Math.floor(Math.random() * messages.length)
  ];
}

export function randomItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return items[
    Math.floor(Math.random() * items.length)
  ];
}

function lowerCaseFirst(text) {
  if (!text) {
    return "";
  }

  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function createOutsideStory(selectedKeys) {
  const uniqueKeys = [...new Set(selectedKeys)];

  if (uniqueKeys.length === 0) {
    return "";
  }

  if (uniqueKeys.length === 1) {
    return randomItem(
      homeMessages.outside.single[uniqueKeys[0]],
    );
  }

  const phrases = uniqueKeys
    .map((key) => {
      return randomItem(
        homeMessages.outside.openings[key],
      );
    })
    .filter(Boolean);

  if (phrases.length === 2) {
    const ending = randomItem(
      homeMessages.outside.pairEndings,
    );

    return `${phrases[0]} and ${lowerCaseFirst(
      phrases[1],
    )} ${ending}`;
  }

  const visiblePhrases = phrases.slice(0, 3);

  const beginning = `${visiblePhrases
    .slice(0, -1)
    .join(", ")} and ${lowerCaseFirst(
    visiblePhrases.at(-1),
  )}`;

  return `${beginning} ${randomItem(
    homeMessages.outside.manyEndings,
  )}`;
}