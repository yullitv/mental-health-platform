import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="text-center pt-16">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">404</h2>
      <p className="text-gray-600 mb-4">Такої сторінки не існує.</p>
      <Link to="/" className="text-blue-600 hover:underline">
        На головну
      </Link>
    </div>
  );
};

export default NotFoundPage;