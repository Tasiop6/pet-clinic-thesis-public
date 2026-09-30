import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";
import "../styles/LandingPage.css";

// Accordion Item Component
function FAQItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`faq-item ${isOpen ? "open" : ""}`}>
            <div className="faq-question" onClick={() => setIsOpen(!isOpen)}>
                <h3>{question}</h3>
                <span className="faq-icon">▼</span>
            </div>
            <div className="faq-answer">
                <p>{answer}</p>
            </div>
        </div>
    );
}

export function FAQPage() {
    const { t } = useTranslation(["landing"]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
                    <h1 style={{ marginBottom: "1rem" }}>{t("landing:faq.title")}</h1>
                    <p style={{ maxWidth: "600px", margin: "0 auto", color: "var(--text-color)", fontSize: "1.1rem" }}>
                        {t("landing:faq.subtitle")}
                    </p>
                </div>

                <section className="faq-section" style={{ minHeight: "auto" }}>
                    <div className="faq-container">
                        {/* Vaccinations */}
                        <div className="faq-category">
                            <h2>{t("landing:faq.vaccinations.title")}</h2>
                            {[1, 2, 3, 4].map((i) => (
                                <FAQItem
                                    key={`vac-${i}`}
                                    question={t(`landing:faq.vaccinations.q${i}`)}
                                    answer={t(`landing:faq.vaccinations.a${i}`)}
                                />
                            ))}
                        </div>

                        {/* Deworming */}
                        <div className="faq-category">
                            <h2>{t("landing:faq.deworming.title")}</h2>
                            {[1, 2, 3, 4].map((i) => (
                                <FAQItem
                                    key={`dew-${i}`}
                                    question={t(`landing:faq.deworming.q${i}`)}
                                    answer={t(`landing:faq.deworming.a${i}`)}
                                />
                            ))}
                        </div>

                        {/* Nutrition */}
                        <div className="faq-category">
                            <h2>{t("landing:faq.nutrition.title")}</h2>
                            {[1, 2, 3, 4].map((i) => (
                                <FAQItem
                                    key={`nut-${i}`}
                                    question={t(`landing:faq.nutrition.q${i}`)}
                                    answer={t(`landing:faq.nutrition.a${i}`)}
                                />
                            ))}
                        </div>

                        {/* Bad Breath */}
                        <div className="faq-category">
                            <h2>{t("landing:faq.bad_breath.title")}</h2>
                            <FAQItem
                                key={`bad-1`}
                                question={t(`landing:faq.bad_breath.q1`)}
                                answer={t(`landing:faq.bad_breath.a1`)}
                            />
                        </div>

                        {/* Grooming */}
                        <div className="faq-category">
                            <h2>{t("landing:faq.grooming.title")}</h2>
                            {[1, 2].map((i) => (
                                <FAQItem
                                    key={`gro-${i}`}
                                    question={t(`landing:faq.grooming.q${i}`)}
                                    answer={t(`landing:faq.grooming.a${i}`)}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
