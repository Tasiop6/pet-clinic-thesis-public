import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { parseISO, format } from "date-fns";
import { el as elLocale, enGB } from "date-fns/locale";
import type { WeightInsights } from "../../utils/pets";
import { useLanguage } from "../../context/LanguageContext";
import "./PetWeightCard.css";

interface PetWeightCardProps {
  insights: WeightInsights;
  onAddWeight: () => void;
}

interface ChartDatum {
  date: string;
  label: string;
  weightKg: number;
  order: number;
}

const localeMap = {
  el: elLocale,
  en: enGB,
};

export function PetWeightCard({ insights, onAddWeight }: PetWeightCardProps) {
  const { language } = useLanguage();
  const { t } = useTranslation("ownerDetail");
  const locale = localeMap[language] ?? elLocale;
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language === "en" ? "en-GB" : "el-GR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }),
    [language],
  );

  const chartData: ChartDatum[] = useMemo(() => {
    if (insights.points.length === 0) {
      return [];
    }
    return insights.points.map((point, index) => {
      const date = parseISO(point.date);
      return {
        date: point.date,
        label: format(date, "d MMM", { locale }),
        weightKg: point.weightKg,
        order: index,
      };
    });
  }, [insights.points, locale]);

  const changeLabel =
    insights.changePercent30d != null
      ? percentFormatter.format(insights.changePercent30d)
      : null;

  return (
    <section className="pet-weight-card">
      <div className="pet-weight-card__header">
        <div>
          <h4>{t("weights.title")}</h4>
          {changeLabel != null && (
            <span
              className={`pet-weight-card__badge pet-weight-card__badge--${insights.status}`}
            >
              {t("weights.change", { value: changeLabel })}
              <span className="pet-weight-card__badge-note">
                {t(`weights.status.${insights.status}`)}
              </span>
            </span>
          )}
        </div>
        <button type="button" className="button secondary" onClick={onAddWeight}>
          {t("weights.add")}
        </button>
      </div>
      {chartData.length === 0 ? (
        <p className="muted">{t("weights.empty")}</p>
      ) : (
        <div className="pet-weight-card__chart">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.3)" />
              <XAxis
                dataKey="label"
                stroke="var(--color-text-muted)"
                fontSize={12}
                minTickGap={12}
                tick={{ dy: 6 }}
              />
              <YAxis
                dataKey="weightKg"
                stroke="var(--color-text-muted)"
                fontSize={12}
                width={40}
                tickFormatter={(value) =>
                  new Intl.NumberFormat(language === "en" ? "en-GB" : "el-GR", {
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  `${new Intl.NumberFormat(language === "en" ? "en-GB" : "el-GR", {
                    maximumFractionDigits: 2,
                  }).format(value)} kg`
                }
                labelFormatter={(value: string, payload) => {
                  const datum = payload?.[0]?.payload as ChartDatum | undefined;
                  if (!datum) {
                    return value;
                  }
                  const date = parseISO(datum.date);
                  return format(date, "EEEE d MMM yyyy", { locale });
                }}
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "var(--color-border-light, rgba(148,163,184,0.3))",
                }}
              />
              <Area
                type="monotone"
                dataKey="weightKg"
                stroke="#2563eb"
                fillOpacity={1}
                fill="url(#weightGradient)"
                strokeWidth={2}
                dot={{ strokeWidth: 1.5, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
