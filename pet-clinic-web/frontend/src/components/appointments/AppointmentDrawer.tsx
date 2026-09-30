import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { el, enGB } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type {
  AppointmentDetail,
  AppointmentRecordRequest,
  OwnerDetail,
  OwnerSummary,
  VetDto,
  PetHealthRecordType,
} from "../../api/types";
import { Loader } from "../Loader";
import { ErrorBanner, SuccessBanner } from "../Feedback";
import { PrescriptionModal } from "./PrescriptionModal";
import "./AppointmentDrawer.css";
import { PET_GENDER_SYMBOLS } from "../../utils/petGender";

const normalizePhone = (value: string | null | undefined) =>
  value ? value.replace(/\D+/g, "") : "";

type DrawerState =
  | { mode: "create"; slot: Date }
  | { mode: "edit"; appointmentId: number }
  | null;

interface AppointmentDrawerProps {
  owners: OwnerSummary[];
  selectedOwnerId: number | "";
  onOwnerChange: (value: number | "") => void;
  ownerDetail?: OwnerDetail;
  vets: VetDto[];
  vetsLoading: boolean;
  vetsError: boolean;
  selectedVetId: number | "";
  onVetChange: (value: number | "") => void;
  drawer: DrawerState;
  onClose: () => void;
  onCreate: (formData: FormData, slot: Date) => Promise<void> | void;
  onDelete: (appointmentId: number) => void;
  onSave: (detail: AppointmentDetail, formData: FormData) => Promise<void> | void;
  onRecordUpload: (appointmentId: number, payload: AppointmentRecordRequest) => Promise<void>;
  onRecordDelete: (appointmentId: number, recordId: number) => Promise<void>;
  appointmentDetail?: AppointmentDetail;
  creating: boolean;
  saving: boolean;
  deleting: boolean;
  uploadPending: boolean;
  deleteRecordPending: boolean;
  healthRecordTypes: PetHealthRecordType[];
  createError?: string | null;
  saveError?: string | null;
}

