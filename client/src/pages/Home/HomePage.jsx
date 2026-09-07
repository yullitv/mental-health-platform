import { SignedIn, SignedOut, SignUpButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../../context/CurrentUserContext";

const FEATURES = [
  {
    icon: "🧑‍⚕️",
    title: "Спеціалісти та сесії",
    text: "Онлайн-чат і відеосесії з підтвердженими спеціалістами. Обираєш людину й зручний час — і зв'язуєшся напряму.",
  },
  {
    icon: "🔒",
    title: "Приватний щоденник",
    text: "Записуй настрій, сон, тривожність голосом або текстом — усе шифрується прямо в браузері. Бачиш лише ти: динаміку, закономірності, PDF-звіт для терапевта.",
  },
  {
    icon: "🤍",
    title: "AI поруч, коли треба",
    text: "AI-компаньйон для розмови, аналіз автоматичних думок, тижнева рефлексія — підказки, а не діагнози, і завжди лише з твоєї явної згоди.",
  },
  {
    icon: "🌬️",
    title: "Практики самодопомоги",
    text: "Дихальні вправи, короткі тести самооцінки (PHQ-9, GAD-7) і власна «аптечка» на складні моменти.",
  },
  {
    icon: "💜",
    title: "Донат замість оплати",
    text: "Замість прямої оплати сесії — донат у благодійний фонд на твій вибір. Підтримка собі й підтримка іншим одночасно.",
  },
  {
    icon: "🌗",
    title: "Приватність за задумом",
    text: "PIN-код для входу в застосунок, світла й темна тема, і жоден запис щоденника ніколи не залишає твій браузер незашифрованим.",
  },
];

const HomePage = () => {
  const { dbUser } = useCurrentUser();
  const workspaceHref = dbUser?.role === "ADMIN" ? "/admin" : "/dashboard";
  const workspaceLabel =
    dbUser?.role === "ADMIN" ? "Перейти в адмін-панель" : "Перейти в кабінет";

  return (
    <div className="text-left px-4 pt-4 pb-16">
      <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-surface border border-border shadow-[0_12px_28px_rgba(36,31,51,0.06)] px-6 py-14 sm:py-20 text-center">
            <div
              className="absolute -top-24 -right-16 w-72 h-72 bg-primary-soft rounded-full blur-3xl opacity-70"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-24 -left-16 w-72 h-72 bg-accent-soft rounded-full blur-3xl opacity-70"
              aria-hidden="true"
            />

            <div className="relative">
              <svg
                width="52"
                height="58"
                viewBox="0 0 100 112"
                fill="none"
                className="mx-auto mb-5"
                aria-hidden="true"
              >
                <ellipse cx="50" cy="88" rx="34" ry="17" transform="rotate(-6 50 88)" fill="#5A4CC0" />
                <ellipse cx="48" cy="64" rx="26" ry="14" transform="rotate(8 48 64)" fill="#6C5DD3" stroke="white" strokeWidth="3.5" />
                <ellipse cx="51" cy="44" rx="18" ry="10" transform="rotate(-8 51 44)" fill="#8B7EDB" stroke="white" strokeWidth="3.5" />
                <ellipse cx="49" cy="27" rx="13" ry="10" transform="rotate(10 49 27)" fill="#E2A24C" stroke="white" strokeWidth="3.5" />
              </svg>

              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                Простір психологічної підтримки
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-ink mb-4 tracking-tight">
                Опора
              </h1>
              <p className="text-muted max-w-lg mx-auto text-base sm:text-lg">
                Те, на що можна спертися, коли важко. Щоденник, практики
                самодопомоги і зв'язок зі спеціалістом — в одному місці.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                <SignedOut>
                  <SignUpButton
                    mode="modal"
                    unsafeMetadata={{ intendedRole: "CLIENT" }}
                  >
                    <button className="flex-1 bg-primary text-white px-6 py-4 rounded-2xl font-semibold hover:bg-primary-dark transition">
                      Я шукаю підтримку
                    </button>
                  </SignUpButton>
                  <SignUpButton
                    mode="modal"
                    unsafeMetadata={{ intendedRole: "SPECIALIST" }}
                  >
                    <button className="flex-1 bg-canvas border border-border text-ink px-6 py-4 rounded-2xl font-semibold hover:border-primary transition">
                      Я спеціаліст
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    to={workspaceHref}
                    className="flex-1 bg-primary text-white px-6 py-4 rounded-2xl font-semibold hover:bg-primary-dark transition text-center"
                  >
                    {workspaceLabel}
                  </Link>
                </SignedIn>
              </div>

              <SignedOut>
                <p className="text-xs text-muted mt-5">
                  🔒 Щоденник шифрується так, що навіть ми не можемо його прочитати
                </p>
              </SignedOut>
            </div>
          </div>

          {/* Чому Опора / кому це */}
          <div className="grid sm:grid-cols-2 gap-5 mt-10">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="text-lg font-extrabold text-ink mb-2">
                Чому «Опора»
              </h2>
              <p className="text-sm text-ink">
                Опора — це те, на що спираєшся, коли самому важко встояти. Ми
                не намагаємось замінити психолога — натомість даємо простір,
                де можна чесно розібратися із собою, а за потреби легко дійти
                до людини, яка справді допоможе.
              </p>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="text-lg font-extrabold text-ink mb-2">
                Кому це підходить
              </h2>
              <p className="text-sm text-ink">
                Тим, хто відчуває тривогу, стрес чи вигорання і ще не готовий
                одразу йти до фахівця — і тим, хто вже працює зі спеціалістом
                і хоче мати під рукою власні записи й інструменти між
                сесіями.
              </p>
            </div>
          </div>

          {/* Функціонал */}
          <h2 className="text-2xl font-extrabold text-ink mt-14 mb-6 text-center">
            Що всередині
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-surface border border-border rounded-2xl p-5"
              >
                <span className="text-2xl">{f.icon}</span>
                <h3 className="font-bold text-ink mt-2 mb-1">{f.title}</h3>
                <p className="text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Link
              to="/specialists"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Подивитись список спеціалістів →
            </Link>
          </div>

          {/* Донати — окремо й помітніше, а не лише рядком у сітці фіч. */}
          <div className="mt-14 bg-accent-soft border border-accent/30 rounded-3xl p-8 sm:p-10 text-center">
            <span className="text-3xl">💛💙</span>
            <h2 className="text-2xl font-extrabold text-ink mt-3 mb-3">
              Сесія — це ще й донат
            </h2>
            <p className="text-sm sm:text-base text-ink max-w-xl mx-auto">
              В Опорі немає прямої оплати спеціалісту: замість цього кошти
              йдуть у благодійний фонд на твій вибір — зокрема на підтримку
              Збройних сил України. Отримуєш підтримку для себе — і водночас
              підтримуєш тих, хто боронить цю можливість для всіх нас.
            </p>
          </div>

          {/* Для спеціалістів — лише гостям, залогінений спеціаліст і так
              уже приєднався, а клієнт/адмін тут нічого не "приєднає". */}
          <SignedOut>
            <div className="mt-14 bg-primary-soft rounded-3xl p-8 sm:p-10 text-center">
              <h2 className="text-2xl font-extrabold text-ink mb-3">
                Ти спеціаліст?
              </h2>
              <p className="text-sm sm:text-base text-ink max-w-xl mx-auto mb-6">
                Веди прийом онлайн: власний профіль із верифікацією, керування
                розкладом, чат і відеосесії з клієнтами, прозорий облік донатів
                замість рахунків.
              </p>
              <SignUpButton
                mode="modal"
                unsafeMetadata={{ intendedRole: "SPECIALIST" }}
              >
                <button className="bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-dark transition">
                  Приєднатись як спеціаліст
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          {/* Кризова смуга */}
          <div className="mt-8 bg-danger/5 border-2 border-danger/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-4 sm:justify-between text-center sm:text-left">
            <div>
              <h3 className="font-extrabold text-ink">
                🤍 Якщо зараз важко — не чекай реєстрації
              </h3>
              <p className="text-sm text-ink mt-1">
                Гарячі лінії й вправи заземлення завжди доступні, без
                акаунту.
              </p>
            </div>
            <Link
              to="/crisis"
              className="shrink-0 px-5 py-3 rounded-xl text-sm font-semibold bg-danger text-white hover:bg-danger/90 transition"
            >
              Отримати допомогу зараз
            </Link>
          </div>

          {/* Фінальний CTA — теж лише гостям, залогінений вже має свою
              кнопку "в кабінет" у хіро вище. */}
          <SignedOut>
            <div className="text-center mt-14">
              <h2 className="text-2xl font-extrabold text-ink mb-6">
                Готова(ий) спробувати?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                <SignUpButton
                  mode="modal"
                  unsafeMetadata={{ intendedRole: "CLIENT" }}
                >
                  <button className="flex-1 bg-primary text-white px-6 py-4 rounded-2xl font-semibold hover:bg-primary-dark transition">
                    Я шукаю підтримку
                  </button>
                </SignUpButton>
                <SignUpButton
                  mode="modal"
                  unsafeMetadata={{ intendedRole: "SPECIALIST" }}
                >
                  <button className="flex-1 bg-surface border border-border text-ink px-6 py-4 rounded-2xl font-semibold hover:border-primary transition">
                    Я спеціаліст
                  </button>
                </SignUpButton>
              </div>
            </div>
          </SignedOut>
        </div>
      </div>
  );
};

export default HomePage;
