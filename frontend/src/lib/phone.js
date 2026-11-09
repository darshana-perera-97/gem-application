const PHONE_PATTERN = /^\+\d{8,15}$/;

export function isValidPhoneNumber(value) {
  return PHONE_PATTERN.test(String(value || '').trim());
}

export function hasVerifiedPhone(profile) {
  return Boolean(profile?.phoneVerified && isValidPhoneNumber(profile?.phone));
}
