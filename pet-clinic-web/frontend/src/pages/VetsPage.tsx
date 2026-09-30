import { useMemo, useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { vetsApi } from "../api/client";
import { Loader } from "../components/Loader";
import { EmptyState, ErrorBanner, SuccessBanner } from "../components/Feedback";
import { useAuth } from "../hooks/useAuth";
import type { VetDto, VetRequest } from "../api/types";
import "./VetsPage.css";

interface VetFormState {
  firstName: string;
  lastName: string;
  email: string;
  specialtyIds: number[];
}

const defaultFormState: VetFormState = {
  firstName: "",
  lastName: "",
  email: "",
  specialtyIds: [],
};

export function VetsPage() {
  const { t } = useTranslation(["vets", "common"]);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const vetsQuery = useQuery({
    queryKey: ["vets"],
    queryFn: vetsApi.list,
  });

  const specialtiesQuery = useQuery({
    queryKey: ["vet-specialties"],
    queryFn: vetsApi.specialties,
    enabled: isAdmin,
  });

  const [formState, setFormState] = useState<VetFormState>(defaultFormState);
  const [editingVet, setEditingVet] = useState<VetDto | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = window.setTimeout(() => setFeedback(null), 4000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [feedback]);

  const specialties = useMemo(
    () => specialtiesQuery.data ?? [],
    [specialtiesQuery.data],
  );
  const vets = vetsQuery.data ?? [];

  const resetForm = () => {
    setEditingVet(null);
    setFormState(defaultFormState);
  };

  const upsertMutation = useMutation({
    mutationFn: async (payload: { vetId?: number; data: VetRequest }) => {
      if (payload.vetId) {
        return vetsApi.update(payload.vetId, payload.data);
      }
      return vetsApi.create(payload.data);
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: editingVet ? t("vets:feedback.updated") : t("vets:feedback.created") });
      queryClient.invalidateQueries({ queryKey: ["vets"] });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("common:errors.generic");
      setFeedback({ type: "error", message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (vetId: number) => vetsApi.remove(vetId),
    onSuccess: () => {
      setFeedback({ type: "success", message: t("vets:feedback.deleted") });
      queryClient.invalidateQueries({ queryKey: ["vets"] });
      if (editingVet) {
        resetForm();
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("common:errors.generic");
      setFeedback({ type: "error", message });
    },
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSpecialtyToggle = (specialtyId: number) => {
    setFormState((prev) => {
      const exists = prev.specialtyIds.includes(specialtyId);
      return {
        ...prev,
        specialtyIds: exists
          ? prev.specialtyIds.filter((id) => id !== specialtyId)
          : [...prev.specialtyIds, specialtyId],
      };
    });
  };

  const handleEdit = (vet: VetDto) => {
    setEditingVet(vet);
    setFormState({
      firstName: vet.firstName,
      lastName: vet.lastName,
      email: vet.email,
      specialtyIds: vet.specialtyIds,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: VetRequest = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      email: formState.email.trim(),
      specialtyIds: formState.specialtyIds,
    };
    upsertMutation.mutate({ vetId: editingVet?.id, data: payload });
  };

  const isBusy = upsertMutation.isPending || deleteMutation.isPending;

  return (
    <div className="page vets-page">
      <div className="page-header">
        <div>
          <h1>{t("vets:title")}</h1>
          <p className="muted">{t("vets:subtitle")}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="card vet-admin-card">
          <h2 className="section-heading">{editingVet ? t("vets:form.editTitle") : t("vets:form.addTitle")}</h2>
          {feedback && feedback.type === "success" && <SuccessBanner message={feedback.message} />}
          {feedback && feedback.type === "error" && <ErrorBanner message={feedback.message} />}
          <form className="vet-form" onSubmit={handleSubmit} autoComplete="off">
            <div className="grid three">
              <label>
                {t("vets:form.firstName")}
                <input
                  name="firstName"
                  value={formState.firstName}
                  onChange={handleChange}
                  required
                  disabled={isBusy}
                />
              </label>
              <label>
                {t("vets:form.lastName")}
                <input
                  name="lastName"
                  value={formState.lastName}
                  onChange={handleChange}
                  required
                  disabled={isBusy}
                />
              </label>
              <label>
                {t("vets:form.email")}
                <input
                  type="email"
                  name="email"
                  autoComplete="off"
                  value={formState.email}
                  onChange={handleChange}
                  required
                  disabled={isBusy}
                />
              </label>
            </div>
            <fieldset className="vet-specialty-field" disabled={isBusy || specialtiesQuery.isLoading}>
              <legend>{t("vets:form.specialties")}</legend>
              {specialtiesQuery.isLoading ? (
                <p className="muted">{t("vets:form.loadingSpecialties")}</p>
              ) : specialties.length === 0 ? (
                <p className="muted">{t("vets:form.emptySpecialties")}</p>
              ) : (
                <div className="vet-specialty-grid">
                  {specialties.map((specialty) => (
                    <label key={specialty.id} className="vet-specialty-option">
                      <input
                        type="checkbox"
                        checked={formState.specialtyIds.includes(specialty.id)}
                        onChange={() => handleSpecialtyToggle(specialty.id)}
                      />
                      <span>{specialty.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="vet-form-actions">
              <button className="button" type="submit" disabled={isBusy}>
                {upsertMutation.isPending
                  ? t("vets:form.saving")
                  : editingVet
                    ? t("vets:form.update")
                    : t("vets:form.create")}
              </button>
              {editingVet && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={resetForm}
                  disabled={isBusy}
                >
                  {t("common:actions.cancel")}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {vetsQuery.isLoading ? (
          <Loader />
        ) : vetsQuery.isError ? (
          <ErrorBanner message={t("vets:errors.load") ?? t("common:errors.generic") } />
        ) : vets.length === 0 ? (
          <EmptyState
            icon="👩‍⚕️"
            title={t("vets:empty.title")}
            message={t("vets:empty.message")}
          />
        ) : (
          <div className="vets-grid">
            {vets.map((vet) => (
              <div key={vet.id} className="vet-card">
                <div className="vet-avatar">🐾</div>
                <div className="vet-details">
                  <strong>{vet.displayName}</strong>
                  <span className="vet-email">{vet.email}</span>
                  <div className="vet-specialties">
                    {vet.specialties.length === 0 ? (
                      <span className="tag">{t("vets:labels.general")}</span>
                    ) : (
                      vet.specialties.map((specialty) => (
                        <span key={specialty} className="tag">
                          {specialty}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="vet-actions">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => handleEdit(vet)}
                      disabled={isBusy}
                    >
                      {t("vets:actions.edit")}
                    </button>
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => deleteMutation.mutate(vet.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? t("vets:actions.deleting") : t("vets:actions.delete")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
