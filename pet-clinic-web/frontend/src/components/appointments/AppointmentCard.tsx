import { useTranslation } from "react-i18next";
import "./AppointmentCard.css";

export interface AppointmentCardData {
    id: number | null;
    time: string;
    petName?: string | null;
    ownerName?: string | null;
    missingEmail?: boolean;
    missingPhone?: boolean;
}

export interface AppointmentCardProps {
    appointment: AppointmentCardData;
    locale?: string;
}

export function AppointmentCard({ appointment, locale = "en-GB" }: AppointmentCardProps) {
    const { t } = useTranslation("dashboard");

    const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
    };

    const formattedTime = new Date(appointment.time).toLocaleString(
        locale,
        dateOptions
    );

    return (
        <div className="appointment-card">
            <div className="appt-time">
                <span role="img" aria-label="clock">
                    🕒
                </span>
                {formattedTime}
            </div>
            <div className="appt-meta">
                <strong>{appointment.petName || t("appointments.fallbackPet")}</strong>
                <span className="muted">
                    {appointment.ownerName || t("appointments.fallbackOwner")}
                </span>
            </div>
            {(appointment.missingEmail || appointment.missingPhone) && (
                <div className="appt-tags">
                    {appointment.missingEmail && (
                        <span className="appt-tag warning">
                            {t("appointments.missingEmail")}
                        </span>
                    )}
                    {appointment.missingPhone && (
                        <span className="appt-tag warning">
                            {t("appointments.missingPhone")}
                        </span>
                    )}
                </div>
            )}
            <button
                className="action-menu-trigger"
                type="button"
                title={t("appointments.actions", { defaultValue: "Actions" })}
                onClick={() => {
                    // Placeholder for action menu logic
                    console.log("Action menu clicked for", appointment.id);
                }}
            >
                ⋮
            </button>
        </div>
    );
}
