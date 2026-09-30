import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import type { VisitRequest } from "../../api/types";
import "./VisitModal.css";

interface VisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: VisitRequest) => void;
    isPending: boolean;
    petName?: string;
}

export function VisitModal({
    isOpen,
    onClose,
    onSubmit,
    isPending,
    petName,
}: VisitModalProps) {
    const { t } = useTranslation(["ownerDetail", "common"]);
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit({
            date,
            description: description.trim() || undefined,
        });
        // Reset form after submit if needed, or rely on parent closing relying on unmount/remount logic
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("ownerDetail:visit.new") + (petName ? ` - ${petName}` : "")}
            footer={
                <>
                    <button className="button secondary" type="button" onClick={onClose} disabled={isPending}>
                        {t("common:actions.cancel")}
                    </button>
                    <button
                        className="button primary"
                        type="submit"
                        form="visit-form"
                        disabled={!date || isPending}
                    >
                        {isPending ? t("ownerDetail:visit.submitting") : t("ownerDetail:visit.submit")}
                    </button>
                </>
            }
        >
            <form id="visit-form" onSubmit={handleSubmit} className="visit-form-grid">
                <label>
                    {t("ownerDetail:visit.fields.date")}
                    <input
                        type="date"
                        name="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={isPending}
                    />
                </label>
                <label>
                    {t("ownerDetail:visit.fields.notes")}
                    <textarea
                        name="description"
                        placeholder={t("ownerDetail:visit.fields.notesPlaceholder")}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isPending}
                    />
                </label>
            </form>
        </Modal>
    );
}
