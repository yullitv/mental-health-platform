import { Link } from "react-router-dom";

// Інструменти самодопомоги - окрема сторінка верхнього меню (раніше жили
// всередині "Кабінету", але це окремий, самостійний розділ, тож має свій
// пункт навігації поряд з "Кабінет"/"Спеціалісти").
const TOOLS = [
  {
    to: "/diary",
    icon: "📔",
    label: "Щоденник",
    desc: "Настрій, сон, нотатки - зашифровано прямо в браузері",
  },
  {
    to: "/thought-analysis",
    icon: "🧠",
    label: "Аналіз думки",
    desc: "Розібрати тривожну думку крок за кроком",
  },
  {
    to: "/screening",
    icon: "📋",
    label: "Тести",
    desc: "Короткі опитувальники самооцінки (PHQ-9, GAD-7)",
  },
  {
    to: "/breathing",
    icon: "🌬️",
    label: "Дихання",
    desc: "Вправа, щоб швидко заспокоїтись",
  },
  {
    to: "/companion",
    icon: "🤍",
    label: "AI-розмова",
    desc: "Поговорити з AI-компаньйоном",
  },
  {
    to: "/safety-plan",
    icon: "🧰",
    label: "Аптечка",
    desc: "Твій план дій на складні моменти",
  },
  {
    to: "/privacy",
    icon: "🔐",
    label: "Приватність",
    desc: "PIN-код і налаштування шифрування щоденника",
  },
];

const ToolsPage = () => {
  return (
    <div className="max-w-3xl mx-auto text-left">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-xl font-extrabold text-ink mb-1">
          Твої інструменти
        </h2>
        <p className="text-sm text-muted mb-4">
          Все для самодопомоги між сесіями - приватно і завжди під рукою.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="flex items-start gap-3 bg-canvas border border-border rounded-xl p-4 hover:border-primary transition"
            >
              <span className="text-2xl shrink-0">{tool.icon}</span>
              <div>
                <p className="font-semibold text-ink">{tool.label}</p>
                <p className="text-xs text-muted mt-0.5">{tool.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
