import { useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Modal } from "../common/Modal";
import type {
    PetHealthRecordDto,
    PetHealthRecordType,
    PetHealthRecordCreateRequest,
} from "../../api/types";
import "./HealthRecordModal.css";

interface HealthRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: PetHealthRecordCreateRequest) => void;
    initialData?: PetHealthRecordDto | null;
    isPending: boolean;
    healthRecordTypes: PetHealthRecordType[];
    defaultType?: PetHealthRecordType;
}

export function HealthRecordModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isPending,
    healthRecordTypes,
    defaultType,
}: HealthRecordModalProps) {
    const { t } = useTranslation(["ownerDetail", "appointments"]);

    const [type, setType] = useState<PetHealthRecordType>(
        defaultType ?? healthRecordTypes[0] ?? "OTHER"
    );
    const [recordDate, setRecordDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");

    // Metrics
    const [weightKg, setWeightKg] = useState("");
    const [temperatureC, setTemperatureC] = useState("");
    const [heartRate, setHeartRate] = useState("");
    const [respirationRate, setRespirationRate] = useState("");
    const [additionalMetrics, setAdditionalMetrics] = useState("");

    // Files
    const [files, setFiles] = useState<File[]>([]);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalError(null);
            setFiles([]);
            if (initialData) {
                setType(defaultType ?? "OTHER");
                setRecordDate(initialData.recordedAt ? initialData.recordedAt.split("T")[0] : format(new Date(), "yyyy-MM-dd"));
                setTitle(initialData.title ?? "");
                setNotes(initialData.notes ?? "");
                setWeightKg(initialData.weightKg?.toString() ?? "");
                setTemperatureC(initialData.temperatureC?.toString() ?? "");
                setHeartRate(initialData.heartRate?.toString() ?? "");
                setRespirationRate(initialData.respirationRate?.toString() ?? "");
                setAdditionalMetrics(initialData.additionalMetrics ?? "");
            } else {
                setType(defaultType ?? healthRecordTypes[0] ?? "OTHER");
                setRecordDate(format(new Date(), "yyyy-MM-dd"));
                setTitle("");
                setNotes("");
                setWeightKg("");
                setTemperatureC("");
                setHeartRate("");
                setRespirationRate("");
                setAdditionalMetrics("");
            }
        }
    }, [isOpen, initialData, defaultType, healthRecordTypes]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
        const oversized = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
        if (oversized) {
            setLocalError(t("ownerDetail:records.feedback.fileTooLarge", { name: oversized.name }));
            return;
        }

        const hasDetails =
            title.trim() ||
            notes.trim() ||
            weightKg.trim() ||
            temperatureC.trim() ||
            heartRate.trim() ||
            respirationRate.trim() ||
            additionalMetrics.trim();

        if (files.length === 0 && !hasDetails) {
            setLocalError(t("ownerDetail:records.feedback.missingContent"));
            return;
        }

        const payload: PetHealthRecordCreateRequest = {
            type,
            title: title.trim() || undefined,
            notes: notes.trim() || undefined,
            recordDate,
            files: initialData ? [] : files, // Don't re-upload files on edit for now
            weightKg: weightKg.trim() || undefined,
            temperatureC: temperatureC.trim() || undefined,
            heartRate: heartRate.trim() || undefined,
            respirationRate: respirationRate.trim() || undefined,
            additionalMetrics: additionalMetrics.trim() || undefined,
        };

        onSubmit(payload);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? t("ownerDetail:records.form.update") : t("ownerDetail:records.new")}
            footer={
                <>
                    <button className="button secondary" type="button" onClick={onClose} disabled={isPending}>
                        {t("ownerDetail:records.cancel")}
                    </button>
                    <button
                        className="button primary"
                        type="submit"
                        form="record-form"
                        disabled={isPending}
                    >
                        {isPending ? t("ownerDetail:records.form.submitting") : (initialData ? t("ownerDetail:records.form.update") : t("ownerDetail:records.form.submit"))}
                    </button>
                </>
            }
        >
            <form id="record-form" onSubmit={handleSubmit} className="record-form-content">
                <div className="grid two">
                    <label>
                        {t("ownerDetail:records.form.type")}
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as PetHealthRecordType)}
                            disabled={isPending}
                        >
                            {healthRecordTypes.map((tKey) => (
                                <option key={tKey} value={tKey}>
                                    {t(`appointments:drawer.records.typeLabels.${tKey}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        {t("ownerDetail:records.form.date")}
                        <input
                            type="date"
                            value={recordDate}
                            onChange={(e) => setRecordDate(e.target.value)}
                            disabled={isPending}
                        />
                    </label>
                </div>

                <label>
                    {t("ownerDetail:records.form.title")}
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("ownerDetail:records.form.titlePlaceholder")}
                        disabled={isPending}
                    />
                </label>

                <label>
                    {t("ownerDetail:records.form.notes")}
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("ownerDetail:records.form.notesPlaceholder")}
                        disabled={isPending}
                        rows={3}
                    />
                </label>

                <div className="metrics-grid">
                    <label>
                        {t("ownerDetail:records.form.metrics.weight")}
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            disabled={isPending}
                            placeholder="kg"
                        />
                    </label>
                    <label>
                        {t("ownerDetail:records.form.metrics.temperature")}
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            value={temperatureC}
                            onChange={(e) => setTemperatureC(e.target.value)}
                            disabled={isPending}
                            placeholder="°C"
                        />
                    </label>
                    <label>
                        {t("ownerDetail:records.form.metrics.heartRate")}
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={heartRate}
                            onChange={(e) => setHeartRate(e.target.value)}
                            disabled={isPending}
                            placeholder="bpm"
                        />
                    </label>
                    <label>
                        {t("ownerDetail:records.form.metrics.respiration")}
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={respirationRate}
                            onChange={(e) => setRespirationRate(e.target.value)}
                            disabled={isPending}
                            placeholder="rpm"
                        />
                    </label>
                </div>

                <label>
                    {t("ownerDetail:records.form.additional")}
                    <textarea
                        value={additionalMetrics}
                        onChange={(e) => setAdditionalMetrics(e.target.value)}
                        placeholder={t("ownerDetail:records.form.additionalPlaceholder")}
                        disabled={isPending}
                        rows={2}
                    />
                </label>

                {!initialData && (
                    <label className="file-input">
                        <span>{t("ownerDetail:records.form.files")}</span>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            onChange={handleFileChange}
                            disabled={isPending}
                        />
                    </label>
                )}

                {localError && (
                    <div className="record-feedback error">
                        {localError}
                    </div>
                )}
            </form>
        </Modal>
    );
}
