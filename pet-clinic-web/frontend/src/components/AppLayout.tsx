import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { LanguageToggle } from "./LanguageToggle";
import "./AppLayout.css";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "navigation"]);

  const navLinks = useMemo(() => {
    const base = [
      { to: "/dashboard", labelKey: "navigation:links.dashboard", icon: "📊" },
      { to: "/owners", labelKey: "navigation:links.owners", icon: "👥" },
      { to: "/appointments", labelKey: "navigation:links.appointments", icon: "📅" },
      { to: "/vets", labelKey: "navigation:links.vets", icon: "⚕️" },
    ];
    if (isAdmin) {
      base.push({ to: "/admin/users", labelKey: "navigation:links.users", icon: "🛡️" });
    }
    return base;
  }, [isAdmin]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-brand">
            <span>🐾</span>
            <span>{t("common:app.name")}</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{link.icon}</span>
              <span>{t(link.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `user-profile user-profile-link ${isActive ? "active" : ""}`
            }
            aria-label={t("navigation:links.profile")}
          >
            <div className="user-avatar">
              {user?.displayName?.charAt(0) ?? user?.username.charAt(0)}
            </div>
            <div className="user-info">
              <strong>{user?.displayName ?? user?.username}</strong>
              <span>{user?.active ? t("common:status.active") : t("common:status.pending")}</span>
            </div>
          </NavLink>
          <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
            <LanguageToggle />
            <button className="button secondary small" onClick={handleLogout} style={{ flex: 1 }}>
              {t("common:actions.logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="mobile-brand">
          <span>🐾</span>
          <span>{t("common:app.name")}</span>
        </div>
        <LanguageToggle />
      </header>

      {/* Main Content */}
      <main className="app-main">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="app-bottom-nav">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{link.icon}</span>
            <span>{t(link.labelKey)}</span>
          </NavLink>
        ))}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon">👤</span>
          <span>{t("navigation:links.profile")}</span>
        </NavLink>
      </nav>

      {/* Mobile FAB */}
      <div className="fab-container">
        <button
          className="fab-button"
          onClick={() => navigate("/appointments/new")} // Assuming this route exists or opens a modal
          aria-label="Book Appointment"
        >
          +
        </button>
      </div>
    </div>
  );
}
