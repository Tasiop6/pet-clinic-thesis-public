import { useTranslation } from "react-i18next";
import "./PetQuickActions.css";

interface PetQuickActionsProps {
  onVisit: () => void;
  onAddWeight: () => void;
  onRecordVaccine: () => void;
  onUploadImaging: () => void;
}

export function PetQuickActions({
  onVisit,
  onAddWeight,
  onRecordVaccine,
  onUploadImaging,
}: PetQuickActionsProps) {
  const { t } = useTranslation("ownerDetail");

  return (
    <section className="pet-quick-actions" aria-label={t("quickActions.title")}>
      <h4>{t("quickActions.title")}</h4>
      <div className="pet-quick-actions__grid">
        <button type="button" className="pet-quick-actions__button" onClick={onVisit}>
          <span aria-hidden="true">🗓️</span>
          {t("quickActions.visit")}
        </button>
        <button type="button" className="pet-quick-actions__button" onClick={onAddWeight}>
          <span aria-hidden="true">⚖️</span>
          {t("quickActions.weight")}
        </button>
        <button type="button" className="pet-quick-actions__button" onClick={onRecordVaccine}>
          <span aria-hidden="true">💉</span>
          {t("quickActions.vaccine")}
        </button>
        <button type="button" className="pet-quick-actions__button" onClick={onUploadImaging}>
          <span aria-hidden="true">🩻</span>
          {t("quickActions.imaging")}
        </button>
      </div>
    </section>
  );
}
