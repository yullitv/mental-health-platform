// VITE_API_BASE_URL дозволяє задати справжню адресу бекенду при деплої
// (фронтенд і бекенд зазвичай живуть на різних доменах/портах). Без цієї
// змінної - за замовчуванням локальний dev-сервер.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
