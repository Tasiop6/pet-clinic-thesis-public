import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../api/client";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import "./AuthPages.css";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "The password reset link is missing its token.",
  );
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await authApi.resetPassword(token, password);
      setSuccess(response.message);
      setPassword("");
      setConfirmation("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to change the password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <span className="badge">🔐 Account access</span>
          <h1>Choose a new password</h1>
          <p className="muted">Use at least eight characters.</p>
        </div>
        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner message={success} />}
        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={100}
                required
                disabled={!token}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                minLength={8}
                maxLength={100}
                required
                disabled={!token}
              />
            </label>
            <button className="button" type="submit" disabled={submitting || !token}>
              {submitting ? "Changing password..." : "Change password"}
            </button>
          </form>
        )}
        <p className="muted"><Link to="/login">Return to sign in</Link></p>
      </div>
    </div>
  );
}
