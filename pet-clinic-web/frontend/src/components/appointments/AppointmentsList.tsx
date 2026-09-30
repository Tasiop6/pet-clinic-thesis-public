import { format, parseISO } from "date-fns";
import { el, enGB } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { AppointmentSummary } from "../../api/types";
import { AppointmentCard } from "./AppointmentCard";
import "./AppointmentsList.css";

interface AppointmentsListProps {
    appointments: AppointmentSummary[];
    onEdit: (id: number) => void;
}

export function AppointmentsList({ appointments, onEdit }: AppointmentsListProps) {
    const { t, i18n } = useTranslation(["appointments", "common"]);
    const locale = i18n.language === "en" ? enGB : el;
    const localeCode = i18n.language === "en" ? "en-GB" : "el-GR";

    if (appointments.length === 0) {
        return null;
    }

    // Sort by date/time
    const sortedAppointments = [...appointments].sort((a, b) =>
        new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime()
    );

    return (
        <div className="appointments-list-container">
            {/* Desktop Table View */}
            <div className="appointments-table-wrapper">
                <table className="appointments-table">
                    <thead>
                        <tr>
                            <th>{t("appointments:list.date")}</th>
                            <th>{t("appointments:list.time")}</th>
                            <th>{t("appointments:list.pet")}</th>
                            <th>{t("appointments:list.owner")}</th>
                            <th>{t("appointments:list.vet")}</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAppointments.map((appt) => {
                            const date = parseISO(appt.appointmentTime);
                            return (
                                <tr key={appt.id}>
                                    <td>{format(date, "EEE d MMM", { locale })}</td>
                                    <td>{format(date, "HH:mm")}</td>
                                    <td>
                                        <strong>{appt.pet?.name || t("appointments:list.unknownPet")}</strong>
                                    </td>
                                    <td>
                                        {appt.owner?.name ?? "-"}
                                    </td>
                                    <td>{appt.vet?.name ? `Dr. ${appt.vet.name}` : "-"}</td>
                                    <td className="appointment-actions">
                                        <button
                                            className="button secondary sm"
                                            onClick={() => onEdit(appt.id)}
                                        >
                                            {t("common:actions.edit")}
                                        </button>
                                        {/* Add more actions if needed */}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="appointments-mobile-list">
                {sortedAppointments.map((appt) => (
                    <AppointmentCard
                        key={appt.id}
                        appointment={{
                            id: appt.id,
                            time: appt.appointmentTime,
                            petName: appt.pet?.name,
                            ownerName: appt.owner?.name ?? ""
                        }}
                        locale={localeCode}
                    // Add onEdit handler to card if possible, currently AppointmentCard doesn't expose it well yet
                    />
                ))}
            </div>
        </div>
    );
}
