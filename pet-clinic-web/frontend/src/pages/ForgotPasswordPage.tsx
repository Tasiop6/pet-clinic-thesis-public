import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/client";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import "./AuthPages.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authApi.forgotPassword(email);
      setSuccess(response.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to request a password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <span className="badge">🔐 Account access</span>
          <h1>Forgot your password?</h1>
          <p className="muted">
            Enter your account email and we will send you a secure link to choose a new password.
          </p>
        </div>
        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner message={success} />}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <p className="muted"><Link to="/login">Return to sign in</Link></p>
      </div>
    </div>
  );
}
