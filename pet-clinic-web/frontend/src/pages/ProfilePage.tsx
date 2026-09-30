import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/client";
import { Loader } from "../components/Loader";
import { EmptyState, ErrorBanner, SuccessBanner } from "../components/Feedback";
import type { ProfileUpdateRequest } from "../api/types";
import { useLocation } from "react-router-dom";
import "./ProfilePage.css";

export function ProfilePage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ProfileUpdateRequest) => profileApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setMessage("Profile updated.");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: profileApi.disconnectGoogle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("google");
    if (status === "success") {
      setMessage("Google Calendar connected successfully.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      window.history.replaceState(null, "", "/profile");
    } else if (status === "error") {
      setMessage("Google Calendar link failed.");
      window.history.replaceState(null, "", "/profile");
    }
  }, [location.search, queryClient]);

  if (profileQuery.isLoading) {
    return (
      <div className="page">
        <Loader />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="page">
        <ErrorBanner message="Unable to load profile." />
      </div>
    );
  }

  const profile = profileQuery.data;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: ProfileUpdateRequest = {
      displayName: String(data.get("displayName") ?? ""),
      email: data.get("email") ? String(data.get("email")) : undefined,
    };
    updateMutation.mutate(payload);
  };

  const handleConnect = async () => {
    try {
      const response = await profileApi.connectGoogle();
      window.location.href = response.authorizationUrl;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to initiate Google Calendar link."
      );
    }
  };

  return (
    <div className="page profile-page">
      <div className="page-header">
        <div>
          <h1>Profile & Integrations</h1>
          <p className="muted">Manage your contact details and calendar integrations.</p>
        </div>
      </div>

      {message && <SuccessBanner message={message} />}

      <section className="card">
        <h2 className="section-title">Contact details</h2>
        <form className="profile-form" onSubmit={handleSubmit}>
          <label>
            Display name
            <input
              name="displayName"
              defaultValue={profile.displayName ?? ""}
              placeholder="Dr. Alex"
            />
          </label>
          <label>
            Email
            <input type="email" name="email" defaultValue={profile.email ?? ""} />
          </label>
          <button className="button" type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Calendar sync</h2>
        {!profile.oauthConfigured ? (
          <EmptyState
            icon="🔒"
            title="Google integration disabled"
            message="Add OAuth credentials to enable Google Calendar sync."
          />
        ) : profile.calendarLinked ? (
          <div className="integration-card">
            <div>
              <strong>Google Calendar linked</strong>
              <p className="muted">
                Events will stay in sync for {profile.calendarEmail || "your Google account"}.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="integration-card">
            <div>
              <strong>Keep your calendar in sync</strong>
              <p className="muted">
                Link Google Calendar to auto-send invites and updates to families.
              </p>
            </div>
            <button className="button" onClick={handleConnect}>
              Connect Google Calendar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
