import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";
import "../styles/LandingPage.css";

export function ServicesPage() {
    const { t } = useTranslation(["landing"]);
    const location = useLocation();

    // Scroll to hash on mount or hash change
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace("#", "");
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
        } else {
            window.scrollTo(0, 0);
        }
    }, [location]);

    return (
        <div className="landing-page-body">
            <PublicNavbar />

            <main className="page-content">
                <div className="page-header" style={{
                    paddingTop: "4rem",
                    paddingBottom: "2rem",
                    background: "var(--section-bg)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                }}>
                    <h1 style={{ marginBottom: "1rem" }}>{t("landing:services.title")}</h1>
                    <p style={{ maxWidth: "600px", margin: "0 auto", color: "var(--text-color)", fontSize: "1.1rem" }}>
                        {t("landing:services.subtitle")}
                    </p>
                </div>

                <section className="services" style={{ minHeight: "auto" }}>
                    <div className="services-grid">
                        <div className="service-card" id="internal_medicine">
                            <span className="service-icon">🩺</span>
                            <h3>{t("landing:services.internal_medicine.title")}</h3>
                            <p>{t("landing:services.internal_medicine.desc")}</p>
                        </div>
                        <div className="service-card" id="surgery">
                            <span className="service-icon">🔪</span>
                            <h3>{t("landing:services.surgery.title")}</h3>
                            <p>{t("landing:services.surgery.desc")}</p>
                        </div>
                        <div className="service-card" id="dentistry">
                            <span className="service-icon">🦷</span>
                            <h3>{t("landing:services.dentistry.title")}</h3>
                            <p>{t("landing:services.dentistry.desc")}</p>
                        </div>
                        <div className="service-card" id="hospitalization">
                            <span className="service-icon">🏥</span>
                            <h3>{t("landing:services.hospitalization.title")}</h3>
                            <p>{t("landing:services.hospitalization.desc")}</p>
                        </div>
                        <div className="service-card" id="prevention">
                            <span className="service-icon">💉</span>
                            <h3>{t("landing:services.prevention.title")}</h3>
                            <p>{t("landing:services.prevention.desc")}</p>
                        </div>
                        <div className="service-card" id="home_visits">
                            <span className="service-icon">🚑</span>
                            <h3>{t("landing:services.home_visits.title")}</h3>
                            <p>{t("landing:services.home_visits.desc")}</p>
                        </div>
                        <div className="service-card" id="grooming">
                            <span className="service-icon">✂️</span>
                            <h3>{t("landing:services.grooming.title")}</h3>
                            <p>{t("landing:services.grooming.desc")}</p>
                        </div>
                        <div className="service-card" id="cat_boarding">
                            <span className="service-icon">🐱</span>
                            <h3>{t("landing:services.cat_boarding.title")}</h3>
                            <p>{t("landing:services.cat_boarding.desc")}</p>
                        </div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
