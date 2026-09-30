
import "./Feedback.css";

export function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="feedback error-banner">
            <span>⚠️</span>
            <span>{message}</span>
        </div>
    );
}
