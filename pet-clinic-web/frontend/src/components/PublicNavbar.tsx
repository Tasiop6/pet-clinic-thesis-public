import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAuth } from "../hooks/useAuth";
import "../styles/LandingPage.css"; // Reuse existing styles

export function PublicNavbar() {
    const { t } = useTranslation(["landing"]);
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        const saved = localStorage.getItem("theme");
        return (saved === "dark" || saved === "light") ? saved : "light";
    });
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { authenticated, loading, user } = useAuth();
    const userLabel = user?.displayName?.trim() || user?.username || "";

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    const toggleLanguage = () => {
        const nextLang = i18n.language === "el" ? "en" : "el";
        i18n.changeLanguage(nextLang);
    };

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const scrollToSection = (id: string, page: string = "/") => {
        setMenuOpen(false);

        // If we are on the target page, just scroll
        if (location.pathname === page) {
            if (id === "top") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                }
            }
        } else {
            // Navigate to the page and then scroll (handled by useEffect in target page or hash link)
            navigate(`${page}${id !== "top" ? "#" + id : ""}`);
        }
    };

    return (
        <>
            <nav className="landing-nav">
                <div className="logo">
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🐾</span> Happy Tails
                    </Link>
                </div>

                {/* Desktop Menu */}
                <div className="desktop-menu">
                    <button className="nav-link" onClick={() => scrollToSection("top", "/")}>{t("landing:menu.home")}</button>
                    <button className="nav-link" onClick={() => scrollToSection("info-section", "/")}>{t("landing:menu.clinic")}</button>

                    <div className="nav-item-dropdown">
                        <button className="nav-link dropdown-trigger" onClick={() => navigate("/services")}>
                            {t("landing:menu.services")} ▾
                        </button>
                        <div className="dropdown-menu">
                            <button className="dropdown-item" onClick={() => scrollToSection("internal_medicine", "/services")}>{t("landing:menu.service_list.internal_medicine")}</button>
                            <button className="dropdown-item" onClick={() => scrollToSection("surgery", "/services")}>{t("landing:menu.service_list.surgery")}</button>
                            <button className="dropdown-item" onClick={() => scrollToSection("dentistry", "/services")}>{t("landing:menu.service_list.dentistry")}</button>
                            <button className="dropdown-item" onClick={() => scrollToSection("hospitalization", "/services")}>{t("landing:menu.service_list.hospitalization")}</button>
                            <button className="dropdown-item" onClick={() => scrollToSection("prevention", "/services")}>{t("landing:menu.service_list.prevention")}</button>
                            <button className="dropdown-item" onClick={() => scrollToSection("home_visits", "/services")}>{t("landing:menu.service_list.home_visits")}</button>
                            <button className="dropdown-item" onClick={() => scrollToSection("grooming", "/services")}>{t("landing:menu.service_list.grooming")}</button>
                            <button className="dropdown-item" onClick={() => scrollToSection("cat_boarding", "/services")}>{t("landing:menu.service_list.cat_boarding")}</button>
                        </div>
                    </div>

                    <button className="nav-link" onClick={() => navigate("/faq")}>{t("landing:menu.faq")}</button>
                    <button className="nav-link" onClick={() => scrollToSection("contact-section", "/")}>{t("landing:menu.contact")}</button>
                </div>

                <div className="nav-right">
                    <button className="lang-toggle" onClick={toggleLanguage} title="Switch Language">
                        {i18n.language === "el" ? "EN" : "EL"}
                    </button>
                    <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
                        {theme === "light" ? "🌙" : "☀️"}
                    </button>
                    {!loading && (authenticated ? (
                        <div className="landing-session-actions">
                            <Link
                                to="/profile"
                                className="landing-user-link"
                                title={t("landing:nav.connected_as", { name: userLabel })}
                            >
                                <span className="landing-user-dot" aria-hidden="true" />
                                <span className="landing-user-name">{userLabel}</span>
                            </Link>
                            <Link to="/dashboard" className="login-btn">
                                {t("landing:nav.dashboard")}
                            </Link>
                        </div>
                    ) : (
                        <Link to="/login" className="login-btn">
                            {t("landing:nav.login")}
                        </Link>
                    ))}

                    {/* Mobile Menu Button */}
                    <button className="mobile-menu-btn" onClick={toggleMenu}>
                        {menuOpen ? "✕" : "☰"}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {menuOpen && (
                <div className="mobile-menu-overlay">
                    <button
                        className="mobile-menu-close"
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        aria-label={i18n.language === "el" ? "Κλείσιμο μενού" : "Close menu"}
                    >
                        ✕
                    </button>
                    <button className="mobile-nav-link" onClick={() => scrollToSection("top", "/")}>{t("landing:menu.home")}</button>
                    <button className="mobile-nav-link" onClick={() => scrollToSection("info-section", "/")}>{t("landing:menu.clinic")}</button>
                    <button className="mobile-nav-link" onClick={() => navigate("/services")}>{t("landing:menu.services")}</button>
                    <button className="mobile-nav-link" onClick={() => navigate("/faq")}>{t("landing:menu.faq")}</button>
                    <button className="mobile-nav-link" onClick={() => scrollToSection("contact-section", "/")}>{t("landing:menu.contact")}</button>
                    {!loading && (authenticated ? (
                        <>
                            <Link to="/profile" className="mobile-nav-link mobile-user-link" onClick={() => setMenuOpen(false)}>
                                {userLabel}
                            </Link>
                            <Link to="/dashboard" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                                {t("landing:nav.dashboard")}
                            </Link>
                        </>
                    ) : (
                        <Link to="/login" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                            {t("landing:nav.login")}
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}
