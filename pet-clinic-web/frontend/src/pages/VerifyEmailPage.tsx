import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../api/client";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { Loader } from "../components/Loader";
import "./AuthPages.css";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("The verification link is missing its token.");
      setLoading(false);
      return;
    }
    authApi.verifyEmail(token)
      .then((response) => setMessage(response.message))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to verify email."))
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <span className="badge">✉️ Email verification</span>
          <h1>Confirm your email address</h1>
        </div>
        {loading && <Loader />}
        {message && <SuccessBanner message={message} />}
        {error && <ErrorBanner message={error} />}
        {!loading && <p className="muted"><Link to="/login">Continue to sign in</Link></p>}
      </div>
    </div>
  );
}
