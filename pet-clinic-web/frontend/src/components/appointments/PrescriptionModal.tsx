import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { el, enGB } from "date-fns/locale";
import { clinicApi } from "../../api/client";
import type { AppointmentDetail, ClinicInfo } from "../../api/types";
import { Loader } from "../Loader";
import { ErrorBanner } from "../Feedback";
import "./PrescriptionModal.css";

interface PrescriptionModalProps {
  open: boolean;
  appointment: AppointmentDetail | null;
  onClose: () => void;
}

interface FormState {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  notes: string;
}

export function PrescriptionModal({ open, appointment, onClose }: PrescriptionModalProps) {
  const { t, i18n } = useTranslation(["appointments", "common"]);
  const locale = useMemo(() => (i18n.language === "en" ? enGB : el), [i18n.language]);

  const clinicQuery = useQuery({
    queryKey: ["clinic", "info"],
    queryFn: clinicApi.info,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const [formState, setFormState] = useState<FormState>({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
    notes: "",
  });

  const summaryEntries = useMemo(
    () =>
      [
        {
          label: t("appointments:modal.fields.medication"),
          value: formState.medication,
        },
        { label: t("appointments:modal.fields.dosage"), value: formState.dosage },
        { label: t("appointments:modal.fields.frequency"), value: formState.frequency },
        { label: t("appointments:modal.fields.duration"), value: formState.duration },
        {
          label: t("appointments:modal.fields.instructions"),
          value: formState.instructions,
        },
        { label: t("appointments:modal.fields.notes"), value: formState.notes },
      ].filter((entry) => entry.value && entry.value.trim().length > 0),
    [formState.medication, formState.dosage, formState.frequency, formState.duration, formState.instructions, formState.notes, t],
  );

  useEffect(() => {
    if (appointment) {
      setFormState((prev) => ({
        ...prev,
        medication: appointment.medications ?? prev.medication,
        instructions: appointment.treatments ?? prev.instructions,
        notes: appointment.notes ?? prev.notes,
      }));
    }
  }, [appointment]);

  const today = useMemo(
    () => format(new Date(), "dd MMM yyyy", { locale }),
    [locale],
  );

  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [open]);

  if (!open) {
    return null;
  }

  const clinicInfo: ClinicInfo | undefined = clinicQuery.data;
  const petName = appointment?.pet?.name ?? "—";
  const ownerName = appointment?.owner?.name ?? "—";
  const locationLine = [clinicInfo?.address, clinicInfo?.city].filter(Boolean).join(", ");
  const contactLine = [clinicInfo?.phone, clinicInfo?.email].filter(Boolean).join(" · ");
  const veterinarianLine = [clinicInfo?.vetName, clinicInfo?.license].filter(Boolean).join(" · ");
  const businessLine = [clinicInfo?.vat, clinicInfo?.website].filter(Boolean).join(" · ");

  const handlePrint = () => window.print();

  const content = !appointment ? (
    <div className="prescription-modal-backdrop">
      <div className="prescription-modal">
        <Loader />
      </div>
    </div>
  ) : clinicQuery.isError ? (
    <div className="prescription-modal-backdrop">
      <div className="prescription-modal">
        <ErrorBanner message={t("appointments:modal.clinicError")} />
      </div>
    </div>
  ) : (
    <div className="prescription-modal-backdrop" role="dialog" aria-modal="true">
      <div className="prescription-modal">
        <div className="prescription-modal-controls">
          <button className="button secondary" onClick={onClose}>
            {t("appointments:modal.close")}
          </button>
          <button className="button" onClick={handlePrint}>
            {t("appointments:modal.print")}
          </button>
        </div>

        <section className="prescription-preview">
          <header className="prescription-header">
            <div className="logo-column">
              <img src="/happy-tails-vet-mark.png" alt={t("common:app.name")} />
            </div>
            <div className="clinic-column">
              <h1>{clinicInfo?.name ?? t("common:app.name")}</h1>
              {locationLine && <p>{locationLine}</p>}
              {contactLine && <p>{contactLine}</p>}
              {veterinarianLine && <p>{veterinarianLine}</p>}
              {businessLine && <p>{businessLine}</p>}
            </div>
            <div className="meta-column">
              <div>
                <strong>{t("appointments:modal.fields.date")}</strong>
                <span>{today}</span>
              </div>
            </div>
          </header>

          <section className="prescription-info">
            <div>
              <strong>{t("appointments:modal.fields.pet")}</strong> {petName}
            </div>
            <div>
              <strong>{t("appointments:modal.fields.owner")}</strong> {ownerName}
            </div>
            <div>
              <strong>{t("appointments:modal.fields.email")}</strong>{" "}
              {appointment.owner?.email ?? "-"}
            </div>
            <div>
              <strong>{t("appointments:modal.fields.phone")}</strong>{" "}
              {appointment.owner?.telephone ?? "-"}
            </div>
          </section>

          <section className="prescription-body">
            <div className="editable-fields screen-only">
              <label>
                {t("appointments:modal.fields.medication")}
                <textarea
                  value={formState.medication}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, medication: event.target.value }))
                  }
                />
              </label>
              <div className="grid three">
                <label>
                  {t("appointments:modal.fields.dosage")}
                  <input
                    value={formState.dosage}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, dosage: event.target.value }))
                    }
                    placeholder={t("appointments:modal.placeholders.dosage")}
                  />
                </label>
                <label>
                  {t("appointments:modal.fields.frequency")}
                  <input
                    value={formState.frequency}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, frequency: event.target.value }))
                    }
                    placeholder={t("appointments:modal.placeholders.frequency")}
                  />
                </label>
                <label>
                  {t("appointments:modal.fields.duration")}
                  <input
                    value={formState.duration}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, duration: event.target.value }))
                    }
                    placeholder={t("appointments:modal.placeholders.duration")}
                  />
                </label>
              </div>
              <label>
                {t("appointments:modal.fields.instructions")}
                <textarea
                  value={formState.instructions}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, instructions: event.target.value }))
                  }
                />
              </label>
              <label>
                {t("appointments:modal.fields.notes")}
                <textarea
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </label>
            </div>

            {summaryEntries.length > 0 && (
              <div className="prescription-summary">
                <h3>{t("appointments:modal.summary.title")}</h3>
                <ul>
                  {summaryEntries.map((entry) => (
                    <li key={entry.label}>
                      <strong>{entry.label}</strong>
                      <span>{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="signature">
              <span>{t("appointments:modal.stamp.label")}</span>
            </div>
          </section>
        </section>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
