import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";
import "../styles/LandingPage.css";

export function LandingPage() {
  const { t } = useTranslation(["landing"]);
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        // Tiny delay to ensure layout is ready
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="landing-page-body">
      <PublicNavbar />

      <main className="page-content">
        <header id="hero" className="hero">
          <div className="hero-content">
            <h1>{t("landing:hero.title")}</h1>
            <p>{t("landing:hero.subtitle")}</p>
            <Link to="/register" className="cta-button">
              {t("landing:hero.cta")}
            </Link>
          </div>
        </header>

        <section id="info-section" className="info-section">
          <div className="info-container">
            <div className="info-text">
              <h2 className="section-title" style={{ textAlign: "left" }}>{t("landing:about.title")}</h2>
              <p style={{ fontSize: "1.1rem", lineHeight: "1.7", marginBottom: "1rem" }}>
                {t("landing:about.p1")}
              </p>
              <p style={{ fontSize: "1.1rem", lineHeight: "1.7" }}>
                {t("landing:about.p2")}
              </p>
            </div>
            <div className="info-image">
              <img src="/hero-image.png" alt="Happy pets" />
            </div>
          </div>
        </section>

        {/* Services Preview or Call to Action could go here, but removing full section as requested */}

        <section className="gallery-section">
          <h2 className="section-title">{t("landing:gallery.title")}</h2>
          <div className="gallery-grid">
            <div className="gallery-item">
              <img src="/puppy_playing.png" alt="Puppy playing" />
            </div>
            <div className="gallery-item">
              <img src="/kitten_sleeping.png" alt="Kitten sleeping" />
            </div>
            <div className="gallery-item">
              <img src="/vet_exam.png" alt="Vet exam" />
            </div>
            <div className="gallery-item">
              <img src="/pet-care-illustration.jpg" alt={t("landing:gallery.genericAlt")} />
            </div>
          </div>
        </section>

        <section id="contact-section" className="contact-section">
          <h2 className="section-title">{t("landing:contact.title")}</h2>
          <div className="contact-container">
            <div className="contact-info">
              <h3>Happy Tails</h3>
              <p>{t("landing:contact.project")}</p>

              <hr style={{ margin: "2rem 0", borderColor: "var(--section-bg)" }} />

              <h4>{t("landing:contact.developerTitle")}</h4>
              <p><strong>{t("landing:contact.developer")}</strong></p>
              <p>{t("landing:contact.studentNumber")}</p>
              <p>{t("landing:contact.institution")}</p>
              <p><strong>🌐 thesis-tasiopoulos.com</strong></p>
            </div>
            <div className="map-container">
              <iframe
                title={t("landing:contact.mapTitle")}
                src="https://www.google.com/maps?q=University+of+Thessaly+Department+of+Electrical+and+Computer+Engineering+Volos&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
