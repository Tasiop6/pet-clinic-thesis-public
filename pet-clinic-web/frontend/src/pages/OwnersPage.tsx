import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ownersApi } from "../api/client";
import type { OwnerRequest } from "../api/types";
import { PET_GENDER_SYMBOLS } from "../utils/petGender";
import { Loader } from "../components/Loader";
import { EmptyState } from "../components/Feedback/EmptyState";
import { ErrorBanner } from "../components/Feedback/ErrorBanner";
import { SuccessBanner } from "../components/Feedback/SuccessBanner";
import { OwnerModal } from "../components/owners/OwnerModal";
import "./OwnersPage.css";
import "../components/owners/OwnerModal.css";

export function OwnersPage() {
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation(["owners", "ownerDetail"]);

  const ownersQuery = useQuery({
    queryKey: ["owners", filter.trim().toLowerCase()],
    queryFn: () => {
      const normalized = filter.trim();
      return ownersApi.list(normalized !== "" ? normalized : undefined);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: OwnerRequest) => ownersApi.create(payload),
    onSuccess: (owner) => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      setCreateOpen(false);
      navigate(`/owners/${owner.id}`);
    },
  });

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    ownersQuery.refetch();
  };

  const handleCreateSubmit = (data: OwnerRequest) => {
    createMutation.mutate(data);
  };

  return (
    <div className="page owners-page">
      <div className="page-header">
        <div>
          <h1>{t("owners:title")}</h1>
          <p className="muted">{t("owners:subtitle")}</p>
        </div>
        <button className="button" onClick={() => setCreateOpen(true)}>
          {t("owners:actions.openForm")}
        </button>
      </div>

      <div className="card">
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            placeholder={t("owners:search.placeholder")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="button secondary" type="submit">
            {t("owners:search.submit")}
          </button>
        </form>
      </div>

      <OwnerModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
        initialData={null}
        title={t("owners:form.title")}
      />

      {createMutation.isError && <ErrorBanner message={t("owners:form.error")} />}
      {createMutation.isSuccess && <SuccessBanner message={t("owners:form.success")} />}

      <div className="card">
        <h2 className="section-title">{t("owners:list.title")}</h2>
        {ownersQuery.isLoading ? (
          <Loader />
        ) : ownersQuery.isError ? (
          <ErrorBanner message={t("owners:list.error")} />
        ) : ownersQuery.data && ownersQuery.data.length > 0 ? (
          <div className="owners-grid">
            {ownersQuery.data.map((owner) => (
              <button
                key={owner.id}
                className="owner-card"
                onClick={() => navigate(`/owners/${owner.id}`)}
              >
                <div className="owner-initials">
                  {owner.firstName.charAt(0)}
                  {owner.lastName.charAt(0)}
                </div>
                <div className="owner-details">
                  <strong>
                    {owner.firstName} {owner.lastName}
                  </strong>
                  <span className="muted">{owner.city || t("owners:list.cityPending")}</span>
                  <div className="owner-pets">
                    {owner.pets.length === 0 ? (
                      <span className="tag">{t("owners:list.noPets")}</span>
                    ) : (
                      owner.pets.map((pet) => (
                        <span
                          key={pet.id}
                          className={`tag pet-tag${pet.gender ? ` ${pet.gender.toLowerCase()}` : ""}`}
                          aria-label={
                            pet.gender
                              ? `${pet.name} · ${pet.gender === "MALE"
                                ? t("owners:list.petGender.male")
                                : t("owners:list.petGender.female")
                              }`
                              : pet.name
                          }
                        >
                          {pet.gender ? `${PET_GENDER_SYMBOLS[pet.gender]} ${pet.name}` : pet.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🐶"
            title={t("owners:list.emptyTitle")}
            message={t("owners:list.emptyMessage")}
          />
        )}
      </div>
    </div>
  );
}
