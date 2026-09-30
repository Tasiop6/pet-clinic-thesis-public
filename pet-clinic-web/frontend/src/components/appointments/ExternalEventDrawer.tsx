import { format } from "date-fns";
import type { Locale } from "date-fns";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./AppointmentDrawer.css";

export type ExternalEventInfo = {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  description?: string | null;
  location?: string | null;
  link?: string | null;
};

interface ExternalEventDrawerProps {
  event: ExternalEventInfo;
  locale: Locale;
  onClose: () => void;
}

export function ExternalEventDrawer({ event, locale, onClose }: ExternalEventDrawerProps) {
  const { t } = useTranslation(["appointments", "common"]);

  const { startLabel, endLabel } = useMemo(() => {
    const safeStart = event.start ? format(event.start, "EEEE dd MMM yyyy · HH:mm", { locale }) : null;
    const safeEnd =
      event.end && event.start && event.end.getTime() !== event.start.getTime()
        ? format(event.end, "EEEE dd MMM yyyy · HH:mm", { locale })
        : null;
    return { startLabel: safeStart, endLabel: safeEnd };
  }, [event.end, event.start, locale]);

  return (
    <aside className="appointment-drawer open">
      <div className="drawer-header">
        <div>
          <h2>{event.title}</h2>
          {startLabel ? (
            <p className="muted">
              {endLabel
                ? t("appointments:drawer.external.range", {
                    defaultValue: "{{start}} → {{end}}",
                    start: startLabel,
                    end: endLabel,
                  })
                : startLabel}
            </p>
          ) : null}
        </div>
        <button className="button secondary" onClick={onClose}>
          {t("common:actions.close")}
        </button>
      </div>

      <div className="drawer-form">
        <section className="card">
          <h3>{t("appointments:drawer.external.descriptionTitle", { defaultValue: "Description" })}</h3>
          <p className={event.description ? "" : "muted"}>
            {event.description ??
              t("appointments:drawer.external.noDescription", {
                defaultValue: "No additional description provided.",
              })}
          </p>
        </section>

        {(event.location || event.link) && (
          <section className="card">
            {event.location && (
              <p>
                <strong>
                  {t("appointments:drawer.external.location", { defaultValue: "Location" })}
                  :
                </strong>{" "}
                {event.location}
              </p>
            )}
            {event.link && (
              <p>
                <a href={event.link} target="_blank" rel="noreferrer">
                  {t("appointments:drawer.external.openLink", {
                    defaultValue: "Open in calendar",
                  })}
                </a>
              </p>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}
