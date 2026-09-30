import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { el, enGB } from "date-fns/locale";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { DateSelectArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import elCalendarLocale from "@fullcalendar/core/locales/el";
import enGbCalendarLocale from "@fullcalendar/core/locales/en-gb";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { appointmentsApi, ownersApi, vetsApi } from "../api/client";
import type {
  AppointmentDetail,
  AppointmentRecordRequest,
  AppointmentRequest,
  AppointmentWeekResponse,
  OwnerDetail,
  PetHealthRecordType,
  RescheduleRequest,
} from "../api/types";
import { EmptyState } from "../components/Feedback/EmptyState";
import { ErrorBanner } from "../components/Feedback/ErrorBanner";
import { Skeleton } from "../components/Feedback/Skeleton";
import { AppointmentDrawer } from "../components/appointments/AppointmentDrawer";
import { AppointmentsList } from "../components/appointments/AppointmentsList";
import {
  ExternalEventDrawer,
  type ExternalEventInfo,
} from "../components/appointments/ExternalEventDrawer";
import "./AppointmentsPage.css";

type DrawerState =
  | { mode: "create"; slot: Date }
  | { mode: "edit"; appointmentId: number }
  | null;


const SLOT_DURATION_MINUTES = 30;
const MOBILE_BREAKPOINT = 768;
const HEALTH_RECORD_TYPES: PetHealthRecordType[] = [
  "XRAY",
  "BLOOD_WORK",
  "PRESCRIPTION",
  "EXAM_NOTE",
  "VITALS",
  "OTHER",
];
const AUTO_SYNC_INTERVAL_MS = 60_000;
const AUTO_SYNC_COOLDOWN_MS = 3 * 60_000;
const CALENDAR_REFRESH_INTERVAL_MS = 30_000;

const defaultCalendarView = () =>
  typeof window !== "undefined" && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
    ? "timeGridDay"
    : "timeGridWeek";

const TIMEFRAMES = [
  { id: "morning", startHour: 8, endHour: 11 },
  { id: "midday", startHour: 11, endHour: 15 },
  { id: "afternoon", startHour: 15, endHour: 18 },
  { id: "evening", startHour: 18, endHour: 21 },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number];

function getTimeframeForDate(date: Date): Timeframe | undefined {
  return TIMEFRAMES.find(
    (frame) => date.getHours() >= frame.startHour && date.getHours() < frame.endHour,
  );
}

export function AppointmentsPage({ defaultOpenCreate = false }: { defaultOpenCreate?: boolean }) {
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const calendarRef = useRef<FullCalendar | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(() =>
    defaultOpenCreate ? { mode: "create", slot: new Date() } : null
  );
  const [externalEvent, setExternalEvent] = useState<ExternalEventInfo | null>(null);
  const [ownerId, setOwnerId] = useState<number | "">("");
  const [vetId, setVetId] = useState<number | "">("");
  const [initialView] = useState<string>(() => defaultCalendarView());
  const [, setCurrentView] = useState<string>(initialView);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
      : false,
  );
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const queryClient = useQueryClient();
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const syncAttemptsRef = useRef<Record<number, number>>({});
  const autoSyncingRef = useRef(false);
  const [autoSyncState, setAutoSyncState] = useState<"idle" | "running">("idle");
  const [lastAutoSync, setLastAutoSync] = useState<number | null>(null);
  const { t, i18n } = useTranslation(["appointments", "common"]);
  const localeCode = i18n.language === "en" ? "en-GB" : "el-GR";
  const locale = useMemo(() => (i18n.language === "en" ? enGB : el), [i18n.language]);

  const weekParam = format(weekAnchor, "yyyy-MM-dd");

  useEffect(() => {
    syncAttemptsRef.current = {};
  }, [weekParam]);

  useEffect(() => {
    setExternalEvent(null);
  }, [weekParam]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsDocumentVisible(visible);
      if (visible) {
        void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      }
    };
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [queryClient]);

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", weekParam],
    queryFn: () => appointmentsApi.list(weekParam),
    refetchInterval: isDocumentVisible ? CALENDAR_REFRESH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const unsyncedCount = useMemo(
    () =>
      appointmentsQuery.data?.appointments.filter((appointment) => !appointment.synced).length ??
      0,
    [appointmentsQuery.data],
  );

  const calendarLocale = i18n.language === "en" ? "en-gb" : "el";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener("change", listener);
    return () => {
      query.removeEventListener("change", listener);
    };
  }, []);

  const ownersQuery = useQuery({
    queryKey: ["owners", "directory"],
    queryFn: () => ownersApi.list(),
  });

  const ownerDetailQuery = useQuery({
    queryKey: ["owner", ownerId, "pets"],
    queryFn: () => ownersApi.get(Number(ownerId)),
    enabled: typeof ownerId === "number",
  });

  const vetsQuery = useQuery({
    queryKey: ["vets"],
    queryFn: vetsApi.list,
  });
  const vets = useMemo(() => vetsQuery.data ?? [], [vetsQuery.data]);

  useEffect(() => {
    if (!drawer) {
      setVetId("");
      return;
    }
    if (drawer.mode === "create" && vets.length === 1) {
      setVetId((current) => (current === "" ? vets[0].id : current));
    }
  }, [drawer, vets]);

  const activeAppointmentId =
    drawer && drawer.mode === "edit" ? drawer.appointmentId : null;

  const appointmentDetailQuery = useQuery({
    queryKey: ["appointment", activeAppointmentId],
    queryFn: () => appointmentsApi.get(activeAppointmentId as number),
    enabled: activeAppointmentId !== null,
  });

  const owners = ownersQuery.data ?? [];
  const selectedOwner: OwnerDetail | undefined = ownerDetailQuery.data;
  const weekEnd = useMemo(() => addDays(weekAnchor, 6), [weekAnchor]);
  const nowFrame = getTimeframeForDate(new Date());
  const formatWithLocale = useMemo(
    () => (date: Date, pattern: string) => format(date, pattern, { locale }),
    [locale],
  );

  const headerToolbar = useMemo(
    () =>
      isMobile
        ? {
          left: "timeGridDay",
          center: "title",
          right: "today prev,next",
        }
        : {
          left: "dayGridMonth,timeGridWeek,timeGridDay",
          center: "title",
          right: "today prev,next",
        },
    [isMobile],
  );

  const buttonText = useMemo(
    () => ({
      today: t("appointments:page.controls.today"),
      dayGridMonth: t("appointments:page.views.month"),
      timeGridWeek: t("appointments:page.views.week"),
      timeGridDay: t("appointments:page.views.day"),
    }),
    [t],
  );

  const syncUnsynced = useCallback(async () => {
    if (autoSyncingRef.current) {
      return;
    }
    const data = queryClient.getQueryData<AppointmentWeekResponse>(["appointments", weekParam]);
    if (!data) {
      return;
    }
    const now = Date.now();
    const unsynced = data.appointments.filter(
      (appointment) => !appointment.synced && appointment.id != null,
    );
    const toRetry = unsynced.filter((appointment) => {
      const appointmentId = appointment.id as number;
      const lastAttempt = syncAttemptsRef.current[appointmentId];
      return !lastAttempt || now - lastAttempt >= AUTO_SYNC_COOLDOWN_MS;
    });
    if (toRetry.length === 0) {
      return;
    }
    autoSyncingRef.current = true;
    setAutoSyncState("running");
    setLastAutoSync(now);
    try {
      await Promise.all(
        toRetry.map(async (appointment) => {
          const appointmentId = appointment.id as number;
          syncAttemptsRef.current[appointmentId] = now;
          try {
            await appointmentsApi.reschedule(appointmentId, {
              appointmentTime: appointment.appointmentTime,
            });
          } catch (error) {
            console.warn("Failed to auto-sync appointment", appointmentId, error);
          }
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["appointments", weekParam] });
    } finally {
      autoSyncingRef.current = false;
      setAutoSyncState("idle");
    }
  }, [queryClient, weekParam]);

  useEffect(() => {
    if (appointmentsQuery.data) {
      void syncUnsynced();
    }
  }, [appointmentsQuery.data, syncUnsynced]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void syncUnsynced();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [syncUnsynced]);

  useEffect(() => {
    if (!calendarRef.current) {
      return;
    }
    const api = calendarRef.current.getApi();
    const targetView = isMobile ? "timeGridDay" : "timeGridWeek";
    if (api.view.type !== targetView) {
      api.changeView(targetView);
    }
    api.setOption("locale", calendarLocale);
  }, [isMobile, calendarLocale]);

  useEffect(() => {
    if (!calendarRef.current) {
      return;
    }
    const api = calendarRef.current.getApi();
    if (api.view.type === "dayGridMonth") {
      return;
    }
    // Check against the current view's start date, not the cursor date
    const viewStart = api.view.currentStart;

    // If the view is already starting on the weekAnchor, don't move
    if (!isSameDay(viewStart, weekAnchor)) {
      api.gotoDate(weekAnchor);
    }
  }, [weekAnchor]);

  const invalidateSchedule = () =>
    queryClient.invalidateQueries({ queryKey: ["appointments"] });

  const createMutation = useMutation({
    mutationFn: (payload: AppointmentRequest) => appointmentsApi.create(payload),
    onSuccess: () => {
      invalidateSchedule();
      setDrawer(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: number;
      payload: AppointmentRequest;
    }) => appointmentsApi.update(appointmentId, payload),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["appointment", id] });
      invalidateSchedule();
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: number;
      payload: RescheduleRequest;
    }) => appointmentsApi.reschedule(appointmentId, payload),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["appointment", id] });
      invalidateSchedule();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (appointmentId: number) => appointmentsApi.remove(appointmentId),
    onSuccess: () => invalidateSchedule(),
  });

  const uploadRecordMutation = useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: number;
      payload: AppointmentRecordRequest;
    }) => appointmentsApi.uploadRecord(appointmentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointment", variables.appointmentId] });
      invalidateSchedule();
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: ({
      appointmentId,
      recordId,
    }: {
      appointmentId: number;
      recordId: number;
    }) => appointmentsApi.deleteRecord(appointmentId, recordId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointment", variables.appointmentId] });
      invalidateSchedule();
    },
  });

  const createError = createMutation.isError
    ? createMutation.error instanceof Error
      ? createMutation.error.message
      : t("common:errors.generic")
    : null;

  const saveError = updateMutation.isError
    ? updateMutation.error instanceof Error
      ? updateMutation.error.message
      : t("common:errors.generic")
    : null;

  const calendarEvents = useMemo<EventInput[]>(() => {
    if (!appointmentsQuery.data) {
      return [];
    }

    const baseEvents = appointmentsQuery.data.appointments.map((appointment) => {
      const start = parseISO(appointment.appointmentTime);
      const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
      return {
        id: String(appointment.id),
        title: appointment.pet?.name ?? t("appointments:page.event.petFallback"),
        start,
        end,
        extendedProps: {
          ownerName:
            appointment.owner?.name ??
            appointment.contactTelephone ??
            t("appointments:page.event.ownerFallback"),
          synced: appointment.synced,
          notes: appointment.notes,
          source: "local",
          vetName: appointment.vet?.name ?? appointment.vet?.email ?? null,
          vetEmail: appointment.vet?.email ?? null,
          contactTelephone: appointment.contactTelephone,
        },
      };
    });

    const googleEvents = (appointmentsQuery.data.googleEvents ?? [])
      .map((event) => {
        const start = event.start ? parseISO(event.start) : undefined;
        const end = event.end ? parseISO(event.end) : undefined;
        if (!start) {
          return null;
        }
        return {
          id: event.id ? `gcal-${event.id}` : `gcal-${event.start}`,
          title: event.summary ?? t("appointments:page.event.petFallback"),
          start,
          end: end ?? new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000),
          extendedProps: {
            ownerName:
              event.description ?? event.location ?? t("appointments:page.event.googleFallback"),
            synced: true,
            notes: event.description,
            source: "google",
            location: event.location,
            link: event.htmlLink,
          },
          editable: false,
          startEditable: false,
          durationEditable: false,
        } as EventInput;
      })
      .filter((entry): entry is EventInput => entry !== null);

    return [...baseEvents, ...googleEvents];
  }, [appointmentsQuery.data, t]);

  const weeklySummary = useMemo(() => {
    const appointments = appointmentsQuery.data?.appointments ?? [];
    return Array.from({ length: 7 }).map((_, index) => {
      const day = addDays(weekAnchor, index);
      const total = appointments.filter((appointment) =>
        isSameDay(parseISO(appointment.appointmentTime), day),
      ).length;
      return {
        date: day,
        total,
        label: format(day, "EEE d MMM", { locale }),
      };
    });
  }, [appointmentsQuery.data, weekAnchor, locale]);

  const totalWeekAppointments = weeklySummary.reduce((sum, day) => sum + day.total, 0);

  const handleSelect = (selection: DateSelectArg) => {
    setExternalEvent(null);
    setDrawer({ mode: "create", slot: selection.start });
  };

  const handleDateClick = (selection: DateClickArg) => {
    setExternalEvent(null);
    setDrawer({ mode: "create", slot: selection.date });
  };

  const handleEventClick = (event: EventClickArg) => {
    const source = event.event.extendedProps["source"] as string | undefined;
    if (source === "google") {
      setExternalEvent({
        id: event.event.id,
        title: event.event.title ?? "",
        start: event.event.start ?? null,
        end: event.event.end ?? null,
        description: (event.event.extendedProps["notes"] as string | undefined) ?? null,
        location: (event.event.extendedProps["location"] as string | undefined) ?? null,
        link: (event.event.extendedProps["link"] as string | undefined) ?? null,
      });
      setDrawer(null);
      return;
    }
    setExternalEvent(null);
    const appointmentId = Number(event.event.id);
    if (Number.isNaN(appointmentId)) {
      return;
    }
    setDrawer({ mode: "edit", appointmentId });
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const source = info.event.extendedProps["source"] as string | undefined;
    if (source === "google") {
      info.revert();
      return;
    }
    const newStart = info.event.start;
    if (!newStart) {
      info.revert();
      return;
    }
    try {
      await rescheduleMutation.mutateAsync({
        appointmentId: Number(info.event.id),
        payload: { appointmentTime: format(newStart, "yyyy-MM-dd'T'HH:mm:ss") },
      });
    } catch {
      info.revert();
    }
  };

  const parseOptionalNumber = (value: FormDataEntryValue | null): number | null => {
    if (value == null) {
      return null;
    }
    const text = value.toString().trim();
    if (text === "") {
      return null;
    }
    const parsed = Number(text);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleCreateSubmit = async (
    formData: FormData,
    slot: Date,
  ) => {
    const appointmentDate = formData.get("date")
      ? `${formData.get("date")}T${formData.get("time")}:00`
      : `${format(slot, "yyyy-MM-dd")}T${formData.get("time")}:00`;
    const ownerIdValue = parseOptionalNumber(formData.get("ownerId"));
    const petIdValue = parseOptionalNumber(formData.get("petId"));
    const vetIdValue = parseOptionalNumber(formData.get("vetId"));
    const contactTelephoneRaw = formData.get("contactTelephone");
    const contactTelephone =
      contactTelephoneRaw && contactTelephoneRaw.toString().trim().length > 0
        ? contactTelephoneRaw.toString().trim()
        : null;
    const payload: AppointmentRequest = {
      ownerId: ownerIdValue,
      petId: petIdValue,
      appointmentTime: appointmentDate,
      vetId: vetIdValue,
      contactTelephone,
      notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
      clinicalFindings: formData.get("clinicalFindings")
        ? String(formData.get("clinicalFindings"))
        : undefined,
      treatments: formData.get("treatments")
        ? String(formData.get("treatments"))
        : undefined,
      medications: formData.get("medications")
        ? String(formData.get("medications"))
        : undefined,
    };
    await createMutation.mutateAsync(payload);
  };

  const handleDetailSubmit = async (
    detail: AppointmentDetail,
    formData: FormData,
  ) => {
    const vetIdValue = parseOptionalNumber(formData.get("vetId"));
    const contactTelephoneRaw = formData.get("contactTelephone");
    const contactTelephone =
      contactTelephoneRaw && contactTelephoneRaw.toString().trim().length > 0
        ? contactTelephoneRaw.toString().trim()
        : null;
    const payload: AppointmentRequest = {
      ownerId: detail.owner?.id ?? null,
      petId: detail.pet?.id ?? null,
      appointmentTime: detail.appointmentTime,
      vetId: vetIdValue,
      contactTelephone,
      notes: String(formData.get("notes") ?? "") || undefined,
      clinicalFindings: String(formData.get("clinicalFindings") ?? "") || undefined,
      treatments: String(formData.get("treatments") ?? "") || undefined,
      medications: String(formData.get("medications") ?? "") || undefined,
    };
    await updateMutation.mutateAsync({ appointmentId: detail.id, payload });
  };

  const handleUploadRecord = async (
    appointmentId: number,
    payload: AppointmentRecordRequest,
  ) => {
    await uploadRecordMutation.mutateAsync({ appointmentId, payload });
  };

  const handleDeleteRecord = async (appointmentId: number, recordId: number) => {
    await deleteRecordMutation.mutateAsync({ appointmentId, recordId });
  };

  const weekData: AppointmentWeekResponse | undefined = appointmentsQuery.data;


  return (
    <div className="page appointments-page">
      <div className="page-header">
        <div>
          <h1>{t("appointments:page.title")}</h1>
          <p className="muted">{t("appointments:page.subtitle")}</p>
        </div>
        <div className="calendar-controls">
          <div className="view-toggle" style={{ display: "flex", gap: "0.5rem", marginRight: "1rem" }}>
            <button
              className={`button ${viewMode === "calendar" ? "primary" : "secondary"}`}
              onClick={() => setViewMode("calendar")}
            >
              🗓️
            </button>
            <button
              className={`button ${viewMode === "list" ? "primary" : "secondary"}`}
              onClick={() => setViewMode("list")}
            >
              ☰
            </button>
          </div>
          <button
            className="button secondary calendar-previous"
            onClick={() => setWeekAnchor((prev) => addWeeks(prev, -1))}
          >
            {t("appointments:page.controls.previous")}
          </button>
          <div className="week-indicator">
            {t("appointments:page.controls.weekRange", {
              start: formatWithLocale(weekAnchor, "dd MMM"),
              end: formatWithLocale(weekEnd, "dd MMM yyyy"),
            })}
          </div>
          <button
            className="button secondary calendar-next"
            onClick={() => setWeekAnchor((prev) => addWeeks(prev, 1))}
          >
            {t("appointments:page.controls.next")}
          </button>
        </div>
      </div>

      <section className="weekly-summary card">
        <div className="weekly-summary__header">
          <h2>{t("appointments:page.summary.title")}</h2>
          {totalWeekAppointments > 0 && (
            <span className="weekly-summary__count">
              {t("appointments:page.summary.appointments", {
                count: totalWeekAppointments,
              })}
            </span>
          )}
        </div>
        {totalWeekAppointments === 0 ? (
          <p className="muted">{t("appointments:page.summary.empty")}</p>
        ) : (
          <div className="weekly-summary__strip">
            {weeklySummary.map((day) => (
              <div key={day.label} className="weekly-summary__item">
                <span className="weekly-summary__label">{day.label}</span>
                <strong className="weekly-summary__value">{day.total}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      {unsyncedCount > 0 && (
        <div className={`auto-sync-hint${autoSyncState === "running" ? " active" : ""}`}>
          <span>
            {autoSyncState === "running"
              ? t("appointments:page.autoSync.running", { count: unsyncedCount })
              : t("appointments:page.autoSync.pending", { count: unsyncedCount })}
          </span>
          {lastAutoSync && (
            <span className="auto-sync-meta">
              {t("appointments:page.autoSync.lastAttempt", {
                time: new Date(lastAutoSync).toLocaleTimeString(localeCode, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </span>
          )}
        </div>
      )}

      <section className="card calendar-card">
        {viewMode === "calendar" ? (
          <>
            <div className="calendar-timeframes">
              {TIMEFRAMES.map((frame) => {
                const label = t(`appointments:page.timeframes.${frame.id}.label`);
                const range = t(`appointments:page.timeframes.${frame.id}.range`);
                return (
                  <div
                    key={frame.id}
                    className={`timeframe-chip timeframe-${frame.id}${nowFrame?.id === frame.id ? " active" : ""
                      }`}
                  >
                    <span className="timeframe-label">{label}</span>
                    <span className="timeframe-range">{range}</span>
                  </div>
                );
              })}
            </div>
            <div className="calendar-main">
              <div className="calendar-schedule">
                {appointmentsQuery.isLoading ? (
                  <div style={{ padding: "1rem" }}>
                    <Skeleton width="100%" height={600} />
                  </div>
                ) : appointmentsQuery.isError ? (
                  <ErrorBanner message={t("appointments:page.calendar.error")} />
                ) : (
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                    initialView={initialView}
                    initialDate={weekAnchor}
                    firstDay={1}
                    locales={[enGbCalendarLocale, elCalendarLocale]}
                    locale={calendarLocale}
                    headerToolbar={headerToolbar}
                    buttonText={buttonText}
                    height="auto"
                    nowIndicator
                    stickyHeaderDates
                    weekends
                    selectable
                    selectMirror
                    slotDuration="00:30"
                    slotMinTime="08:00:00"
                    slotMaxTime="21:00:00"
                    scrollTime="08:00:00"
                    allDaySlot={false}
                    slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                    events={calendarEvents}
                    select={handleSelect}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    editable
                    eventDurationEditable={false}
                    eventOverlap
                    datesSet={(info) => {
                      // Prevent infinite loop by checking if the view actually changed significantly
                      if (info.view.type !== initialView) {
                        setCurrentView(info.view.type);
                      }

                      // Only update anchor if the start date has changed by at least a day
                      if (info.view.type.includes("timeGrid") || info.view.type === "dayGridWeek") {
                        const nextAnchor = startOfWeek(info.start, { weekStartsOn: 1 });
                        // Use a tolerance of > 1 hour to detect actual week changes vs timezone shifts
                        const diffTime = Math.abs(nextAnchor.getTime() - weekAnchor.getTime());
                        if (diffTime > 1000 * 60 * 60 * 2) {
                          setWeekAnchor(nextAnchor);
                        }
                      }
                    }}
                    eventClassNames={(info) =>
                      [
                        "calendar-event",
                        info.event.extendedProps["synced"] ? "synced" : "unsynced",
                        info.event.extendedProps["source"] === "google" ? "google" : "local",
                      ]
                    }
                    eventContent={(info) => {
                      const source = info.event.extendedProps["source"] as string | undefined;
                      const ownerName =
                        (info.event.extendedProps["ownerName"] as string | undefined) ??
                        (source === "google"
                          ? t("appointments:page.event.googleFallback")
                          : t("appointments:page.event.ownerFallback"));
                      const startTime = info.event.start ? format(info.event.start, "HH:mm") : "";
                      const vetName = info.event.extendedProps["vetName"] as string | undefined;
                      const tooltip = [info.event.title, startTime, ownerName, vetName]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <div className="calendar-event-content" title={tooltip}>
                          <span className="calendar-event-pill" />
                          <div className="calendar-event-details">
                            <strong>{info.event.title}</strong>
                            <div className="calendar-event-meta">
                              {startTime} · {ownerName}
                              {vetName ? (
                                <span className="calendar-event-meta-vet">
                                  {t("appointments:page.event.vetLabel", { vet: vetName })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <AppointmentsList
            appointments={appointmentsQuery.data?.appointments ?? []}
            onEdit={(id) => setDrawer({ mode: "edit", appointmentId: id })}
          />
        )}
      </section>

      {weekData && weekData.appointments.length === 0 && !appointmentsQuery.isLoading && (
        <section className="card hint-card">
          <EmptyState
            icon="🗓️"
            title={t("appointments:page.emptyState.title")}
            message={t("appointments:page.emptyState.message")}
          />
        </section>
      )}

      {externalEvent ? (
        <ExternalEventDrawer
          event={externalEvent}
          locale={locale}
          onClose={() => setExternalEvent(null)}
        />
      ) : (
        <AppointmentDrawer
          drawer={drawer}
          onClose={() => setDrawer(null)}
          onCreate={handleCreateSubmit}
          onSave={handleDetailSubmit}
          onDelete={(id) => deleteMutation.mutate(id)}

          appointmentDetail={appointmentDetailQuery.data}
          createError={createError}
          saveError={saveError}
          owners={owners}
          selectedOwnerId={ownerId}
          onOwnerChange={(id) => setOwnerId(id)}
          ownerDetail={selectedOwner}
          vets={vets}
          vetsLoading={vetsQuery.isLoading}
          vetsError={vetsQuery.isError}
          selectedVetId={vetId}
          onVetChange={setVetId}
          healthRecordTypes={HEALTH_RECORD_TYPES}
          onRecordUpload={handleUploadRecord}
          onRecordDelete={handleDeleteRecord}
          creating={createMutation.isPending}
          saving={updateMutation.isPending}
          deleting={deleteMutation.isPending}
          uploadPending={uploadRecordMutation.isPending}
          deleteRecordPending={deleteRecordMutation.isPending}
        />
      )}
    </div>
  );
}
