import { useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import type { OwnerDetail, OwnerRequest } from "../../api/types";

interface OwnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: OwnerRequest) => void;
    initialData?: OwnerDetail | null;
    isPending: boolean;
    title?: string;
}

export function OwnerModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isPending,
    title,
}: OwnerModalProps) {
    const { t } = useTranslation(["ownerDetail", "owners", "common"]);

    const [formData, setFormData] = useState<OwnerRequest>({
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        telephone: "",
        email: "",
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    firstName: initialData.firstName,
                    lastName: initialData.lastName,
                    address: initialData.address ?? "",
                    city: initialData.city ?? "",
                    telephone: initialData.telephone ?? "",
                    email: initialData.email ?? "",
                });
            } else {
                setFormData({
                    firstName: "",
                    lastName: "",
                    address: "",
                    city: "",
                    telephone: "",
                    email: "",
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const formValid = formData.firstName.trim().length > 0 && formData.lastName.trim().length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title || (initialData ? t("ownerDetail:ownerForm.edit") : t("owners:form.title"))}
            footer={
                <>
                    <button className="button secondary" type="button" onClick={onClose} disabled={isPending}>
                        {t("common:actions.cancel")}
                    </button>
                    <button
                        className="button primary"
                        type="submit"
                        form="owner-form"
                        disabled={!formValid || isPending}
                    >
                        {isPending ? t("common:status.saving") : t("common:actions.save")}
                    </button>
                </>
            }
        >
            <form id="owner-form" onSubmit={handleSubmit} className="owner-form-grid">
                <div className="grid two">
                    <label>
                        {t("owners:form.fields.firstName")}
                        <input
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            disabled={isPending}
                        />
                    </label>
                    <label>
                        {t("owners:form.fields.lastName")}
                        <input
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            disabled={isPending}
                        />
                    </label>
                </div>

                <label>
                    {t("owners:form.fields.address")}
                    <input
                        name="address"
                        value={formData.address ?? ""}
                        onChange={handleChange}
                        disabled={isPending}
                    />
                </label>

                <div className="grid two">
                    <label>
                        {t("owners:form.fields.city")}
                        <input
                            name="city"
                            value={formData.city ?? ""}
                            onChange={handleChange}
                            disabled={isPending}
                        />
                    </label>
                    <label>
                        {t("owners:form.fields.telephone")}
                        <input
                            name="telephone"
                            value={formData.telephone ?? ""}
                            onChange={handleChange}
                            disabled={isPending}
                        />
                    </label>
                </div>

                <label>
                    {t("owners:form.fields.email")}
                    <input
                        type="email"
                        name="email"
                        value={formData.email ?? ""}
                        onChange={handleChange}
                        disabled={isPending}
                    />
                </label>
            </form>
        </Modal>
    );
}
