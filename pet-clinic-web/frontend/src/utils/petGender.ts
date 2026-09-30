import type { PetGender } from "../api/types";

export const PET_GENDER_VALUES: ReadonlyArray<PetGender> = ["MALE", "FEMALE"];

export const PET_GENDER_SYMBOLS: Record<PetGender, string> = {
  MALE: "♂",
  FEMALE: "♀",
};
