import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/LandingPage.css";

export function PublicFooter() {
    const { t } = useTranslation(["landing"]);
    const navigate = useNavigate();

    const scrollToSection = (id: string, page: string = "/") => {
        // Basic navigation support for footer links
        navigate(`${page}${id !== "top" ? "#" + id : ""}`);
        if (page === location.pathname && id === "top") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-col">
                    <h4>Happy Tails</h4>
                    <p>Happy Tails — Veterinary Clinic Management</p>
                    <p>thesis-tasiopoulos.com</p>
                </div>

                <div className="footer-col">
                    <h4>{t("landing:footer.categories")}</h4>
                    <p><span onClick={() => scrollToSection("hero", "/")} style={{ cursor: "pointer", color: "var(--footer-text)" }}>{t("landing:menu.home")}</span></p>
                    <p><span onClick={() => scrollToSection("info-section", "/")} style={{ cursor: "pointer", color: "var(--footer-text)" }}>{t("landing:menu.clinic")}</span></p>
                    <p><Link to="/services" style={{ color: "var(--footer-text)", textDecoration: "none" }}>{t("landing:menu.services")}</Link></p>
                    <p><Link to="/faq" style={{ color: "var(--footer-text)", textDecoration: "none" }}>{t("landing:menu.faq")}</Link></p>
                    <p><span onClick={() => scrollToSection("contact-section", "/")} style={{ cursor: "pointer", color: "var(--footer-text)" }}>{t("landing:menu.contact")}</span></p>
                </div>

                <div className="footer-col">
                    <h4>{t("landing:footer.quick_links")}</h4>
                    <p><Link to="/register" style={{ color: "var(--footer-text)", textDecoration: "none" }}>Register</Link></p>
                    <p><Link to="/login" style={{ color: "var(--footer-text)", textDecoration: "none" }}>{t("landing:nav.login")}</Link></p>
                </div>
            </div>

            <div className="footer-bottom">
                <p>
                    &copy; {new Date().getFullYear()} Happy Tails. {t("landing:footer.rights")} |
                    {" "}{t("landing:footer.dev")}{" "}
                    <span>Konstantinos Tasiopoulos</span>
                </p>
            </div>
        </footer>
    );
}
