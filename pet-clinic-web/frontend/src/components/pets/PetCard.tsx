import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    type PetDetail,
    type PetHealthRecordDto,
    type PetHealthRecordType,
} from "../../api/types";
import { buildTimelineEvents, buildWeightInsights } from "../../utils/pets";
import { PET_GENDER_SYMBOLS } from "../../utils/petGender";
import { PetQuickActions } from "./PetQuickActions";
import { PetTimeline } from "./PetTimeline";
import { PetWeightCard } from "./PetWeightCard";
import "./PetCard.css";

export interface PetCardProps {
    pet: PetDetail;
    onVisit: () => void;

    onPreviewRecord: (record: PetHealthRecordDto) => void;

    onEdit: () => void;

    // New callbacks for Modal interactions
    onAddRecord: (type?: PetHealthRecordType) => void;
    onEditRecord: (record: PetHealthRecordDto, type: PetHealthRecordType) => void;
    onDeleteRecord: (recordId: number) => Promise<void>;

    deleteRecordPending: boolean;
    // Feedback is now mostly global, but keeping for localized errors if needed
    recordFeedback: { type: "success" | "error"; message: string } | null;
    healthRecordTypes: PetHealthRecordType[];
    formatWithLocale: (date: Date, pattern: string) => string;
    isAdmin: boolean;
    onDeletePet: () => void;
    deletePetPending: boolean;
}



export function PetCard({
    pet,
    onVisit,

    onPreviewRecord,

    onEdit,
    onAddRecord,
    onEditRecord,
    onDeleteRecord,
    deleteRecordPending,
    // recordFeedback, // Unused in new modal flow
    healthRecordTypes,
    formatWithLocale,
    isAdmin,
    onDeletePet,
    deletePetPending,
}: PetCardProps) {
    const { t } = useTranslation(["ownerDetail", "common", "appointments"]);

    const timelineEvents = useMemo(() => buildTimelineEvents(pet), [pet]);
    const weightInsights = useMemo(() => buildWeightInsights(pet), [pet]);

    // Tabs State
    const [activeTab, setActiveTab] = useState<"OVERVIEW" | PetHealthRecordType>("OVERVIEW");

    const ensureRecordForm = (type: PetHealthRecordType) => {
        onAddRecord(type);
    };

    const handleQuickVisit = () => {
        onVisit();
    };

    const handleAddWeight = () => ensureRecordForm("VITALS");
    const handleRecordVaccine = () => ensureRecordForm("OTHER");
    const handleUploadImaging = () => ensureRecordForm("XRAY");

    const speciesLabel =
        pet.type?.name ?? t("ownerDetail:petCard.speciesPending");
    const birthInfo =
        pet.birthDate != null
            ? ` • ${t("ownerDetail:petCard.birth", {
                month: formatWithLocale(new Date(pet.birthDate), "MMMM yyyy"),
            })}`
            : "";

    // Helper to render filtered records for a specific tab
    const renderFilteredRecords = (type: PetHealthRecordType) => {
        const records = pet.healthRecords[type] || [];
        if (records.length === 0) {
            return <div className="muted">{t("ownerDetail:records.empty")}</div>;
        }

        const mapToTimelineType = (t: PetHealthRecordType): "weight" | "imaging" | "lab" | "prescription" | "note" | "other" => {
            switch (t) {
                case "VITALS": return "weight";
                case "XRAY": return "imaging";
                case "BLOOD_WORK": return "lab";
                case "PRESCRIPTION": return "prescription";
                case "EXAM_NOTE": return "note";
                default: return "other";
            }
        };

        return (
            <PetTimeline
                events={records.map((r) => ({
                    id: r.id.toString(),
                    timestamp: r.recordedAt || new Date().toISOString(),
                    date: new Date(r.recordedAt || new Date()),
                    type: mapToTimelineType(type),
                    data: { ...r, type: type },
                    title: r.title || t(`appointments:drawer.records.typeLabels.${type}`),
                    subtitle: r.notes,
                }))}
                onPreviewRecord={(record) => {
                    if (record) onPreviewRecord(record);
                }}
                onDeleteRecord={onDeleteRecord}
                onEditRecord={(record, rType) => onEditRecord(record, rType)}
                deletePending={deleteRecordPending}
            />
        );
    };

    return (
        <div className="pet-card">
            <div className="pet-header">
                <div>
                    <div className="pet-header-title">
                        <h3>{pet.name}</h3>
                        {pet.gender && (
                            <span
                                className={`pet-gender-chip ${pet.gender.toLowerCase()}`}
                                title={
                                    pet.gender === "MALE"
                                        ? t("ownerDetail:petCard.gender.male")
                                        : t("ownerDetail:petCard.gender.female")
                                }
                                aria-label={
                                    pet.gender === "MALE"
                                        ? t("ownerDetail:petCard.gender.male")
                                        : t("ownerDetail:petCard.gender.female")
                                }
                            >
                                {PET_GENDER_SYMBOLS[pet.gender]}
                            </span>
                        )}
                    </div>
                    <span className="muted">
                        {speciesLabel}
                        {birthInfo}
                    </span>
                </div>
                <div className="pet-header-actions">
                    <button
                        className="button secondary"
                        type="button"
                        onClick={onEdit}
                    >
                        {t("ownerDetail:ownerForm.edit")}
                    </button>
                    <button
                        className="button primary"
                        type="button"
                        onClick={onVisit}
                    >
                        {t("ownerDetail:visit.new")}
                    </button>

                    {isAdmin && (
                        <button
                            className="button danger"
                            type="button"
                            title={t("ownerDetail:actions.deletePet")}
                            onClick={onDeletePet}
                            disabled={deletePetPending}
                        >
                            {t("ownerDetail:actions.deletePet")}
                        </button>
                    )}
                </div>
            </div>

            <PetQuickActions
                onVisit={handleQuickVisit}
                onAddWeight={handleAddWeight}
                onRecordVaccine={handleRecordVaccine}
                onUploadImaging={handleUploadImaging}
            />

            <div className="pet-analytics-grid">
                <PetWeightCard
                    insights={weightInsights}
                    onAddWeight={handleAddWeight}
                />
            </div>

            <div className="pet-records-tabs">
                <nav className="tabs-nav">
                    <button
                        className={`tab-button ${activeTab === "OVERVIEW" ? "active" : ""}`}
                        onClick={() => setActiveTab("OVERVIEW")}
                    >
                        Overview
                    </button>
                    {healthRecordTypes.map(type => (
                        <button
                            key={type}
                            className={`tab-button ${activeTab === type ? "active" : ""}`}
                            onClick={() => setActiveTab(type)}
                        >
                            {t(`appointments:drawer.records.typeLabels.${type}`)}
                        </button>
                    ))}
                </nav>

                <div className="tab-actions">
                    <button className="button secondary small" onClick={() => onAddRecord(activeTab === "OVERVIEW" ? "OTHER" : activeTab)}>
                        {t("ownerDetail:records.new")}
                    </button>
                </div>
            </div>

            <div className="pet-records-content">
                {activeTab === "OVERVIEW" ? (
                    <PetTimeline
                        events={timelineEvents}
                        onPreviewRecord={(record) => {
                            if (record) {
                                onPreviewRecord(record);
                            }
                        }}
                        onDeleteRecord={async (recordId) => {
                            await onDeleteRecord(recordId);
                        }}
                        onEditRecord={onEditRecord}
                        deletePending={deleteRecordPending}
                    />
                ) : (
                    renderFilteredRecords(activeTab)
                )}
            </div>
        </div>
    );
}
