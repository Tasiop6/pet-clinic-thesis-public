import { useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import type { PetDetail, PetRequest, LocalizedPetType } from "../../api/types";
import { PET_GENDER_SYMBOLS, PET_GENDER_VALUES } from "../../utils/petGender";
import "./PetModal.css";

interface PetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PetRequest) => void;
    initialData?: PetDetail | null;
    petTypes: LocalizedPetType[];
    isPending: boolean;
}

export function PetModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    petTypes,
    isPending,
}: PetModalProps) {
    const { t } = useTranslation(["ownerDetail", "common"]);

    const [name, setName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [petTypeId, setPetTypeId] = useState<number | null>(null);
    const [gender, setGender] = useState<"MALE" | "FEMALE" | null>(null);

    const [typeError, setTypeError] = useState(false);
    const [genderError, setGenderError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setBirthDate(initialData.birthDate ?? "");
                setPetTypeId(initialData.type?.id ?? null);
                setGender(initialData.gender ?? null);
            } else {
                setName("");
                setBirthDate("");
                setPetTypeId(null);
                setGender(null);
            }
            setTypeError(false);
            setGenderError(false);
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (petTypeId === null) {
            setTypeError(true);
            return;
        }
        if (gender === null) {
            setGenderError(true);
            return;
        }

        const payload: PetRequest = {
            name: name.trim(),
            petTypeId,
            gender,
            birthDate: birthDate || undefined,
        };

        onSubmit(payload);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? t("ownerDetail:petForm.editTitle") : t("ownerDetail:petSection.add")}
            footer={
                <>
                    <button className="button secondary" type="button" onClick={onClose} disabled={isPending}>
                        {t("common:actions.cancel")}
                    </button>
                    <button
                        className="button primary"
                        type="submit"
                        form="pet-form"
                        disabled={!name || !petTypeId || !gender || isPending}
                    >
                        {isPending ? t("common:status.saving") : t("common:actions.save")}
                    </button>
                </>
            }
        >
            <form id="pet-form" onSubmit={handleSubmit} className="pet-form-content">
                <label>
                    {t("ownerDetail:petForm.name")}
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isPending}
                    />
                </label>

                <fieldset className="pet-type-field">
                    <legend>{t("ownerDetail:petForm.speciesLegend")}</legend>
                    <div className="pet-type-selector">
                        {petTypes.map((type) => (
                            <button
                                type="button"
                                key={type.id}
                                className={`pet-type-card${petTypeId === type.id ? " active" : ""}`}
                                onClick={() => { setPetTypeId(type.id); setTypeError(false); }}
                                disabled={isPending}
                            >
                                <span className="pet-type-icon">{type.icon}</span>
                                <span className="pet-type-name">{type.displayName}</span>
                            </button>
                        ))}
                    </div>
                    {typeError && <span className="pet-type-error">{t("ownerDetail:petForm.errorNoType")}</span>}
                </fieldset>

                <fieldset className="pet-gender-field">
                    <legend>{t("ownerDetail:petForm.genderLegend")}</legend>
                    <div className="pet-gender-selector">
                        {PET_GENDER_VALUES.map((g) => (
                            <button
                                key={g}
                                type="button"
                                className={`pet-gender-toggle ${g === "FEMALE" ? "female" : "male"}${gender === g ? " active" : ""}`}
                                onClick={() => { setGender(g); setGenderError(false); }}
                                disabled={isPending}
                            >
                                <span className="pet-gender-icon">{PET_GENDER_SYMBOLS[g]}</span>
                                <span className="pet-gender-label">
                                    {t(g === "MALE" ? "ownerDetail:petForm.gender.male" : "ownerDetail:petForm.gender.female")}
                                </span>
                            </button>
                        ))}
                    </div>
                    {genderError && <span className="pet-gender-error">{t("ownerDetail:petForm.genderError")}</span>}
                </fieldset>

                <label>
                    {t("ownerDetail:petForm.birthDate")}
                    <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        disabled={isPending}
                    />
                </label>
            </form>
        </Modal>
    );
}
