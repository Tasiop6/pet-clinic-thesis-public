import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dashboardApi } from "../api/client";
import { AppointmentCard } from "../components/appointments/AppointmentCard";
import { EmptyState } from "../components/Feedback/EmptyState";
import { ErrorBanner } from "../components/Feedback/ErrorBanner";
import { Skeleton } from "../components/Feedback/Skeleton";
import "./DashboardPage.css";

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });
  const { t, i18n } = useTranslation("dashboard");

  if (isLoading) {
    return (
      <div className="page">
        <section className="page-header">
          <div>
            <Skeleton width={200} height={40} style={{ marginBottom: "0.5rem" }} />
            <Skeleton width={300} height={20} />
          </div>
        </section>

        <section className="grid two">
          <div className="card stats-card">
            <h2 className="section-title">
              <Skeleton width={150} />
            </h2>
            <div className="stats-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="stat-tile">
                  <Skeleton width={80} height={16} />
                  <Skeleton width={60} height={40} />
                  <Skeleton width={120} height={14} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">
              <Skeleton width={180} />
            </h2>
            <div className="appointments-grid">
              {[1, 2].map((i) => (
                <div key={i} className="appointment-card">
                  <div className="appt-time">
                    <Skeleton width={20} height={20} variant="circle" />
                    <Skeleton width={100} height={20} />
                  </div>
                  <div className="appt-meta">
                    <Skeleton width={140} height={24} />
                    <Skeleton width={180} height={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page">
        <ErrorBanner message={t("errors.load")} />
      </div>
    );
  }

  const { stats, upcomingAppointments, contactReminders } = data;
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  const locale = i18n.language === "en" ? "en-GB" : "el-GR";

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p className="muted">{t("description")}</p>
        </div>
      </section>

      <section className="grid two">
        <div className="card stats-card">
          <h2 className="section-title">{t("stats.thisWeek")}</h2>
          <div className="stats-grid">
            <div className="stat-tile">
              <span className="stat-label">{t("stats.today")}</span>
              <span className="stat-value">{stats.today}</span>
              <span className="stat-hint muted">{t("stats.todayHint")}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">{t("stats.week")}</span>
              <span className="stat-value">{stats.week}</span>
              <span className="stat-hint muted">{t("stats.weekHint")}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">{t("stats.contactGaps")}</span>
              <span className="stat-value">{stats.contactGaps}</span>
              <span className="stat-hint muted">{t("stats.contactHint")}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">{t("appointments.title")}</h2>
          {upcomingAppointments.length === 0 ? (
            <EmptyState
              icon="🗓️"
              title={t("appointments.emptyTitle")}
              message={t("appointments.emptyMessage")}
            />
          ) : (
            <div className="appointments-grid">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id ?? appointment.time}
                  appointment={appointment}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">{t("reminders.title")}</h2>
        {contactReminders.length === 0 ? (
          <EmptyState
            icon="✅"
            title={t("reminders.emptyTitle")}
            message={t("reminders.emptyMessage")}
          />
        ) : (
          <div className="reminders-grid">
            {contactReminders.map((item) => (
              <div key={item.id ?? item.time} className="reminder-card">
                <div className="reminder-header">
                  <strong>{item.petName || t("appointments.fallbackPet")}</strong>
                  <span className="muted">
                    {new Date(item.time).toLocaleString(locale, dateOptions)}
                  </span>
                </div>
                <p className="muted">{item.ownerName || t("appointments.fallbackOwner")}</p>
                <div className="reminder-tags">
                  {item.missingEmail && <span className="tag">{t("appointments.missingEmail")}</span>}
                  {item.missingPhone && <span className="tag">{t("appointments.missingPhone")}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
