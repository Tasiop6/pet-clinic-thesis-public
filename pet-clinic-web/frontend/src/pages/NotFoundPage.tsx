import { Link } from "react-router-dom";
import { EmptyState } from "../components/Feedback";

export function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState
        icon="🔍"
        title="Page not found"
        message="The page you are looking for does not exist."
        actions={<Link className="button" to="/">Go home</Link>}
      />
    </div>
  );
}
