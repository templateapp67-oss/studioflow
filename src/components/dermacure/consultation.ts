/** Passed in memory only; the existing checkout remains authoritative. */
export interface ConsultationDetails {
  name: string;
  phone: string;
  date: string;
  time: string;
  stylistId: string;
  message: string;
}
export const consultationPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith("0")
      ? digits.slice(1)
      : digits;
};
