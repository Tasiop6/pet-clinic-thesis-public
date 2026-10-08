import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { el, enGB } from "date-fns/locale";
import { ownersApi, petTypesApi } from "../api/client";
import { EmptyState } from "../components/Feedback/EmptyState";
import { ErrorBanner } from "../components/Feedback/ErrorBanner";
import { SuccessBanner } from "../components/Feedback/SuccessBanner";
import { Skeleton } from "../components/Feedback/Skeleton";
import { PetCard } from "../components/pets/PetCard";
import { OwnerModal } from "../components/owners/OwnerModal";
import { PetModal } from "../components/pets/PetModal";
import { VisitModal } from "../components/visits/VisitModal";
import { HealthRecordModal } from "../components/records/HealthRecordModal";

import "../components/owners/OwnerModal.css";

import type {
  OwnerRequest,
  PetDetail,
  PetHealthRecordCreateRequest,
  PetHealthRecordDto,
  PetHealthRecordType,

  PetRequest,
  VisitRequest,
} from "../api/types";
import "./OwnerDetailPage.css";
import { useAuth } from "../hooks/useAuth";



export function OwnerDetailPage() {
  const { ownerId } = useParams();
  const id = Number(ownerId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["ownerDetail", "common"]);
  const { isAdmin } = useAuth();
  const locale = useMemo(() => (i18n.language === "en" ? enGB : el), [i18n.language]);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const formatWithLocale = useMemo(
    () => (date: Date, pattern: string) => format(date, pattern, { locale }),
    [locale],
  );
  const [petFormOpen, setPetFormOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetDetail | null>(null);
  const [visitingPet, setVisitingPet] = useState<PetDetail | null>(null);
  const [previewRecord, setPreviewRecord] = useState<{
    petName: string;
    record: PetHealthRecordDto;
  } | null>(null);

  // Replaced recordPetId and updatingRecord with a single state object for the modal
  const [recordModal, setRecordModal] = useState<{
    petId: number;
    record?: PetHealthRecordDto;
    defaultType?: PetHealthRecordType;
  } | null>(null);

  const [recordFeedback, setRecordFeedback] = useState<
    { petId: number; type: "success" | "error"; message: string } | null
  >(null);
  const [ownerFeedback, setOwnerFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [deletingPetId, setDeletingPetId] = useState<number | null>(null);

  const HEALTH_RECORD_TYPES: PetHealthRecordType[] = [
    "VITALS",
    "XRAY",
    "BLOOD_WORK",
    "PRESCRIPTION",
    "EXAM_NOTE",
    "OTHER",
  ];


  const ownerQuery = useQuery({
    queryKey: ["owner", id],
    queryFn: () => ownersApi.get(id),
    enabled: Number.isFinite(id),
  });

  const ownerData = ownerQuery.data;

  const petTypesQuery = useQuery({
    queryKey: ["pet-types"],
    queryFn: petTypesApi.list,
  });





  const updateOwnerMutation = useMutation({
    mutationFn: (payload: OwnerRequest) => ownersApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["owner", id], updated);
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "owners",
      });
      setIsEditingOwner(false);
      setOwnerFeedback({ type: "success", message: t("ownerDetail:ownerForm.success") });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : t("ownerDetail:ownerForm.error");
      setOwnerFeedback({ type: "error", message });
    },
  });

  const createPetMutation = useMutation({
    mutationFn: (payload: PetRequest) => ownersApi.createPet(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", id] });
      setPetFormOpen(false);
    },
  });

  const updatePetMutation = useMutation({
    mutationFn: ({ petId, payload }: { petId: number; payload: PetRequest }) =>
      ownersApi.updatePet(id, petId, payload),
  });

  const visitMutation = useMutation({
    mutationFn: ({ petId, payload }: { petId: number; payload: VisitRequest }) =>
      ownersApi.addVisit(id, petId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", id] });
      setVisitingPet(null);
    },
  });

  const createRecordMutation = useMutation({
    mutationFn: ({ petId, payload }: { petId: number; payload: PetHealthRecordCreateRequest }) =>
      ownersApi.addHealthRecord(id, petId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["owner", id] });
      setRecordFeedback({
        petId: variables.petId,
        type: "success",
        message: t("ownerDetail:records.feedback.success"),
      });
    },
    onError: (error: unknown, variables) => {
      const message =
        error instanceof Error ? error.message : t("ownerDetail:records.feedback.error");
      setRecordFeedback({ petId: variables.petId, type: "error", message });
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({
      petId,
      recordId,
      payload,
    }: {
      petId: number;
      recordId: number;
      payload: PetHealthRecordCreateRequest;
    }) => ownersApi.updateHealthRecord(id, petId, recordId, payload),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: ({ petId, recordId }: { petId: number; recordId: number }) =>
      ownersApi.deleteHealthRecord(id, petId, recordId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["owner", id] });
      setRecordFeedback({
        petId: variables.petId,
        type: "success",
        message: t("ownerDetail:records.feedback.removed"),
      });
    },
    onError: (error: unknown, variables) => {
      const message =
        error instanceof Error ? error.message : t("ownerDetail:records.feedback.deleteError");
      setRecordFeedback({ petId: variables.petId, type: "error", message });
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: (petId: number) => ownersApi.deletePet(id, petId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", id] });
      queryClient.invalidateQueries({ predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "owners" });
      setOwnerFeedback({ type: "success", message: t("ownerDetail:actions.petDeleted") });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("common:errors.generic");
      setOwnerFeedback({ type: "error", message });
    },
    onSettled: () => setDeletingPetId(null),
  });

  const deleteOwnerMutation = useMutation({
    mutationFn: () => ownersApi.deleteOwner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "owners" });
      navigate("/owners", { replace: true });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("common:errors.generic");
      setOwnerFeedback({ type: "error", message });
    },
  });

  const petTypes = useMemo(() => petTypesQuery.data ?? [], [petTypesQuery.data]);

  useEffect(() => {
    if (recordFeedback) {
      const timer = window.setTimeout(() => setRecordFeedback(null), 4000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [recordFeedback]);

  useEffect(() => {
    if (ownerFeedback) {
      const timer = window.setTimeout(() => setOwnerFeedback(null), 4000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [ownerFeedback]);

  if (ownerQuery.isLoading) {
    return (
      <div className="page owner-detail-page">
        <header className="page-header">
          <Skeleton width={250} height={32} />
          <div className="header-meta">
            <Skeleton width={150} height={20} />
            <Skeleton width={150} height={20} />
          </div>
        </header>
        <div className="owner-content">
          <div className="pets-section">
            <div className="pets-grid">
              <div className="pet-card">
                <div style={{ display: "flex", gap: "1rem" }}>
                  <Skeleton width={60} height={60} variant="circle" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width={120} height={24} style={{ marginBottom: "0.5rem" }} />
                    <Skeleton width={80} height={20} />
                  </div>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <Skeleton width="100%" height={100} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (ownerQuery.isError || !ownerData) {
    return (
      <div className="page">
        <ErrorBanner message={t("common:errors.notFound")} />
      </div>
    );
  }

  const owner = ownerData;
  const pendingLabel = t("ownerDetail:ownerForm.pending");



  const handleOwnerUpdate = (data: OwnerRequest) => {
    updateOwnerMutation.mutate(data);
  };

  const handlePetCreate = (data: PetRequest) => {
    createPetMutation.mutate(data);
  };

  const handlePetUpdate = async (petId: number, payload: PetRequest) => {
    try {
      await updatePetMutation.mutateAsync({ petId, payload });
      setEditingPet(null);
      queryClient.invalidateQueries({ queryKey: ["owner", id] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "owners",
      });
      setOwnerFeedback({ type: "success", message: t("ownerDetail:petForm.updateSuccess") });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("ownerDetail:petForm.updateError");
      setOwnerFeedback({ type: "error", message });
      throw error;
    }
  };

  const handleVisitCreate = (data: VisitRequest) => {
    if (visitingPet) {
      visitMutation.mutate({ petId: visitingPet.id, payload: data });
    }
  };

  const handleRecordCreate = async (
    payload: PetHealthRecordCreateRequest,
  ) => {
    if (recordModal) {
      await createRecordMutation.mutateAsync({ petId: recordModal.petId, payload });
      setRecordModal(null);
    }
  };

  const handleRecordUpdate = async (
    payload: PetHealthRecordCreateRequest,
  ) => {
    if (recordModal && recordModal.record) {
      try {
        await updateRecordMutation.mutateAsync({
          petId: recordModal.petId,
          recordId: recordModal.record.id,
          payload
        });
        queryClient.invalidateQueries({ queryKey: ["owner", id] });
        setRecordFeedback({
          petId: recordModal.petId,
          type: "success",
          message: t("ownerDetail:records.feedback.updated"),
        });
        setRecordModal(null);
      } catch {
        // Error handling is done in mutation onError usually, but we set feedback here
      }
    }
  };

  const handleOwnerDelete = () => {
    if (!isAdmin) {
      return;
    }
    const confirmed = window.confirm(
      t("ownerDetail:actions.confirmDeleteOwner", {
        name: `${owner.firstName} ${owner.lastName}`.trim(),
      }),
    );
    if (!confirmed) {
      return;
    }
    deleteOwnerMutation.mutate();
  };

  const handlePetDelete = (pet: PetDetail) => {
    if (!isAdmin) {
      return;
    }
    const confirmed = window.confirm(
      t("ownerDetail:actions.confirmDeletePet", { name: pet.name ?? "" }),
    );
    if (!confirmed) {
      return;
    }
    setDeletingPetId(pet.id ?? null);
    deletePetMutation.mutate(pet.id);
  };

  return (
    <div className="page owner-detail">
      {ownerFeedback &&
        (ownerFeedback.type === "success" ? (
          <SuccessBanner message={ownerFeedback.message} />
        ) : (
          <ErrorBanner message={ownerFeedback.message} />
        ))}
      <div className="page-header">
        <div>
          <h1>
            {owner.firstName} {owner.lastName}
          </h1>
          <p className="muted">
            {owner.address ? `${owner.address}, ` : ""}
            {owner.city || t("ownerDetail:header.cityPending")}
          </p>
        </div>
        <div className="owner-contact">
          {owner.email && <span className="tag">📧 {owner.email}</span>}
          {owner.telephone && <span className="tag">📞 {owner.telephone}</span>}
        </div>
        {isAdmin && (
          <div className="owner-admin-actions">
            <button
              className="button danger"
              type="button"
              onClick={handleOwnerDelete}
              disabled={deleteOwnerMutation.isPending}
            >
              {deleteOwnerMutation.isPending
                ? t("ownerDetail:actions.deletingOwner")
                : t("ownerDetail:actions.deleteOwner")}
            </button>
          </div>
        )}
      </div>

      <section className="card owner-info-card">
        <div className="section-heading">
          <div>
            <h2 className="section-title">{t("ownerDetail:ownerForm.title")}</h2>
            <p className="muted">{t("ownerDetail:ownerForm.subtitle")}</p>
          </div>
          <button className="button secondary" type="button" onClick={() => setIsEditingOwner(true)}>
            {t("ownerDetail:ownerForm.edit")}
          </button>
        </div>

        <dl className="owner-info-grid">
          <div>
            <dt>{t("ownerDetail:ownerForm.fields.firstName")}</dt>
            <dd>{owner.firstName}</dd>
          </div>
          <div>
            <dt>{t("ownerDetail:ownerForm.fields.lastName")}</dt>
            <dd>{owner.lastName}</dd>
          </div>
          <div>
            <dt>{t("ownerDetail:ownerForm.fields.address")}</dt>
            <dd>{owner.address?.trim() ? owner.address : pendingLabel}</dd>
          </div>
          <div>
            <dt>{t("ownerDetail:ownerForm.fields.city")}</dt>
            <dd>{owner.city?.trim() ? owner.city : pendingLabel}</dd>
          </div>
          <div>
            <dt>{t("ownerDetail:ownerForm.fields.telephone")}</dt>
            <dd>{owner.telephone?.trim() ? owner.telephone : pendingLabel}</dd>
          </div>
          <div>
            <dt>{t("ownerDetail:ownerForm.fields.email")}</dt>
            <dd>{owner.email?.trim() ? owner.email : pendingLabel}</dd>
          </div>
        </dl>
      </section>

      <OwnerModal
        isOpen={isEditingOwner}
        onClose={() => setIsEditingOwner(false)}
        onSubmit={handleOwnerUpdate}
        isPending={updateOwnerMutation.isPending}
        initialData={owner}
      />

      <section className="card">
        <div className="section-heading">
          <h2 className="section-title">{t("ownerDetail:petSection.title")}</h2>
          <button className="button" onClick={() => setPetFormOpen(true)}>
            {t("ownerDetail:petSection.add")}
          </button>
        </div>

        <PetModal
          isOpen={petFormOpen}
          onClose={() => setPetFormOpen(false)}
          onSubmit={handlePetCreate}
          isPending={createPetMutation.isPending}
          petTypes={petTypes}
          initialData={null}
        />

        <PetModal
          isOpen={!!editingPet}
          onClose={() => setEditingPet(null)}
          onSubmit={(data) => {
            if (editingPet) handlePetUpdate(editingPet.id, data);
          }}
          isPending={updatePetMutation.isPending}
          petTypes={petTypes}
          initialData={editingPet}
        />

        <VisitModal
          isOpen={!!visitingPet}
          onClose={() => setVisitingPet(null)}
          onSubmit={handleVisitCreate}
          isPending={visitMutation.isPending}
          petName={visitingPet?.name}
        />

        <HealthRecordModal
          isOpen={!!recordModal}
          onClose={() => setRecordModal(null)}
          onSubmit={recordModal?.record ? handleRecordUpdate : handleRecordCreate}
          initialData={recordModal?.record}
          isPending={createRecordMutation.isPending || updateRecordMutation.isPending}
          healthRecordTypes={HEALTH_RECORD_TYPES}
          defaultType={recordModal?.defaultType}
        />

        {owner.pets.length === 0 ? (
          <EmptyState
            icon="🐕"
            title={t("ownerDetail:petSection.emptyTitle")}
            message={t("ownerDetail:petSection.emptyMessage")}
          />
        ) : (
          <div className="pet-grid">
            {owner.pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onVisit={() => setVisitingPet(pet)}
                onPreviewRecord={(record) =>
                  setPreviewRecord({ petName: pet.name, record })
                }

                // New props for record management
                onAddRecord={(type) => setRecordModal({ petId: pet.id, defaultType: type })}
                onEditRecord={(record, type) => setRecordModal({ petId: pet.id, record, defaultType: type })}

                onEdit={() => setEditingPet(pet)}

                onDeleteRecord={async (recordId) => {
                  await deleteRecordMutation.mutateAsync({ petId: pet.id, recordId });
                }}

                deleteRecordPending={deleteRecordMutation.isPending}
                recordFeedback={recordFeedback?.petId === pet.id ? recordFeedback : null}
                healthRecordTypes={HEALTH_RECORD_TYPES}
                formatWithLocale={formatWithLocale}
                isAdmin={isAdmin}
                onDeletePet={() => handlePetDelete(pet)}
                deletePetPending={deletePetMutation.isPending && deletingPetId === pet.id}
              />
            ))}
          </div>
        )}
      </section>

      <RecordPreviewModal preview={previewRecord} onClose={() => setPreviewRecord(null)} />
    </div>
  );
}

interface PreviewProps {
  preview: { petName: string; record: PetHealthRecordDto } | null;
  onClose: () => void;
}

function RecordPreviewModal({ preview, onClose }: PreviewProps) {
  const { t, i18n } = useTranslation("ownerDetail");
  const locale = useMemo(() => (i18n.language === "en" ? enGB : el), [i18n.language]);

  if (!preview) {
    return null;
  }
  const { record, petName } = preview;
  const isImage = record.documentContentType?.startsWith("image/");
  const hasAttachment = Boolean(record.downloadUrl);

  return (
    <div className="record-preview-backdrop" role="dialog" aria-modal="true">
      <div className="record-preview-dialog">
        <header>
          <div>
            <h3>{record.title || t("ownerDetail:preview.titleFallback")}</h3>
            <p className="muted">
              {petName} ·{" "}
              {record.recordedAt
                ? format(new Date(record.recordedAt), "dd MMM yyyy", { locale })
                : t("appointments:drawer.records.pendingDate")}
            </p>
          </div>
          <button className="button secondary" onClick={onClose}>
            {t("ownerDetail:preview.close")}
          </button>
        </header>
        <div className="record-preview-details">
          <div className="record-metrics">
            {record.weightKg != null && (
              <span>{t("ownerDetail:records.form.metrics.weight")}: {record.weightKg.toFixed(2)} kg</span>
            )}
            {record.temperatureC != null && (
              <span>{t("ownerDetail:records.form.metrics.temperature")}: {record.temperatureC.toFixed(1)} °C</span>
            )}
            {record.heartRate != null && (
              <span>{t("ownerDetail:records.form.metrics.heartRate")}: {record.heartRate} bpm</span>
            )}
            {record.respirationRate != null && (
              <span>{t("ownerDetail:records.form.metrics.respiration")}: {record.respirationRate} bpm</span>
            )}
          </div>
          {record.notes && <p>{record.notes}</p>}
          {record.additionalMetrics && <p className="muted">{record.additionalMetrics}</p>}
        </div>
        <div className="preview-body">
          {hasAttachment ? (
            isImage ? (
              <img src={record.downloadUrl ?? "#"} alt={record.title ?? t("ownerDetail:preview.titleFallback")} />
            ) : (
              <iframe
                src={record.downloadUrl ?? "#"}
                title={record.title ?? t("ownerDetail:preview.titleFallback")}
                loading="lazy"
              />
            )
          ) : (
            <p className="muted">{t("ownerDetail:preview.noAttachment")}</p>
          )}
        </div>
        {hasAttachment && (
          <footer>
            <a
              className="button"
              href={record.downloadUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("ownerDetail:preview.openExternal")}
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}
