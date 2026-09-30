import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import type { RegistrationRequest } from "../api/types";
import { useAuth } from "../hooks/useAuth";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import "./AuthPages.css";

export function RegisterPage() {
  const { authenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationRequest>({
    username: "",
    password: "",
    displayName: "",
    email: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (authenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await authApi.register(form);
      setSuccess(response.message);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <span className="badge">👋 Join us</span>
          <h1>Create your workspace access</h1>
          <p className="muted">
            Verify your email first; the clinic team will then approve your access.
          </p>
        </div>
        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner message={success} />}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required
              minLength={8}
            />
          </label>
          <label>
            Display name
            <input
              value={form.displayName ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, displayName: e.target.value }))
              }
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
          </label>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Request access"}
          </button>
        </form>
        <p className="muted">
          Already have access? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
