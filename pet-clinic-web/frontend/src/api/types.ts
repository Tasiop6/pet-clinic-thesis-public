export type UserRole = "SUPERADMIN" | "CLINIC_OWNER" | "VET" | "STAFF";

export interface AuthUser {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  active: boolean;
  admin: boolean;
  roles: UserRole[];
  vetId: number | null;
}

export interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
  message?: string | null;
}

export interface OwnerSummary {
  id: number;
  firstName: string;
  lastName: string;
  city: string | null;
  telephone: string | null;
  email: string | null;
  pets: PetSummary[];
}

export interface OwnerDetail {
  id: number;
  firstName: string;
  lastName: string;
  address: string | null;
  city: string | null;
  telephone: string | null;
  email: string | null;
  pets: PetDetail[];
}

export type PetGender = "MALE" | "FEMALE";

export interface PetSummary {
  id: number;
  name: string;
  type: string | null;
  gender: PetGender | null;
}

export interface PetDetail {
  id: number;
  name: string;
  gender: PetGender | null;
  birthDate: string | null;
  type: PetTypeDto | null;
  visits: VisitDto[];
  healthRecords: Record<PetHealthRecordType, PetHealthRecordDto[]>;
}

export interface PetTypeDto {
  id: number;
  name: string;
}

export interface VisitDto {
  id: number;
  date: string;
  description: string | null;
}

export type PetHealthRecordType =
  | "VITALS"
  | "XRAY"
  | "BLOOD_WORK"
  | "PRESCRIPTION"
  | "EXAM_NOTE"
  | "OTHER";

export interface PetHealthRecordDto {
  id: number;
  title: string | null;
  notes: string | null;
  recordedAt: string | null;
  weightKg: number | null;
  temperatureC: number | null;
  heartRate: number | null;
  respirationRate: number | null;
  additionalMetrics: string | null;
  documentName: string | null;
  documentContentType: string | null;
  documentSize: number | null;
  downloadUrl: string | null;
}

export interface OwnerRequest {
  firstName: string;
  lastName: string;
  address?: string | null;
  city?: string | null;
  telephone?: string | null;
  email?: string | null;
}

export interface PetRequest {
  name: string;
  petTypeId: number;
  gender: PetGender;
  birthDate?: string | null;
}

export interface VisitRequest {
  date: string;
  description?: string | null;
}

export interface AppointmentRequest {
  ownerId?: number | null;
  petId?: number | null;
  appointmentTime: string;
  vetId?: number | null;
  contactTelephone?: string | null;
  notes?: string | null;
  clinicalFindings?: string | null;
  treatments?: string | null;
  medications?: string | null;
}

export interface AppointmentDetail {
  id: number;
  appointmentTime: string;
  owner: AppointmentOwner | null;
  pet: AppointmentPet | null;
  vet: AppointmentVet | null;
  contactTelephone: string | null;
  notes: string | null;
  clinicalFindings: string | null;
  treatments: string | null;
  medications: string | null;
  synced: boolean;
  records: PetHealthRecordDto[];
}

export interface AppointmentOwner {
  id: number;
  name: string | null;
  email: string | null;
  telephone: string | null;
}

export interface AppointmentPet {
  id: number;
  name: string | null;
  type: string | null;
  gender: PetGender | null;
}

export interface AppointmentVet {
  id: number;
  name: string | null;
  email: string | null;
}

export interface AppointmentWeekResponse {
  weekStart: string;
  weekEnd: string;
  appointments: AppointmentSummary[];
  bookedSlots: Record<string, string[]>;
  calendarLinked: boolean;
  calendarFetchFailed: boolean;
  googleEvents: GoogleCalendarEvent[];
}

export interface AppointmentSummary {
  id: number;
  appointmentTime: string;
  pet: AppointmentPet | null;
  owner: AppointmentOwner | null;
  vet: AppointmentVet | null;
  contactTelephone: string | null;
  notes: string | null;
  synced: boolean;
}

export interface GoogleCalendarEvent {
  id: string | null;
  summary: string | null;
  description: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  htmlLink?: string | null;
}

export interface RescheduleRequest {
  appointmentTime: string;
}

export interface AppointmentRecordRequest {
  type: PetHealthRecordType;
  title?: string | null;
  notes?: string | null;
  recordDate?: string | null;
  files: File[];
  weightKg?: string | null;
  temperatureC?: string | null;
  heartRate?: string | null;
  respirationRate?: string | null;
  additionalMetrics?: string | null;
}

export interface PetHealthRecordCreateRequest {
  type: PetHealthRecordType;
  title?: string | null;
  notes?: string | null;
  recordDate?: string | null;
  files: File[];
  weightKg?: string | null;
  temperatureC?: string | null;
  heartRate?: string | null;
  respirationRate?: string | null;
  additionalMetrics?: string | null;
}

export interface ProfileResponse {
  displayName: string | null;
  email: string | null;
  active: boolean;
  calendarLinked: boolean;
  calendarEmail: string | null;
  oauthConfigured: boolean;
}

export interface AdminUserSummary {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  active: boolean;
  admin: boolean;
  blacklisted: boolean;
  roles: UserRole[];
  vetId: number | null;
  vetName: string | null;
}

export interface RoleUpdateRequest {
  roles: UserRole[];
  vetId: number | null;
}

export interface ProfileUpdateRequest {
  displayName?: string | null;
  email?: string | null;
}

export interface VetDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  specialties: string[];
  specialtyIds: number[];
  displayName: string;
}

export interface VetRequest {
  firstName: string;
  lastName: string;
  email: string;
  specialtyIds: number[];
}

export interface SpecialtyOption {
  id: number;
  name: string;
}

export interface LocalizedPetType {
  id: number;
  code: string;
  displayName: string;
  description: string;
  icon: string;
}

export interface ClinicInfo {
  name: string;
  vat: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  vetName: string;
  license: string;
}

export interface RegistrationRequest {
  username: string;
  password: string;
  displayName?: string | null;
  email?: string | null;
}
