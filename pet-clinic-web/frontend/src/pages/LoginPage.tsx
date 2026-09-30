import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ErrorBanner } from "../components/Feedback";
import "./AuthPages.css";

export function LoginPage() {
  const { login, authenticated, message } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <span className="badge">🐾 Happy Tails</span>
          <h1>Welcome back</h1>
          <p className="muted">
            Sign in to manage appointments, owners, and patient records.
          </p>
        </div>
        {message && <ErrorBanner message={message} />}
        {error && <ErrorBanner message={error} />}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
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
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required
            />
            <span className="auth-field-link"><Link to="/forgot-password">Forgot password?</Link></span>
          </label>

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="muted">
          Need access?{" "}
          <a href="/register" onClick={(e) => (e.preventDefault(), navigate("/register"))}>
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
