import { ContactMetadata } from "@/lib/types";

export const checkSlotsFilled = (
  metadata: ContactMetadata | null | undefined,
  required: string[],
): boolean => {
  if (!required || required.length === 0) return true;
  if (!metadata) return false;
  return required.every(
    (slot) =>
      metadata[slot] !== undefined &&
      metadata[slot] !== null &&
      metadata[slot] !== "",
  );
};

export const getMissingSlots = (
  metadata: ContactMetadata | null | undefined,
  required: string[],
): string[] => {
  if (!required || required.length === 0) return [];
  if (!metadata) return required;
  return required.filter(
    (slot) =>
      metadata[slot] === undefined ||
      metadata[slot] === null ||
      metadata[slot] === "",
  );
};

export const getCollectedSlots = (
  metadata: ContactMetadata | null | undefined,
  required: string[],
): string[] => {
  if (!required || required.length === 0) return [];
  if (!metadata) return [];
  return required.filter(
    (slot) =>
      metadata[slot] !== undefined &&
      metadata[slot] !== null &&
      metadata[slot] !== "",
  );
};
