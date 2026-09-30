import React from "react";
import "./Feedback.css";

interface FeedbackProps {
    icon: string;
    title: string;
    message?: string;
    actions?: React.ReactNode;
}

export function EmptyState({ icon, title, message, actions }: FeedbackProps) {
    return (
        <div className="feedback empty-state">
            <div className="feedback-icon">{icon}</div>
            <h3>{title}</h3>
            {message && <p>{message}</p>}
            {actions && <div className="feedback-actions">{actions}</div>}
        </div>
    );
}
