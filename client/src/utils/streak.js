// Утиліта для рахунку "послідовності" активності — навмисно БЕЗ каральної
// логіки: пропуск дня не показується як провал, немає порівняння з іншими,
// найдовша серія лишається як досягнення назавжди, навіть якщо поточна
// перервалась. Рахуємо за унікальними датами щоденника й скринінг-тестів —
// обидва зберігають дату у відкритому вигляді на сервері (сам вміст
// лишається зашифрованим), тож для стріку достатньо факту дати без ключа.

function toDayKey(dateInput) {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

export function computeStreakStats(dateInputs) {
  const activeDays = new Set(dateInputs.map(toDayKey));
  const today = new Date();
  const todayKey = toDayKey(today);
  const yesterdayKey = toDayKey(addDays(today, -1));

  // Поточний стрік: якщо сьогодні ще нічого не робила, це НЕ обнуляє його
  // одразу — день ще не закінчився. Обнулення лише якщо і вчора не було
  // активності.
  let cursor = null;
  if (activeDays.has(todayKey)) {
    cursor = today;
  } else if (activeDays.has(yesterdayKey)) {
    cursor = addDays(today, -1);
  }
  let currentStreak = 0;
  while (cursor && activeDays.has(toDayKey(cursor))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  // Найдовша серія за весь час.
  const sortedKeys = [...activeDays].sort();
  let longestStreak = 0;
  let run = 0;
  let prevKey = null;
  for (const key of sortedKeys) {
    if (prevKey) {
      const expectedNext = toDayKey(addDays(new Date(prevKey), 1));
      run = expectedNext === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prevKey = key;
  }

  const last7 = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = toDayKey(day);
    last7.push({ key, active: activeDays.has(key) });
  }

  return {
    currentStreak,
    longestStreak,
    activeDaysCount: activeDays.size,
    isActiveToday: activeDays.has(todayKey),
    last7,
  };
}

function daysWord(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "днів";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дні";
  return "днів";
}

export function streakMessage(stats) {
  if (stats.activeDaysCount === 0) {
    return "Ще не було жодної активності — почни з щоденника, тесту чи дихальної вправи, коли буде зручно.";
  }
  if (stats.currentStreak === 0) {
    return "Перерва — це нормально. Продовжуй, коли будеш готова.";
  }
  if (stats.currentStreak === 1) {
    return "Перший день — гарний початок.";
  }
  return `${stats.currentStreak} ${daysWord(stats.currentStreak)} поспіль — чудова послідовність.`;
}
