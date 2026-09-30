import { differenceInDays, parseISO, formatISO } from "date-fns";
import type {
  PetDetail,
  PetHealthRecordDto,
  PetHealthRecordType,
  VisitDto,
} from "../api/types";

export type TimelineEventType =
  | "visit"
  | "weight"
  | "vaccine"
  | "lab"
  | "imaging"
  | "prescription"
  | "note"
  | "other";

export type TimelineMetricKind = "weight" | "temperature" | "heartRate" | "respirationRate";

export interface TimelineMetric {
  kind: TimelineMetricKind;
  value: number;
}

export interface PetTimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  metrics?: TimelineMetric[];
  hasAttachment?: boolean;
  record?: PetHealthRecordDto;
  recordId?: number;
  recordType?: PetHealthRecordType;
  visitId?: number;
}

export interface WeightPoint {
  id: string;
  date: string;
  weightKg: number;
}

export interface WeightInsights {
  points: WeightPoint[];
  changePercent30d: number | null;
  status: "warning" | "stable";
}

const HEALTH_RECORD_TYPE_MAP: Record<PetHealthRecordType, TimelineEventType> = {
  VITALS: "weight",
  XRAY: "imaging",
  BLOOD_WORK: "lab",
  PRESCRIPTION: "prescription",
  EXAM_NOTE: "note",
  OTHER: "other",
};

const toIsoOrFallback = (input: string | null | undefined, fallback?: string) => {
  if (!input) {
    return fallback ?? formatISO(new Date());
  }
  try {
    return formatISO(parseISO(input));
  } catch {
    return fallback ?? formatISO(new Date());
  }
};

const buildMetrics = (record: PetHealthRecordDto): TimelineMetric[] => {
  const metrics: TimelineMetric[] = [];
  if (record.weightKg != null) {
    metrics.push({ kind: "weight", value: Number(record.weightKg) });
  }
  if (record.temperatureC != null) {
    metrics.push({ kind: "temperature", value: Number(record.temperatureC) });
  }
  if (record.heartRate != null) {
    metrics.push({ kind: "heartRate", value: Number(record.heartRate) });
  }
  if (record.respirationRate != null) {
    metrics.push({ kind: "respirationRate", value: Number(record.respirationRate) });
  }
  return metrics;
};

export const buildTimelineEvents = (pet: PetDetail): PetTimelineEvent[] => {
  const events: PetTimelineEvent[] = [];

  const birthIso = pet.birthDate ? toIsoOrFallback(pet.birthDate) : undefined;

  const visitEvents = pet.visits.map((visit: VisitDto) => ({
    id: `visit-${visit.id}`,
    type: "visit" as const,
    timestamp: toIsoOrFallback(visit.date, birthIso),
    title: visit.description,
    visitId: visit.id,
  }));
  events.push(...visitEvents);

  (Object.keys(pet.healthRecords) as PetHealthRecordType[]).forEach((type) => {
    const records = pet.healthRecords[type] ?? [];
    records.forEach((record) => {
      const fallbackType = HEALTH_RECORD_TYPE_MAP[type];
      const hasWeight = record.weightKg != null;
      events.push({
        id: `record-${record.id}`,
        type: hasWeight ? "weight" : fallbackType,
        timestamp: toIsoOrFallback(record.recordedAt, birthIso),
        title: record.title,
        subtitle: hasWeight ? "weight" : type.toLowerCase(),
        description: record.notes ?? record.additionalMetrics,
        metrics: buildMetrics(record),
        hasAttachment: Boolean(record.downloadUrl),
        record,
        recordId: record.id,
        recordType: type,
      });
    });
  });

  return events.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
};

export const buildWeightSeries = (pet: PetDetail): WeightPoint[] => {
  const allRecords = (Object.keys(pet.healthRecords) as PetHealthRecordType[]).flatMap((type) =>
    pet.healthRecords[type] ?? [],
  );

  const points = allRecords
    .filter((record) => record.weightKg != null)
    .map((record) => {
      const iso = toIsoOrFallback(record.recordedAt, pet.birthDate ?? undefined);
      return {
        id: record.id != null ? `weight-${record.id}` : `weight-${iso}`,
        date: iso,
        weightKg: Number(record.weightKg),
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return points;
};

const calculateThirtyDayChange = (points: WeightPoint[]): number | null => {
  if (points.length < 2) {
    return null;
  }
  const latest = points[points.length - 1];
  const latestDate = parseISO(latest.date);

  let baseline = points[0];
  for (let index = points.length - 2; index >= 0; index -= 1) {
    const candidate = points[index];
    const candidateDate = parseISO(candidate.date);
    const days = differenceInDays(latestDate, candidateDate);
    if (days >= 30) {
      baseline = candidate;
      break;
    }
  }

  if (baseline.weightKg === 0) {
    return null;
  }

  return ((latest.weightKg - baseline.weightKg) / baseline.weightKg) * 100;
};

export const buildWeightInsights = (pet: PetDetail): WeightInsights => {
  const points = buildWeightSeries(pet);
  const changePercent30d = calculateThirtyDayChange(points);
  const status =
    changePercent30d != null && Math.abs(changePercent30d) >= 5 ? "warning" : "stable";
  return {
    points,
    changePercent30d,
    status,
  };
};
