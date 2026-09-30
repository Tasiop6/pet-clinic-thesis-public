import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SuccessBanner, ErrorBanner } from "../components/Feedback";
import { useQueryClient } from "@tanstack/react-query";
import "./AuthPages.css";

export function GoogleOAuthResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const status = params.get("status");

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    const timer = setTimeout(() => navigate("/profile"), 1500);
    return () => clearTimeout(timer);
  }, [navigate, queryClient]);

  return (
    <div className="auth-layout">
      <div className="auth-card">
        {status === "success" ? (
          <SuccessBanner message="Google Calendar connected. Redirecting..." />
        ) : (
          <ErrorBanner message="Google Calendar link failed. Redirecting..." />
        )}
      </div>
    </div>
  );
}
