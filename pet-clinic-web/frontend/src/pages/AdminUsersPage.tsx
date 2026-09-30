import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, vetsApi } from "../api/client";
import { ErrorBanner, EmptyState, SuccessBanner } from "../components/Feedback";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import type { AdminUserSummary, UserRole, VetDto } from "../api/types";
import "./AdminUsersPage.css";

export function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["admin", "pending-users"],
    queryFn: adminUsersApi.pending,
  });

  const activeQuery = useQuery({
    queryKey: ["admin", "active-users"],
    queryFn: adminUsersApi.active,
  });

  const blacklistedQuery = useQuery({
    queryKey: ["admin", "blacklisted-users"],
    queryFn: adminUsersApi.blacklisted,
  });

  const vetsQuery = useQuery({
    queryKey: ["vets"],
    queryFn: vetsApi.list,
  });

  const vets = useMemo<VetDto[]>(() => vetsQuery.data ?? [], [vetsQuery.data]);

  const normalizeRoles = useCallback((roles: UserRole[]): UserRole[] => {
    const unique = Array.from(new Set(roles));
    if (unique.includes("SUPERADMIN") && !unique.includes("CLINIC_OWNER")) {
      unique.push("CLINIC_OWNER");
    }
    if (!unique.includes("STAFF")) {
      unique.push("STAFF");
    }
    return unique;
  }, []);

  const [roleEdits, setRoleEdits] = useState<Record<number, { roles: UserRole[]; vetId: number | null }>>({});

  const managedUsers = useMemo<AdminUserSummary[]>(() => {
    const map = new Map<number, AdminUserSummary>();
    (pendingQuery.data ?? []).forEach((user) => map.set(user.id, user));
    (activeQuery.data ?? []).forEach((user) => map.set(user.id, user));
    return Array.from(map.values());
  }, [pendingQuery.data, activeQuery.data]);

  useEffect(() => {
    setRoleEdits((prev) => {
      const next: Record<number, { roles: UserRole[]; vetId: number | null }> = {};
      managedUsers.forEach((user) => {
        const existing = prev[user.id];
        next[user.id] = {
          roles: normalizeRoles(existing?.roles ?? user.roles),
          vetId: existing?.vetId ?? user.vetId ?? null,
        };
      });
      return next;
    });
  }, [managedUsers, normalizeRoles]);

  const rolesLoading = pendingQuery.isLoading || activeQuery.isLoading || vetsQuery.isLoading;
  const rolesError = pendingQuery.isError || activeQuery.isError || vetsQuery.isError;

  const invalidateUserLists = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "pending-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "active-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "blacklisted-users"] });
  };

  const approveMutation = useMutation({
    mutationFn: adminUsersApi.approve,
    onSuccess: (user) => {
      setFeedback({ type: "success", message: t("actions.approved", { user: user.username }) });
      invalidateUserLists();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("actions.error");
      setFeedback({ type: "error", message });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: adminUsersApi.deactivate,
    onSuccess: (user) => {
      setFeedback({ type: "success", message: t("actions.deactivated", { user: user.username }) });
      invalidateUserLists();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("actions.error");
      setFeedback({ type: "error", message });
    },
  });

  const blacklistMutation = useMutation({
    mutationFn: adminUsersApi.blacklist,
    onSuccess: (user) => {
      setFeedback({ type: "success", message: t("actions.blacklisted", { user: user.username }) });
      invalidateUserLists();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("actions.error");
      setFeedback({ type: "error", message });
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: adminUsersApi.reinstate,
    onSuccess: (user) => {
      setFeedback({ type: "success", message: t("actions.reinstated", { user: user.username }) });
      invalidateUserLists();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("actions.error");
      setFeedback({ type: "error", message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminUsersApi.remove,
    onSuccess: () => {
      setFeedback({ type: "success", message: t("actions.deleted") });
      invalidateUserLists();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("actions.error");
      setFeedback({ type: "error", message });
    },
  });

  const handleDelete = useCallback(
    (user: AdminUserSummary) => {
      const confirmed = window.confirm(t("actions.deleteConfirm", { user: user.username }));
      if (confirmed) {
        deleteMutation.mutate(user.id);
      }
    },
    [deleteMutation, t],
  );

  const roleMutation = useMutation<
    AdminUserSummary,
    unknown,
    { userId: number; roles: UserRole[]; vetId: number | null }
  >({
    mutationFn: ({ userId, roles, vetId }) =>
      adminUsersApi.updateRoles(userId, { roles, vetId }),
    onSuccess: (user) => {
      setFeedback({ type: "success", message: t("sections.roles.updated", { user: user.username }) });
      setRoleEdits((prev) => ({
        ...prev,
        [user.id]: {
          roles: normalizeRoles(user.roles),
          vetId: user.vetId ?? null,
        },
      }));
      invalidateUserLists();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : t("sections.roles.error") ?? t("actions.error");
      setFeedback({ type: "error", message });
    },
  });

  const pendingUsers = useMemo<AdminUserSummary[]>(() => pendingQuery.data ?? [], [pendingQuery.data]);
  const activeUsers = useMemo<AdminUserSummary[]>(() => activeQuery.data ?? [], [activeQuery.data]);
  const blacklistedUsers = useMemo<AdminUserSummary[]>(() => blacklistedQuery.data ?? [], [blacklistedQuery.data]);

  const savingUserId = roleMutation.isPending ? roleMutation.variables?.userId ?? null : null;

  const handleRoleToggle = useCallback(
    (userId: number, role: UserRole, checked: boolean) => {
      setRoleEdits((prev) => {
        const current = prev[userId] ?? { roles: ["STAFF"], vetId: null };
        const updated = new Set<UserRole>(current.roles);
        if (checked) {
          updated.add(role);
        } else {
          updated.delete(role);
        }
        const roles = normalizeRoles(Array.from(updated));
        const includesVet = roles.includes("VET");
        return {
          ...prev,
          [userId]: {
            roles,
            vetId: includesVet ? current.vetId : null,
          },
        };
      });
    },
    [normalizeRoles],
  );

  const handleVetChange = useCallback(
    (userId: number, value: string) => {
      const vetId = value ? Number(value) : null;
      setRoleEdits((prev) => {
        const current = prev[userId] ?? { roles: ["STAFF"], vetId: null };
        return {
          ...prev,
          [userId]: {
            roles: normalizeRoles(current.roles),
            vetId,
          },
        };
      });
    },
    [normalizeRoles],
  );

  const handleSaveRoles = useCallback(
    (userId: number) => {
      const current = roleEdits[userId];
      if (!current) {
        return;
      }
      const roles = normalizeRoles(current.roles);
      const includesVet = roles.includes("VET");
      const vetId = includesVet ? current.vetId : null;
      if (includesVet && !vetId) {
        setFeedback({ type: "error", message: t("sections.roles.vetRequired") });
        return;
      }
      roleMutation.mutate({ userId, roles, vetId });
    },
    [roleEdits, normalizeRoles, roleMutation, t],
  );

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p className="muted">{t("subtitle")}</p>
        </div>
      </header>

      {feedback &&
        (feedback.type === "success" ? (
          <SuccessBanner message={feedback.message} />
        ) : (
          <ErrorBanner message={feedback.message} />
        ))}

      <section className="card">
        <header className="card-header">
          <div>
            <h2>{t("sections.roles.title")}</h2>
            <p className="muted">{t("sections.roles.subtitle")}</p>
          </div>
        </header>
        {rolesLoading ? (
          <p>{t("sections.roles.loading")}</p>
        ) : rolesError ? (
          <ErrorBanner message={t("sections.roles.loadError") ?? t("loadError")} />
        ) : managedUsers.length === 0 ? (
          <EmptyState
            icon="🧑‍⚕️"
            title={t("sections.roles.empty.title") ?? ""}
            message={t("sections.roles.empty.message") ?? ""}
          />
        ) : (
          <div className="admin-user-grid">
            {managedUsers.map((user) => {
              const edit = roleEdits[user.id];
              const currentRoles = normalizeRoles(edit?.roles ?? user.roles);
              const vetId = edit?.vetId ?? user.vetId ?? null;
              const isSuperAdmin = currentRoles.includes("SUPERADMIN");
              const includesVet = currentRoles.includes("VET");
              const vetMissing = includesVet && !vetId;
              const saving = savingUserId === user.id;
              const fallbackVet =
                vetId && !vets.some((vet) => vet.id === vetId)
                  ? ({
                      id: vetId,
                      firstName: "",
                      lastName: "",
                      email: "",
                      specialties: [],
                      specialtyIds: [],
                      displayName: user.vetName ?? t("sections.roles.vetUnset"),
                    } satisfies VetDto)
                  : null;
              const vetOptions = fallbackVet ? [...vets, fallbackVet] : vets;
              return (
                <article key={user.id} className="admin-user-card">
                  <header>
                    <h2>{user.displayName || user.username}</h2>
                    <span className="muted">@{user.username}</span>
                  </header>
                  <div className="role-controls">
                    <div className="role-options">
                      <div className="role-option">
                        <input
                          id={`role-superadmin-${user.id}`}
                          type="checkbox"
                          checked={isSuperAdmin}
                          onChange={(event) =>
                            handleRoleToggle(user.id, "SUPERADMIN", event.target.checked)
                          }
                        />
                        <label htmlFor={`role-superadmin-${user.id}`}>
                          {t("sections.roles.labels.superadmin")}
                        </label>
                      </div>
                      <div className="role-option">
                        <input
                          id={`role-owner-${user.id}`}
                          type="checkbox"
                          checked={currentRoles.includes("CLINIC_OWNER")}
                          onChange={(event) =>
                            handleRoleToggle(user.id, "CLINIC_OWNER", event.target.checked)
                          }
                        />
                        <label htmlFor={`role-owner-${user.id}`}>
                          {t("sections.roles.labels.owner")}
                        </label>
                      </div>
                      <div className="role-option">
                        <input
                          id={`role-vet-${user.id}`}
                          type="checkbox"
                          checked={includesVet}
                          onChange={(event) =>
                            handleRoleToggle(user.id, "VET", event.target.checked)
                          }
                        />
                        <label htmlFor={`role-vet-${user.id}`}>
                          {t("sections.roles.labels.vet")}
                        </label>
                      </div>
                      <p className="role-note">{t("sections.roles.notes.superadmin")}</p>
                      <p className="role-note">{t("sections.roles.notes.staff")}</p>
                    </div>
                    <label className="role-vet-select">
                      <span>{t("sections.roles.labels.assignment")}</span>
                      <select
                        value={vetId ?? ""}
                        disabled={!includesVet}
                        onChange={(event) => handleVetChange(user.id, event.target.value)}
                      >
                        <option value="">{t("sections.roles.vetUnset")}</option>
                        {vetOptions.map((vet) => (
                          <option key={vet.id} value={vet.id}>
                            {vet.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    {vetMissing && <p className="role-error">{t("sections.roles.vetRequired")}</p>}
                  </div>
                  <footer>
                    <button
                      className="button"
                      type="button"
                      disabled={saving || vetMissing}
                      onClick={() => handleSaveRoles(user.id)}
                    >
                      {saving ? t("sections.roles.saving") : t("sections.roles.save")}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <header className="card-header">
          <div>
            <h2>{t("sections.pending.title")}</h2>
            <p className="muted">{t("sections.pending.subtitle")}</p>
          </div>
        </header>
        {pendingQuery.isLoading ? (
          <p>{t("loading")}</p>
        ) : pendingQuery.isError ? (
          <ErrorBanner message={t("loadError")} />
        ) : pendingUsers.length === 0 ? (
          <EmptyState icon="✅" title={t("empty.title") ?? ""} message={t("empty.message") ?? ""} />
        ) : (
          <div className="admin-user-grid">
            {pendingUsers.map((user) => (
              <article key={user.id} className="admin-user-card">
                <header>
                  <h2>{user.displayName || user.username}</h2>
                  <span className="muted">@{user.username}</span>
                </header>
                <dl>
                  <div>
                    <dt>{t("fields.email")}</dt>
                    <dd>{user.email || t("fields.emailMissing")}</dd>
                  </div>
                  <div>
                    <dt>{t("fields.status")}</dt>
                    <dd>{user.active ? t("fields.active") : t("fields.pending")}</dd>
                  </div>
                </dl>
                <footer>
                  <button
                    className="button"
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(user.id)}
                  >
                    {approveMutation.isPending ? t("actions.approving") : t("actions.approve")}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={deactivateMutation.isPending}
                    onClick={() => deactivateMutation.mutate(user.id)}
                  >
                    {deactivateMutation.isPending ? t("actions.deactivating") : t("actions.deactivate")}
                  </button>
                  <button
                    className="button danger"
                    type="button"
                    disabled={blacklistMutation.isPending}
                    onClick={() => blacklistMutation.mutate(user.id)}
                  >
                    {blacklistMutation.isPending ? t("actions.blacklisting") : t("actions.blacklist")}
                  </button>
                  {!user.roles.includes("SUPERADMIN") && (
                    <button
                      className="button danger"
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(user)}
                    >
                      {deleteMutation.isPending ? t("actions.deleting") : t("actions.delete")}
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <header className="card-header">
          <div>
            <h2>{t("sections.active.title")}</h2>
            <p className="muted">{t("sections.active.subtitle")}</p>
          </div>
        </header>
        {activeQuery.isLoading ? (
          <p>{t("sections.active.loading")}</p>
        ) : activeQuery.isError ? (
          <ErrorBanner message={t("sections.active.loadError") ?? t("loadError")} />
        ) : activeUsers.length === 0 ? (
          <EmptyState
            icon="✅"
            title={t("sections.active.empty.title") ?? ""}
            message={t("sections.active.empty.message") ?? ""}
          />
        ) : (
          <div className="admin-user-grid">
            {activeUsers.map((user) => (
              <article key={user.id} className="admin-user-card">
                <header>
                  <h2>{user.displayName || user.username}</h2>
                  <span className="muted">@{user.username}</span>
                </header>
                <dl>
                  <div>
                    <dt>{t("fields.email")}</dt>
                    <dd>{user.email || t("fields.emailMissing")}</dd>
                  </div>
                  <div>
                    <dt>{t("fields.status")}</dt>
                    <dd>{t("fields.active")}</dd>
                  </div>
                </dl>
                <footer>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={deactivateMutation.isPending}
                    onClick={() => deactivateMutation.mutate(user.id)}
                  >
                    {deactivateMutation.isPending ? t("actions.deactivating") : t("actions.deactivate")}
                  </button>
                  <button
                    className="button danger"
                    type="button"
                    disabled={blacklistMutation.isPending}
                    onClick={() => blacklistMutation.mutate(user.id)}
                  >
                    {blacklistMutation.isPending ? t("actions.blacklisting") : t("actions.blacklist")}
                  </button>
                  {!user.roles.includes("SUPERADMIN") && (
                    <button
                      className="button danger"
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(user)}
                    >
                      {deleteMutation.isPending ? t("actions.deleting") : t("actions.delete")}
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <header className="card-header">
          <div>
            <h2>{t("sections.blacklisted.title")}</h2>
            <p className="muted">{t("sections.blacklisted.subtitle")}</p>
          </div>
        </header>
        {blacklistedQuery.isLoading ? (
          <p>{t("sections.blacklisted.loading")}</p>
        ) : blacklistedQuery.isError ? (
          <ErrorBanner message={t("sections.blacklisted.loadError") ?? t("loadError")} />
        ) : blacklistedUsers.length === 0 ? (
          <EmptyState icon="🛡️" title={t("sections.blacklisted.empty.title") ?? ""} message={t("sections.blacklisted.empty.message") ?? ""} />
        ) : (
          <div className="admin-user-grid">
            {blacklistedUsers.map((user) => (
              <article key={user.id} className="admin-user-card danger">
                <header>
                  <h2>{user.displayName || user.username}</h2>
                  <span className="muted">@{user.username}</span>
                </header>
                <dl>
                  <div>
                    <dt>{t("fields.email")}</dt>
                    <dd>{user.email || t("fields.emailMissing")}</dd>
                  </div>
                  <div>
                    <dt>{t("fields.status")}</dt>
                    <dd>{t("fields.blacklisted")}</dd>
                  </div>
                </dl>
                <footer>
                  <button
                    className="button"
                    type="button"
                    disabled={reinstateMutation.isPending}
                    onClick={() => reinstateMutation.mutate(user.id)}
                  >
                    {reinstateMutation.isPending ? t("actions.reinstating") : t("actions.reinstate")}
                  </button>
                  {!user.roles.includes("SUPERADMIN") && (
                    <button
                      className="button danger"
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(user)}
                    >
                      {deleteMutation.isPending ? t("actions.deleting") : t("actions.delete")}
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
