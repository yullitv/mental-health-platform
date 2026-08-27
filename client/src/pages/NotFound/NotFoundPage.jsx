import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="text-center pt-16">
      <h2 className="text-2xl font-extrabold text-ink mb-2">404</h2>
      <p className="text-muted mb-4">Такої сторінки не існує.</p>
      <Link to="/" className="text-primary font-semibold hover:text-primary-dark">
        На головну
      </Link>
    </div>
  );
};

export default NotFoundPage;
