import { Component } from "react";

// Страховка на випадок, якщо якийсь компонент впаде під час рендеру —
// без цього React показує повністю білий екран без жодного пояснення.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("❌ Неочікувана помилка рендеру:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
          <div className="max-w-sm text-center bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-8">
            <p className="text-3xl mb-3">😕</p>
            <h1 className="text-lg font-extrabold text-ink mb-2">
              Щось пішло не так
            </h1>
            <p className="text-sm text-muted mb-5">
              Сталася неочікувана помилка. Спробуй оновити сторінку — якщо
              не допоможе, повернись трохи пізніше.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-dark transition"
            >
              Оновити сторінку
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
