import type {
  AuthResponse,
  AppointmentDetail,
  AppointmentWeekResponse,
  AppointmentRecordRequest,
  OwnerDetail,
  OwnerRequest,
  OwnerSummary,
  PetDetail,
  PetRequest,
  ProfileResponse,
  ProfileUpdateRequest,
  RegistrationRequest,
  RescheduleRequest,
  VetDto,
  VetRequest,
  SpecialtyOption,
  LocalizedPetType,
  VisitRequest,
  AppointmentRequest,
  AuthUser,
  PetHealthRecordCreateRequest,
  ClinicInfo,
  AdminUserSummary,
  RoleUpdateRequest,
} from "./types";

const API_BASE = "/api";

export interface ApiError extends Error {
  status: number;
  details?: unknown;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || undefined);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = response.statusText || "Request failed";
    let details: unknown;
    try {
      const data = await response.json();
      if (typeof data === "string") {
        errorMessage = data;
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        details = data;
      }
    } catch {
      // ignore json parsing errors
    }
    const error = new Error(errorMessage) as ApiError;
    error.status = response.status;
    error.details = details;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    apiFetch<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<AuthResponse>("/auth/me"),
  register: (payload: RegistrationRequest) =>
    apiFetch<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    apiFetch<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
};

export const ownersApi = {
  list: (lastName?: string) => {
    const query = lastName ? `?lastName=${encodeURIComponent(lastName)}` : "";
    return apiFetch<OwnerSummary[]>(`/owners${query}`);
  },
  get: (ownerId: number) => apiFetch<OwnerDetail>(`/owners/${ownerId}`),
  create: (payload: OwnerRequest) =>
    apiFetch<OwnerDetail>("/owners", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (ownerId: number, payload: OwnerRequest) =>
    apiFetch<OwnerDetail>(`/owners/${ownerId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  createPet: (ownerId: number, payload: PetRequest) =>
    apiFetch(`/owners/${ownerId}/pets`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePet: (ownerId: number, petId: number, payload: PetRequest) =>
    apiFetch(`/owners/${ownerId}/pets/${petId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  addVisit: (ownerId: number, petId: number, payload: VisitRequest) =>
    apiFetch(`/owners/${ownerId}/pets/${petId}/visits`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addHealthRecord: (
    ownerId: number,
    petId: number,
    payload: PetHealthRecordCreateRequest,
  ) => {
    const formData = new FormData();
    formData.append("type", payload.type);
    if (payload.title) {
      formData.append("title", payload.title);
    }
    if (payload.notes) {
      formData.append("notes", payload.notes);
    }
    if (payload.recordDate) {
      formData.append("recordDate", payload.recordDate);
    }
    if (payload.weightKg) {
      formData.append("weightKg", payload.weightKg);
    }
    if (payload.temperatureC) {
      formData.append("temperatureC", payload.temperatureC);
    }
    if (payload.heartRate) {
      formData.append("heartRate", payload.heartRate);
    }
    if (payload.respirationRate) {
      formData.append("respirationRate", payload.respirationRate);
    }
    if (payload.additionalMetrics) {
      formData.append("additionalMetrics", payload.additionalMetrics);
    }
    if (payload.files && payload.files.length > 0) {
      payload.files.forEach((file) => formData.append("files", file));
    }
    return apiFetch<PetDetail>(`/owners/${ownerId}/pets/${petId}/records`, {
      method: "POST",
      body: formData,
    });
  },
  deleteHealthRecord: (ownerId: number, petId: number, recordId: number) =>
    apiFetch<PetDetail>(`/owners/${ownerId}/pets/${petId}/records/${recordId}`, {
      method: "DELETE",
    }),
  updateHealthRecord: (
    ownerId: number,
    petId: number,
    recordId: number,
    payload: PetHealthRecordCreateRequest,
  ) =>
    apiFetch<PetDetail>(`/owners/${ownerId}/pets/${petId}/records/${recordId}`, {
      method: "PUT",
      body: JSON.stringify({
        type: payload.type,
        title: payload.title ?? null,
        notes: payload.notes ?? null,
        recordDate: payload.recordDate ?? null,
        weightKg: payload.weightKg ?? null,
        temperatureC: payload.temperatureC ?? null,
        heartRate: payload.heartRate ?? null,
        respirationRate: payload.respirationRate ?? null,
        additionalMetrics: payload.additionalMetrics ?? null,
      }),
    }),
  deletePet: (ownerId: number, petId: number) =>
    apiFetch<void>(`/owners/${ownerId}/pets/${petId}`, { method: "DELETE" }),
  deleteOwner: (ownerId: number) => apiFetch<void>(`/owners/${ownerId}`, { method: "DELETE" }),
};

export const appointmentsApi = {
  list: (week?: string) => {
    const query = week ? `?week=${encodeURIComponent(week)}` : "";
    return apiFetch<AppointmentWeekResponse>(`/appointments${query}`);
  },
  get: (appointmentId: number) =>
    apiFetch<AppointmentDetail>(`/appointments/${appointmentId}`),
  create: (payload: AppointmentRequest) =>
    apiFetch<AppointmentDetail>("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (appointmentId: number, payload: AppointmentRequest) =>
    apiFetch<AppointmentDetail>(`/appointments/${appointmentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  reschedule: (appointmentId: number, payload: RescheduleRequest) =>
    apiFetch<AppointmentDetail>(`/appointments/${appointmentId}/reschedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  uploadRecord: (appointmentId: number, payload: AppointmentRecordRequest) => {
    const formData = new FormData();
    formData.append("type", payload.type);
    if (payload.title) {
      formData.append("title", payload.title);
    }
    if (payload.notes) {
      formData.append("notes", payload.notes);
    }
    if (payload.recordDate) {
      formData.append("recordDate", payload.recordDate);
    }
    if (payload.weightKg) {
      formData.append("weightKg", payload.weightKg);
    }
    if (payload.temperatureC) {
      formData.append("temperatureC", payload.temperatureC);
    }
    if (payload.heartRate) {
      formData.append("heartRate", payload.heartRate);
    }
    if (payload.respirationRate) {
      formData.append("respirationRate", payload.respirationRate);
    }
    if (payload.additionalMetrics) {
      formData.append("additionalMetrics", payload.additionalMetrics);
    }
    if (payload.files && payload.files.length > 0) {
      payload.files.forEach((file) => formData.append("files", file));
    }
    return apiFetch<AppointmentDetail>(`/appointments/${appointmentId}/records`, {
      method: "POST",
      body: formData,
    });
  },
  deleteRecord: (appointmentId: number, recordId: number) =>
    apiFetch<AppointmentDetail>(`/appointments/${appointmentId}/records/${recordId}`, {
      method: "DELETE",
    }),
  remove: (appointmentId: number) =>
    apiFetch<{ appointmentId: number; calendarLinked: boolean; googleEventDeleted: boolean }>(
      `/appointments/${appointmentId}`,
      { method: "DELETE" },
    ),
};

export const adminUsersApi = {
  pending: () => apiFetch<AdminUserSummary[]>("/admin/users/pending"),
  active: () => apiFetch<AdminUserSummary[]>("/admin/users/active"),
  approve: (userId: number) =>
    apiFetch<AdminUserSummary>(`/admin/users/${userId}/approve`, { method: "POST" }),
  deactivate: (userId: number) =>
    apiFetch<AdminUserSummary>(`/admin/users/${userId}/deactivate`, { method: "POST" }),
  blacklisted: () => apiFetch<AdminUserSummary[]>("/admin/users/blacklisted"),
  blacklist: (userId: number) =>
    apiFetch<AdminUserSummary>(`/admin/users/${userId}/blacklist`, { method: "POST" }),
  reinstate: (userId: number) =>
    apiFetch<AdminUserSummary>(`/admin/users/${userId}/reinstate`, { method: "POST" }),
  remove: (userId: number) =>
    apiFetch<void>(`/admin/users/${userId}`, { method: "DELETE" }),
  updateRoles: (userId: number, payload: RoleUpdateRequest) =>
    apiFetch<AdminUserSummary>(`/admin/users/${userId}/roles`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const profileApi = {
  get: () => apiFetch<ProfileResponse>("/profile"),
  update: (payload: ProfileUpdateRequest) =>
    apiFetch<ProfileResponse>("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  connectGoogle: () =>
    apiFetch<{ authorizationUrl: string; state: string }>("/profile/google/connect", {
      method: "POST",
    }),
  disconnectGoogle: () =>
    apiFetch<ProfileResponse>("/profile/google/disconnect", {
      method: "POST",
    }),
};

export const vetsApi = {
  list: () => apiFetch<VetDto[]>("/vets"),
  create: (payload: VetRequest) =>
    apiFetch<VetDto>("/vets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (vetId: number, payload: VetRequest) =>
    apiFetch<VetDto>(`/vets/${vetId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (vetId: number) => apiFetch<void>(`/vets/${vetId}`, { method: "DELETE" }),
  specialties: () => apiFetch<SpecialtyOption[]>("/vets/specialties"),
};

export const petTypesApi = {
  list: () => apiFetch<LocalizedPetType[]>("/pet-types"),
};

export const clinicApi = {
  info: () => apiFetch<ClinicInfo>("/clinic/info"),
};

export interface DashboardResponse {
  upcomingAppointments: DashboardAppointment[];
  contactReminders: DashboardAppointment[];
  stats: {
    today: number;
    week: number;
    contactGaps: number;
  };
}

export interface DashboardAppointment {
  id: number | null;
  time: string;
  petName: string;
  petType: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  missingEmail: boolean;
  missingPhone: boolean;
}

export const dashboardApi = {
  get: () => apiFetch<DashboardResponse>("/dashboard"),
};

export { type AuthUser };
