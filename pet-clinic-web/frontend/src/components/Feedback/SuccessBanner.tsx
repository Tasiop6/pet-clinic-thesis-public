
import "./Feedback.css";

export function SuccessBanner({ message }: { message: string }) {
    return (
        <div className="feedback success-banner">
            <span>✅</span>
            <span>{message}</span>
        </div>
    );
}