export function AppointmentDrawer({
  owners,
  selectedOwnerId,
  onOwnerChange,
  ownerDetail,
  vets,
  vetsLoading,
  vetsError,
  selectedVetId,
  onVetChange,
  drawer,
  onClose,
  onCreate,
  onDelete,
  onSave,
  onRecordUpload,
  onRecordDelete,
  appointmentDetail,
  creating,
  saving,
  deleting,
  uploadPending,
  deleteRecordPending,
  healthRecordTypes,
  createError,
  saveError,
}: AppointmentDrawerProps) {
  const { t, i18n } = useTranslation(["appointments", "common"]);
  const locale = useMemo(() => (i18n.language === "en" ? enGB : el), [i18n.language]);
  const initialRecordType = healthRecordTypes[0] ?? "OTHER";
  const [uploadInfo, setUploadInfo] = useState({
    type: initialRecordType as PetHealthRecordType,
    recordDate: format(new Date(), "yyyy-MM-dd"),
    weightKg: "",
    temperatureC: "",
    heartRate: "",
    respirationRate: "",
    additionalMetrics: "",
  });
  const [uploadMessage, setUploadMessage] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | "">("");
  const [contactTelephone, setContactTelephone] = useState("");
  const [ownerAutoMatch, setOwnerAutoMatch] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const ownerDropdownRef = useRef<HTMLDivElement | null>(null);
  const ownerSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!healthRecordTypes.includes(uploadInfo.type)) {
      setUploadInfo((prev) => ({
        ...prev,
        type: (healthRecordTypes[0] ?? prev.type) as PetHealthRecordType,
      }));
    }
  }, [healthRecordTypes, uploadInfo.type]);

  useEffect(() => {
    if (drawer?.mode === "create") {
      setUploadMessage(null);
    }
    setSaveMessage(null);
  }, [drawer]);

  useEffect(() => {
    setContactTelephone("");
    setOwnerAutoMatch(true);
    setOwnerFilter("");
    setOwnerDropdownOpen(false);
  }, [drawer?.mode]);

  const ownerLabel = useCallback(
    (owner: OwnerSummary) => {
      const name = `${owner.lastName}, ${owner.firstName}`;
      const contactParts = [owner.telephone, owner.email].filter(Boolean);
      return contactParts.length > 0 ? `${name} • ${contactParts.join(" • ")}` : name;
    },
    [],
  );

  const filteredOwners = useMemo(() => {
    const trimmed = ownerFilter.trim().toLowerCase();
    if (!trimmed) {
      return owners;
    }
    return owners.filter((owner) => ownerLabel(owner).toLowerCase().includes(trimmed));
  }, [ownerFilter, ownerLabel, owners]);

  const selectedOwner = useMemo(
    () => owners.find((owner) => owner.id === selectedOwnerId),
    [owners, selectedOwnerId],
  );

  useEffect(() => {
    if (ownerDropdownOpen) {
      setTimeout(() => ownerSearchRef.current?.focus(), 0);
    }
  }, [ownerDropdownOpen]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        ownerDropdownOpen &&
        ownerDropdownRef.current &&
        event.target instanceof Node &&
        !ownerDropdownRef.current.contains(event.target)
      ) {
        setOwnerDropdownOpen(false);
        setOwnerFilter("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [ownerDropdownOpen]);

  useEffect(() => {
    if (!drawer || drawer.mode !== "create" || !ownerAutoMatch) {
      return;
    }
    const normalizedInput = normalizePhone(contactTelephone);
    if (!normalizedInput) {
      if (selectedOwnerId !== "") {
        onOwnerChange("");
      }
      setSelectedPetId("");
      return;
    }
    const matchedOwner = owners.find(
      (candidate) => normalizePhone(candidate.telephone) === normalizedInput,
    );
    if (matchedOwner) {
      if (selectedOwnerId !== matchedOwner.id) {
        onOwnerChange(matchedOwner.id);
        setSelectedPetId("");
      }
    } else if (selectedOwnerId !== "") {
      onOwnerChange("");
      setSelectedPetId("");
    }
  }, [contactTelephone, drawer, onOwnerChange, owners, ownerAutoMatch, selectedOwnerId]);

  useEffect(() => {
    if (!drawer || drawer.mode !== "create") {
      setSelectedPetId("");
      return;
    }

    if (ownerDetail && ownerDetail.pets.length > 0) {
      setSelectedPetId((current) => {
        if (ownerDetail.pets.some((pet) => pet.id === current)) {
          return current;
        }
        if (ownerDetail.pets.length === 1) {
          const firstPet = ownerDetail.pets[0];
          return firstPet?.id ?? "";
        }
        return "";
      });
    } else {
      setSelectedPetId("");
    }
  }, [drawer, ownerDetail]);

  useEffect(() => {
    if (!drawer || drawer.mode !== "create") {
      return;
    }
    if (!ownerDetail?.telephone) {
      return;
    }
    if (contactTelephone.trim().length === 0 && ownerAutoMatch) {
      setContactTelephone(ownerDetail.telephone);
    }
  }, [contactTelephone, drawer, ownerAutoMatch, ownerDetail]);

  const petOptions = useMemo(() => ownerDetail?.pets ?? [], [ownerDetail]);
  const vetOptions = useMemo(() => {
    if (appointmentDetail?.vet?.id && !vets.some((vet) => vet.id === appointmentDetail.vet?.id)) {
      return [
        ...vets,
        {
          id: appointmentDetail.vet.id,
          firstName: appointmentDetail.vet.name ?? "",
          lastName: "",
          email: appointmentDetail.vet.email ?? "",
          specialties: [],
          specialtyIds: [],
          displayName:
            appointmentDetail.vet.name ?? appointmentDetail.vet.email ?? t("appointments:drawer.edit.fields.vetFallback"),
        } satisfies VetDto,
      ];
    }
    return vets;
  }, [appointmentDetail?.vet, t, vets]);

  if (!drawer) {
    return null;
  }

  const closeDrawer = () => {
    setUploadMessage(null);
    setShowPrescription(false);
    setContactTelephone("");
    setSelectedPetId("");
    setOwnerFilter("");
    setOwnerDropdownOpen(false);
    onOwnerChange("");
    onVetChange("");
    onClose();
  };

  if (drawer.mode === "create") {
    const slot = drawer.slot;
    const defaultDate = format(slot, "yyyy-MM-dd");
    const defaultTime = format(slot, "HH:mm");
    const normalizedContactTelephone = contactTelephone.trim();
    const canSubmit =
      (selectedOwnerId !== "" && selectedPetId !== "") || normalizedContactTelephone.length > 0;
    return (
      <>
        <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" />
        <aside className="appointment-drawer open">
          <div className="drawer-header">
            <div>
              <h2>{t("appointments:drawer.create.title")}</h2>
              <p className="muted">
                {t("appointments:drawer.create.subtitle", {
                  date: format(slot, "EEEE dd MMM yyyy", { locale }),
                  time: format(slot, "HH:mm"),
                })}
              </p>
            </div>
            <button className="button secondary" onClick={closeDrawer}>
              {t("common:actions.close")}
            </button>
          </div>

          <form
            className="drawer-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              await onCreate(formData, slot);
            }}
          >
            {createError && <ErrorBanner message={createError} />}
            <div className="grid three">
              <label>
                {t("appointments:drawer.create.fields.telephone")}
                <input
                  type="tel"
                  name="contactTelephone"
                  value={contactTelephone}
                  onChange={(event) => {
                    setOwnerAutoMatch(true);
                    setContactTelephone(event.target.value);
                  }}
                  placeholder={t("appointments:drawer.create.fields.telephonePlaceholder")}
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={64}
                />
              </label>
              <label>
                {t("appointments:drawer.create.fields.owner")}
                <div className="owner-select" ref={ownerDropdownRef}>
                  <button
                    type="button"
                    className="owner-select-trigger"
                    onClick={() => {
                      setOwnerDropdownOpen((open) => !open);
                      setOwnerFilter("");
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={ownerDropdownOpen}
                  >
                    <span>
                      {selectedOwner
                        ? ownerLabel(selectedOwner)
                        : t("appointments:drawer.create.fields.ownerPlaceholder")}
                    </span>
                    <span className="owner-select-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  <input type="hidden" name="ownerId" value={selectedOwnerId} />
                  {ownerDropdownOpen && (
                    <div className="owner-select-menu">
                      <input
                        ref={ownerSearchRef}
                        type="search"
                        value={ownerFilter}
                        onChange={(event) => setOwnerFilter(event.target.value)}
                        placeholder={t("appointments:drawer.create.fields.ownerSearchPlaceholder")}
                        autoComplete="off"
                      />
                      <div className="owner-select-list" role="listbox">
                        {filteredOwners.length === 0 ? (
                          <div className="owner-select-empty">
                            {t("appointments:drawer.create.fields.ownerSearchNoResults")}
                          </div>
                        ) : (
                          filteredOwners.map((owner) => (
                            <button
                              key={owner.id}
                              type="button"
                              role="option"
                              className="owner-select-option"
                              onClick={() => {
                                setOwnerAutoMatch(false);
                                onOwnerChange(owner.id);
                                setSelectedPetId("");
                                if (owner.telephone) {
                                  setContactTelephone(owner.telephone);
                                }
                                setOwnerFilter("");
                                setOwnerDropdownOpen(false);
                              }}
                            >
                              {ownerLabel(owner)}
                            </button>
                          ))
                        )}
                      </div>
                      {selectedOwnerId !== "" && (
                        <button
                          type="button"
                          className="owner-select-clear"
                          onClick={() => {
                            setOwnerAutoMatch(true);
                            onOwnerChange("");
                            setSelectedPetId("");
                            setContactTelephone("");
                            setOwnerFilter("");
                            setOwnerDropdownOpen(false);
                          }}
                        >
                          {t("appointments:drawer.create.fields.ownerClearSelection")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label>
                {t("appointments:drawer.create.fields.pet")}
                <select
                  name="petId"
                  disabled={!ownerDetail || petOptions.length === 0}
                  value={selectedPetId}
                  onChange={(event) =>
                    setSelectedPetId(event.target.value ? Number(event.target.value) : "")
                  }
                >
                  <option value="">
                    {ownerDetail
                      ? petOptions.length === 0
                        ? t("appointments:drawer.create.fields.petPlaceholder.empty")
                        : t("appointments:drawer.create.fields.petPlaceholder.default")
                      : t("appointments:drawer.create.fields.petPlaceholder.noOwner")}
                  </option>
                  {petOptions.map((pet) => {
                    const genderPrefix = pet.gender ? `${PET_GENDER_SYMBOLS[pet.gender]} ` : "";
                    const speciesSuffix = pet.type?.name ? ` (${pet.type.name})` : "";
                    return (
                      <option key={pet.id} value={pet.id}>
                        {`${genderPrefix}${pet.name}${speciesSuffix}`}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <label>
              {t("appointments:drawer.create.fields.vet")}
              <select
                name="vetId"
                value={selectedVetId}
                disabled={vetsLoading || vetOptions.length === 0}
                onChange={(event) => {
                  const value = event.target.value ? Number(event.target.value) : "";
                  onVetChange(value);
                }}
              >
                <option value="">
                  {vetsLoading
                    ? t("appointments:drawer.create.fields.vetPlaceholder.loading")
                    : vetsError
                      ? t("appointments:drawer.create.fields.vetPlaceholder.error")
                      : vetOptions.length === 0
                        ? t("appointments:drawer.create.fields.vetPlaceholder.empty")
                        : t("appointments:drawer.create.fields.vetPlaceholder.default")}
                </option>
                {vetOptions.map((vet) => (
                  <option key={vet.id} value={vet.id}>
                    {vet.displayName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid two">
              <label>
                {t("appointments:drawer.create.fields.date")}
                <input type="date" name="date" defaultValue={defaultDate} required />
              </label>
              <label>
                {t("appointments:drawer.create.fields.time")}
                <input
                  type="time"
                  name="time"
                  min="07:00"
                  max="21:00"
                  step={1800}
                  defaultValue={defaultTime}
                  required
                />
              </label>
            </div>

            <label className="notes-field">
              {t("appointments:drawer.create.fields.notes")}
              <textarea
                name="notes"
                placeholder={t("appointments:drawer.create.fields.notesPlaceholder")}
              />
            </label>

            <label>
              {t("appointments:drawer.create.fields.findings")}
              <textarea
                name="clinicalFindings"
                placeholder={t("appointments:drawer.create.fields.findingsPlaceholder")}
              />
            </label>

            <div className="grid two">
              <label>
                {t("appointments:drawer.create.fields.treatments")}
                <textarea
                  name="treatments"
                  placeholder={t("appointments:drawer.create.fields.treatmentsPlaceholder")}
                />
              </label>
              <label>
                {t("appointments:drawer.create.fields.medications")}
                <textarea
                  name="medications"
                  placeholder={t("appointments:drawer.create.fields.medicationsPlaceholder")}
                />
              </label>
            </div>

            <button className="button" type="submit" disabled={creating || !canSubmit}>
              {creating
                ? t("appointments:drawer.create.actions.submitting")
                : t("appointments:drawer.create.actions.submit")}
            </button>
          </form>
        </aside>
      </>
    );
  }

  if (!appointmentDetail) {
    return (
      <>
        <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" />
        <aside className="appointment-drawer open">
          <div className="drawer-header">
            <h2>{t("appointments:drawer.edit.loading")}</h2>
            <button className="button secondary" onClick={closeDrawer}>
              {t("common:actions.close")}
            </button>
          </div>
          <Loader />
        </aside>
      </>
    );
  }

  const attachmentMessage = uploadMessage
    ? uploadMessage.type === "error"
      ? { component: <ErrorBanner message={uploadMessage.message} /> }
      : { component: <SuccessBanner message={uploadMessage.message} /> }
    : null;

  return (
    <>
      <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" />
      <aside className="appointment-drawer open">
        <div className="drawer-header">
          <div>
            <div className="drawer-title">
              <h2>{appointmentDetail.pet?.name ?? t("appointments:drawer.edit.titleFallback")}</h2>
              {appointmentDetail.pet?.gender && (
                <span
                  className={`gender-chip ${appointmentDetail.pet.gender.toLowerCase()}`}
                  title={
                    appointmentDetail.pet.gender === "MALE"
                      ? t("appointments:drawer.petGender.male")
                      : t("appointments:drawer.petGender.female")
                  }
                  aria-label={
                    appointmentDetail.pet.gender === "MALE"
                      ? t("appointments:drawer.petGender.male")
                      : t("appointments:drawer.petGender.female")
                  }
                >
                  {PET_GENDER_SYMBOLS[appointmentDetail.pet.gender]}
                </span>
              )}
            </div>
            <p className="muted">
              {format(new Date(appointmentDetail.appointmentTime), "EEEE dd MMM yyyy · HH:mm", {
                locale,
              })}
            </p>
            <p className="muted">
              {appointmentDetail.vet
                ? t("appointments:drawer.edit.assignedVet", {
                  vet: appointmentDetail.vet.name ?? appointmentDetail.vet.email ?? t("appointments:drawer.edit.fields.vetFallback"),
                })
                : t("appointments:drawer.edit.assignedVetNone")}
            </p>
          </div>
          <div className="drawer-actions">
            <button
              className="button"
              type="button"
              onClick={() => setShowPrescription(true)}
            >
              {t("appointments:drawer.edit.buttons.prescription")}
            </button>
            <button
              className="button danger"
              onClick={() => onDelete(appointmentDetail.id)}
              disabled={deleting}
            >
              {deleting
                ? t("appointments:drawer.edit.buttons.deleting")
                : t("appointments:drawer.edit.buttons.delete")}
            </button>
            <button className="button secondary" onClick={closeDrawer}>
              {t("appointments:drawer.edit.buttons.close")}
            </button>
          </div>
        </div>

        <form
          className="drawer-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaveMessage(null);
            const formData = new FormData(event.currentTarget);
            try {
              await onSave(appointmentDetail, formData);
              setSaveMessage(t("appointments:drawer.edit.saved"));
            } catch {
              // The parent mutation supplies the localized error banner.
            }
          }}
        >
          {saveError && <ErrorBanner message={saveError} />}
          {saveMessage && <SuccessBanner message={saveMessage} />}
          <div className="grid two">
            <label>
              {t("appointments:drawer.create.fields.owner")}
              <input
                value={
                  appointmentDetail.owner?.name ??
                  t("appointments:drawer.create.fields.ownerFallback")
                }
                disabled
              />
            </label>
            <label>
              {t("appointments:drawer.create.fields.pet")}
              <input
                value={
                  appointmentDetail.pet?.name ??
                  t("appointments:drawer.create.fields.petPlaceholder.empty")
                }
                disabled
              />
            </label>
          </div>

          <label>
            {t("appointments:drawer.edit.fields.telephone.label")}
            <input
              type="tel"
              name="contactTelephone"
              defaultValue={appointmentDetail.contactTelephone ?? ""}
              placeholder={t("appointments:drawer.edit.fields.telephone.placeholder")}
              autoComplete="tel"
              maxLength={64}
            />
          </label>

          <label>
            {t("appointments:drawer.edit.fields.vet.label")}
            <select
              name="vetId"
              defaultValue={appointmentDetail.vet?.id ?? ""}
              disabled={vetsLoading || vetOptions.length === 0}
            >
              <option value="">
                {vetsLoading
                  ? t("appointments:drawer.edit.fields.vet.loading")
                  : vetsError
                    ? t("appointments:drawer.edit.fields.vet.error")
                    : vetOptions.length === 0
                      ? t("appointments:drawer.edit.fields.vet.empty")
                      : t("appointments:drawer.edit.fields.vet.placeholder")}
              </option>
              {vetOptions.map((vet) => (
                <option key={vet.id} value={vet.id}>
                  {vet.displayName}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("appointments:drawer.edit.fields.notes.label")}
            <textarea
              name="notes"
              defaultValue={appointmentDetail.notes ?? ""}
              placeholder={t("appointments:drawer.edit.fields.notes.placeholder")}
            />
          </label>

          <div className="grid two">
            <label>
              {t("appointments:drawer.edit.fields.findings.label")}
              <textarea
                name="clinicalFindings"
                defaultValue={appointmentDetail.clinicalFindings ?? ""}
                placeholder={t("appointments:drawer.edit.fields.findings.placeholder")}
              />
            </label>
            <label>
              {t("appointments:drawer.edit.fields.treatments.label")}
              <textarea
                name="treatments"
                defaultValue={appointmentDetail.treatments ?? ""}
                placeholder={t("appointments:drawer.edit.fields.treatments.placeholder")}
              />
            </label>
          </div>

          <label>
            {t("appointments:drawer.edit.fields.medications.label")}
            <textarea
              name="medications"
              defaultValue={appointmentDetail.medications ?? ""}
              placeholder={t("appointments:drawer.edit.fields.medications.placeholder")}
            />
          </label>

          <button className="button" type="submit" disabled={saving}>
            {saving
              ? t("appointments:drawer.edit.buttons.saving")
              : t("appointments:drawer.edit.buttons.save")}
          </button>
        </form>

        <div className="drawer-section">
          <h3>{t("appointments:drawer.records.title")}</h3>
          <p className="muted">{t("appointments:drawer.records.description")}</p>

          {attachmentMessage?.component}

          <form
            className="upload-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const formData = new FormData(formElement);
              const fileElement = formElement.elements.namedItem("files");
              const fileInput = fileElement instanceof HTMLInputElement ? fileElement : null;
              const files = Array.from(fileInput?.files ?? []);
              const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
              const oversized = files.find((candidate) => candidate.size > MAX_FILE_SIZE_BYTES);
              if (oversized) {
                setUploadMessage({
                  type: "error",
                  message: t("appointments:drawer.records.errors.fileTooLarge", {
                    name: oversized.name,
                  }),
                });
                return;
              }
              const hasDetails = Boolean(
                (formData.get("title") ?? "").toString().trim() ||
                (formData.get("notes") ?? "").toString().trim() ||
                (formData.get("weightKg") ?? "").toString().trim() ||
                (formData.get("temperatureC") ?? "").toString().trim() ||
                (formData.get("heartRate") ?? "").toString().trim() ||
                (formData.get("respirationRate") ?? "").toString().trim() ||
                (formData.get("additionalMetrics") ?? "").toString().trim()
              );
              if (files.length === 0 && !hasDetails) {
                setUploadMessage({
                  type: "error",
                  message: "Προσθέστε αρχείο ή συμπληρώστε τα στοιχεία του φακέλου πριν τη μεταφόρτωση.",
                });
                return;
              }
              const payload: AppointmentRecordRequest = {
                type: formData.get("type") as PetHealthRecordType,
                title: formData.get("title") ? String(formData.get("title")) : undefined,
                notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
                recordDate: formData.get("recordDate")
                  ? String(formData.get("recordDate"))
                  : undefined,
                files,
                weightKg: formData.get("weightKg")?.toString().trim() || undefined,
                temperatureC: formData.get("temperatureC")?.toString().trim() || undefined,
                heartRate: formData.get("heartRate")?.toString().trim() || undefined,
                respirationRate:
                  formData.get("respirationRate")?.toString().trim() || undefined,
                additionalMetrics:
                  formData.get("additionalMetrics")?.toString().trim() || undefined,
              };
              try {
                await onRecordUpload(appointmentDetail.id, payload);
                setUploadMessage({
                  type: "success",
                  message: t("appointments:drawer.records.messages.uploaded"),
                });
                formElement.reset();
                setUploadInfo((prev) => ({
                  ...prev,
                  recordDate: format(new Date(), "yyyy-MM-dd"),
                  weightKg: "",
                  temperatureC: "",
                  heartRate: "",
                  respirationRate: "",
                  additionalMetrics: "",
                }));
              } catch (error) {
                setUploadMessage({
                  type: "error",
                  message:
                    error instanceof Error
                      ? error.message
                      : t("common:errors.generic"),
                });
              }
            }}
          >
            <div className="grid two">
              <label>
                {t("appointments:drawer.records.form.type")}
                <select
                  name="type"
                  value={uploadInfo.type}
                  onChange={(event) =>
                    setUploadInfo((prev) => ({
                      ...prev,
                      type: event.target.value as PetHealthRecordType,
                    }))
                  }
                >
                  {healthRecordTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`appointments:drawer.records.typeLabels.${type}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("appointments:drawer.records.form.recordDate")}
                <input
                  type="date"
                  name="recordDate"
                  value={uploadInfo.recordDate}
                  onChange={(event) =>
                    setUploadInfo((prev) => ({ ...prev, recordDate: event.target.value }))
                  }
                />
              </label>
            </div>
            <label>
              {t("appointments:drawer.records.form.title")}
              <input
                name="title"
                placeholder={t("appointments:drawer.records.form.titlePlaceholder")}
              />
            </label>
            <label>
              {t("appointments:drawer.records.form.notes")}
              <textarea
                name="notes"
                placeholder={t("appointments:drawer.records.form.notesPlaceholder")}
              />
            </label>

            <div className="metrics-grid">
              <label>
                {t("appointments:drawer.records.form.metrics.weight")}
                <input
                  type="number"
                  inputMode="decimal"
                  name="weightKg"
                  step="0.01"
                  min="0"
                  value={uploadInfo.weightKg}
                  onChange={(event) =>
                    setUploadInfo((prev) => ({ ...prev, weightKg: event.target.value }))
                  }
                  placeholder={t("appointments:drawer.records.form.metrics.weightPlaceholder")}
                />
              </label>
              <label>
                {t("appointments:drawer.records.form.metrics.temperature")}
                <input
                  type="number"
                  inputMode="decimal"
                  name="temperatureC"
                  step="0.1"
                  min="0"
                  value={uploadInfo.temperatureC}
                  onChange={(event) =>
                    setUploadInfo((prev) => ({ ...prev, temperatureC: event.target.value }))
                  }
                  placeholder={t("appointments:drawer.records.form.metrics.temperaturePlaceholder")}
                />
              </label>
              <label>
                {t("appointments:drawer.records.form.metrics.heartRate")}
                <input
                  type="number"
                  inputMode="numeric"
                  name="heartRate"
                  min="0"
                  value={uploadInfo.heartRate}
                  onChange={(event) =>
                    setUploadInfo((prev) => ({ ...prev, heartRate: event.target.value }))
                  }
                  placeholder={t("appointments:drawer.records.form.metrics.heartRatePlaceholder")}
                />
              </label>
              <label>
                {t("appointments:drawer.records.form.metrics.respiration")}
                <input
                  type="number"
                  inputMode="numeric"
                  name="respirationRate"
                  min="0"
                  value={uploadInfo.respirationRate}
                  onChange={(event) =>
                    setUploadInfo((prev) => ({ ...prev, respirationRate: event.target.value }))
                  }
                  placeholder={t("appointments:drawer.records.form.metrics.respirationPlaceholder")}
                />
              </label>
            </div>

            <label>
              {t("appointments:drawer.records.form.additional")}
              <textarea
                name="additionalMetrics"
                placeholder={t("appointments:drawer.records.form.additionalPlaceholder")}
                value={uploadInfo.additionalMetrics}
                onChange={(event) =>
                  setUploadInfo((prev) => ({ ...prev, additionalMetrics: event.target.value }))
                }
              />
            </label>

            <label className="file-input">
              <span>{t("appointments:drawer.records.form.files")}</span>
              <input type="file" name="files" accept="image/*,application/pdf" multiple />
            </label>

            <button className="button" type="submit" disabled={uploadPending}>
              {uploadPending
                ? t("appointments:drawer.records.form.submitting")
                : t("appointments:drawer.records.form.submit")}
            </button>
          </form>

          {appointmentDetail.records.length === 0 ? (
            <p className="muted">{t("appointments:drawer.records.empty")}</p>
          ) : (
            <div className="record-grid">
              {appointmentDetail.records.map((record) => (
                <article key={record.id} className="record-card">
                  <header>
                    <span className="tag">{record.title || t("common:status.noData")}</span>
                    <button
                      className="button text"
                      onClick={() => {
                        if (record.downloadUrl) {
                          window.open(record.downloadUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                      disabled={!record.downloadUrl}
                    >
                      {t("common:actions.view")}
                    </button>
                  </header>
                  <div className="record-body">
                    <p className="muted">
                      {record.recordedAt
                        ? format(new Date(record.recordedAt), "dd MMM yyyy", { locale })
                        : t("appointments:drawer.records.pendingDate")}
                    </p>
                    <div className="record-metrics">
                      {record.weightKg != null && (
                        <span>
                          <strong>{t("appointments:drawer.records.form.metrics.weight")}:</strong>{" "}
                          {record.weightKg.toFixed(2)} kg
                        </span>
                      )}
                      {record.temperatureC != null && (
                        <span>
                          <strong>
                            {t("appointments:drawer.records.form.metrics.temperature")}:
                          </strong>{" "}
                          {record.temperatureC.toFixed(1)} °C
                        </span>
                      )}
                      {record.heartRate != null && (
                        <span>
                          <strong>
                            {t("appointments:drawer.records.form.metrics.heartRate")}:
                          </strong>{" "}
                          {record.heartRate} bpm
                        </span>
                      )}
                      {record.respirationRate != null && (
                        <span>
                          <strong>
                            {t("appointments:drawer.records.form.metrics.respiration")}:
                          </strong>{" "}
                          {record.respirationRate} bpm
                        </span>
                      )}
                    </div>
                    {record.notes && <p>{record.notes}</p>}
                    {record.additionalMetrics && (
                      <p className="muted">{record.additionalMetrics}</p>
                    )}
                    {record.downloadUrl ? (
                      <p className="muted file-meta">
                        {record.documentContentType || t("common:status.noData")} ·{" "}
                        {record.documentSize
                          ? humanFileSize(record.documentSize)
                          : t("appointments:drawer.records.unknownSize")}
                      </p>
                    ) : (
                      <p className="muted file-meta">
                        {t("appointments:drawer.records.noAttachment")}
                      </p>
                    )}
                  </div>
                  <footer>
                    <button
                      className="button danger ghost"
                      onClick={async () => {
                        try {
                          await onRecordDelete(appointmentDetail.id, record.id);
                          setUploadMessage({
                            type: "success",
                            message: t("appointments:drawer.records.messages.deleted"),
                          });
                        } catch (error) {
                          setUploadMessage({
                            type: "error",
                            message:
                              error instanceof Error
                                ? error.message
                                : t("common:errors.generic"),
                          });
                        }
                      }}
                      disabled={deleteRecordPending}
                    >
                      {t("common:actions.delete")}
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
        <PrescriptionModal
          open={showPrescription}
          appointment={appointmentDetail}
          onClose={() => setShowPrescription(false)}
        />
      </aside>
    </>
  );
}

function humanFileSize(size: number) {
  if (!size) return "0 B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const value = size / Math.pow(1024, i);
  return `${value.toFixed(1)} ${["B", "KB", "MB", "GB", "TB"][i]}`;
}
