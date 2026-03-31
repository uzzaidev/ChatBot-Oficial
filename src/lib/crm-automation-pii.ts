export const maskPhone = (phone: string | null): string => {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  const prefix = digits.substring(0, 4);
  const suffix = digits.substring(digits.length - 4);
  return `${prefix} ***${suffix}`;
};

export const maskContactInResult = (
  result: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  if (!result) return null;

  const next = { ...result };
  if (typeof next.phone === "string") {
    next.phone = maskPhone(next.phone);
  }
  if (typeof next.contact_phone === "string") {
    next.contact_phone = maskPhone(next.contact_phone);
  }
  return next;
};
