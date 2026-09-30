import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { parseISO, format } from "date-fns";
import { el as elLocale, enGB } from "date-fns/locale";
import type { PetTimelineEvent } from "../../utils/pets";
import type { PetHealthRecordDto, PetHealthRecordType } from "../../api/types";
import { useLanguage } from "../../context/LanguageContext";
import "./PetTimeline.css";

const localeMap = {
  el: elLocale,
  en: enGB,
};

const eventIcon: Record<PetTimelineEvent["type"], string> = {
  visit: "🗓️",
  weight: "⚖️",
  vaccine: "💉",
  lab: "🔬",
  imaging: "🩻",
  prescription: "💊",
  note: "📝",
  other: "📎",
};

export interface PetTimelineProps {
  events: PetTimelineEvent[];
  onPreviewRecord?: (record: PetTimelineEvent["record"]) => void;
  onDeleteRecord?: (recordId: number) => void;
  onEditRecord?: (record: PetHealthRecordDto, recordType: PetHealthRecordType) => void;
  deletePending?: boolean;
}

export function PetTimeline({
  events,
  onPreviewRecord,
  onDeleteRecord,
  onEditRecord,
  deletePending,
}: PetTimelineProps) {
  const { language } = useLanguage();
  const { t } = useTranslation("ownerDetail");
  const locale = localeMap[language] ?? elLocale;

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language === "en" ? "en-GB" : "el-GR", {
        maximumFractionDigits: 1,
      }),
    [language],
  );

  const groupedEvents = useMemo(() => {
    const categories: Array<{ id: string; label: string; types: PetTimelineEvent["type"][] }> = [
      { id: "weight", label: t("timeline.groups.weight"), types: ["weight"] },
      { id: "vaccine", label: t("timeline.groups.vaccine"), types: ["vaccine"] },
      { id: "lab", label: t("timeline.groups.lab"), types: ["lab"] },
      { id: "imaging", label: t("timeline.groups.imaging"), types: ["imaging"] },
      { id: "prescription", label: t("timeline.groups.prescription"), types: ["prescription"] },
      { id: "note", label: t("timeline.groups.note"), types: ["note"] },
      { id: "visit", label: t("timeline.groups.visit"), types: ["visit"] },
      { id: "other", label: t("timeline.groups.other"), types: ["other"] },
    ];

    return categories
      .map((category) => ({
        ...category,
        events: events
          .filter((event) => category.types.includes(event.type))
          .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1)),
      }))
      .filter((category) => category.events.length > 0);
  }, [events, t]);

  if (groupedEvents.length === 0) {
    return (
      <section className="pet-timeline">
        <h4 className="pet-timeline__title">{t("timeline.title")}</h4>
        <p className="muted">{t("timeline.empty")}</p>
      </section>
    );
  }

  return (
    <section className="pet-timeline" aria-label={t("timeline.title")}>
      <h4 className="pet-timeline__title">{t("timeline.title")}</h4>
      {groupedEvents.map((group) => (
        <div key={group.id} className="pet-timeline__group">
          <h5 className="pet-timeline__group-title">{group.label}</h5>
          <ol className="pet-timeline__list">
            {group.events.map((event) => {
              const eventDate = parseISO(event.timestamp);
              const primaryLabel = event.title?.trim() || t(`timeline.types.${event.type}`);
              const typeLabel = t(`timeline.types.${event.type}`);
              const metricBadges = (event.metrics ?? []).map((metric) => {
                const key = `timeline.metrics.${metric.kind}`;
                const formattedValue = numberFormatter.format(metric.value);
                return t(key, { value: formattedValue });
              });

              return (
                <li key={event.id} className={`pet-timeline__item pet-timeline__item--${event.type}`}>
                  <div className="pet-timeline__marker" aria-hidden="true">
                    {eventIcon[event.type]}
                  </div>
                  <div className="pet-timeline__content">
                    <header>
                      <span className="pet-timeline__time">
                        {format(eventDate, "EEE d MMM yyyy", { locale })}
                      </span>
                      <div className="pet-timeline__heading">
                        <strong>{primaryLabel}</strong>
                        {primaryLabel !== typeLabel && (
                          <span className="pet-timeline__tag">{typeLabel}</span>
                        )}
                      </div>
                    </header>
                    {event.description && (
                      <p className="pet-timeline__description">{event.description}</p>
                    )}
                    {metricBadges.length > 0 && (
                      <div className="pet-timeline__metrics">
                        {metricBadges.map((label) => (
                          <span key={label} className="pet-timeline__metric">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {event.hasAttachment && (
                      <span className="pet-timeline__attachment">{t("timeline.attachments")}</span>
                    )}
                    {event.record && (onPreviewRecord || onDeleteRecord || onEditRecord) && (
                      <div className="pet-timeline__actions">
                        {onPreviewRecord && event.record.downloadUrl && (
                          <button
                            type="button"
                            className="pet-timeline__action"
                            onClick={() => onPreviewRecord(event.record)}
                          >
                            {t("common:actions.view")}
                          </button>
                        )}
                        {onEditRecord && event.record && event.recordId != null && event.recordType && (
                          <button
                            type="button"
                            className="pet-timeline__action"
                            disabled={deletePending}
                            onClick={() => onEditRecord(event.record!, event.recordType!)}
                          >
                            {t("common:actions.edit")}
                          </button>
                        )}
                        {onDeleteRecord && event.recordId != null && (
                          <button
                            type="button"
                            className="pet-timeline__action pet-timeline__action--danger"
                            disabled={deletePending}
                            onClick={() => onDeleteRecord(event.recordId!)}
                          >
                            {t("common:actions.delete")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
