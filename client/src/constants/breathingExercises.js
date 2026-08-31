// Бібліотека дихальних вправ. Без AI, без бекенду — суто контент+UI,
// підібраний за емоційним станом. Джерела технік — загальновідомі
// стандартні практики (4-7-8 — д-р Ендрю Вейл, box breathing — поширена
// практика для швидкого фокусу/стресу, когерентне дихання ~6 вдихів/хв,
// подовжений видих — базовий принцип активації парасимпатичної системи).

export const EMOTIONAL_STATES = [
  { key: "all", label: "Усі" },
  { key: "anxiety", label: "Тривога" },
  { key: "stress", label: "Стрес" },
  { key: "sleep", label: "Безсоння" },
  { key: "panic", label: "Гострий стан" },
  { key: "focus", label: "Концентрація" },
];

export const BREATHING_EXERCISES = [
  {
    key: "478",
    title: "Дихання 4-7-8",
    subtitle: "Класична заспокійлива техніка",
    description:
      "Уповільнює серцевий ритм і допомагає нервовій системі перейти в спокійніший режим. Добре підходить перед сном або коли тривожні думки не дають заспокоїтись.",
    states: ["anxiety", "sleep"],
    caution:
      "Має затримку дихання — якщо відчуєш запаморочення, зупинись і подихай природно, або спробуй «Подовжений видих» замість цього.",
    defaultCycles: 4,
    cycleOptions: [4, 6, 8],
    pattern: [
      { type: "inhale", seconds: 4, label: "Вдих носом" },
      { type: "hold", seconds: 7, label: "Затримай подих" },
      { type: "exhale", seconds: 8, label: "Видих ротом (зі звуком)" },
    ],
  },
  {
    key: "box",
    title: "Квадратне дихання",
    subtitle: "Box breathing — для швидкого фокусу",
    description:
      "Рівні за тривалістю фази вдиху, затримки й видиху допомагають повернути ясність думок під стресом чи перед складною розмовою.",
    states: ["stress", "focus", "anxiety"],
    caution:
      "Має дві затримки дихання — якщо некомфортно, обери іншу техніку без затримок.",
    defaultCycles: 5,
    cycleOptions: [4, 5, 8],
    pattern: [
      { type: "inhale", seconds: 4, label: "Вдих носом" },
      { type: "hold", seconds: 4, label: "Затримай подих" },
      { type: "exhale", seconds: 4, label: "Видих ротом" },
      { type: "hold", seconds: 4, label: "Затримай (легені порожні)" },
    ],
  },
  {
    key: "coherent",
    title: "Когерентне дихання",
    subtitle: "Рівномірне дихання 5/5",
    description:
      "Просте рівномірне дихання без затримок — приблизно 6 вдихів на хвилину. М'яко знижує рівень тривожності, добре підходить для щоденної практики.",
    states: ["anxiety", "stress"],
    caution: null,
    defaultCycles: 8,
    cycleOptions: [6, 8, 12],
    pattern: [
      { type: "inhale", seconds: 5, label: "Вдих носом" },
      { type: "exhale", seconds: 5, label: "Видих носом або ротом" },
    ],
  },
  {
    key: "extended-exhale",
    title: "Подовжений видих",
    subtitle: "Найпростіша техніка — без затримок дихання",
    description:
      "Видих довший за вдих допомагає тілу заспокоїтись. Немає затримок дихання — тому підходить навіть у гострому тривожному стані, коли складно щось контролювати.",
    states: ["panic", "anxiety"],
    caution: null,
    defaultCycles: 6,
    cycleOptions: [4, 6, 10],
    pattern: [
      { type: "inhale", seconds: 4, label: "Вдих носом" },
      { type: "exhale", seconds: 6, label: "Повільний видих ротом" },
    ],
  },
];
