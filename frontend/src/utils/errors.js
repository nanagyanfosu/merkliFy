const FRIENDLY_MESSAGES = [
  ["Invalid or expired token", "Your session has expired. Please sign in again."],
  ["Malformed token subject", "Your session is invalid. Please sign in again."],
  ["User not found", "We couldn't find your account. Please sign in again."],
  ["Admin role required", "You do not have permission to perform this action."],
  ["Issuer role required", "You do not have permission to perform this action."],
  ["Database constraint error", "Some information conflicts with existing records. Please check your details and try again."],
  ["Internal cryptographic error", "We couldn't complete this secure operation. Please try again or contact support."],
  ["no signing key", "This institution is not ready to issue certificates yet. Please contact an administrator."],
  ["Invalid status", "That status update is not available. Please refresh and try again."],
  ["Cannot transition certificate", "This certificate cannot be moved to that status."],
];

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail ?? error?.message;
  const text = typeof detail === "string" ? detail : detail?.message;

  if (!text) return fallback;

  const match = FRIENDLY_MESSAGES.find(([technical]) => text.includes(technical));
  return match ? match[1] : text;
}
