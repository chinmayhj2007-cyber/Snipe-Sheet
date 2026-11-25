export type UserRole = 'bidder' | 'seller' | 'admin';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CountryCodeOption {
  code: string;
  dialCode: string;
  label: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: 'IN', dialCode: '+91', label: 'India (+91)' },
  { code: 'US', dialCode: '+1', label: 'United States (+1)' },
  { code: 'GB', dialCode: '+44', label: 'United Kingdom (+44)' },
  { code: 'AE', dialCode: '+971', label: 'UAE (+971)' },
  { code: 'SG', dialCode: '+65', label: 'Singapore (+65)' },
  { code: 'AU', dialCode: '+61', label: 'Australia (+61)' },
  { code: 'DE', dialCode: '+49', label: 'Germany (+49)' },
  { code: 'JP', dialCode: '+81', label: 'Japan (+81)' },
];

export type PasswordStrengthLevel = 'Weak' | 'Medium' | 'Strong' | 'Very Strong';

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  score: 1 | 2 | 3 | 4;
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  suggestions: string[];
}

export function normalizeRole(value: unknown): UserRole {
  if (value === 'admin') return 'admin';
  if (value === 'seller') return 'seller';
  return 'bidder';
}

export function validateEmail(
  rawEmail: string
): { valid: true; email: string } | { valid: false; message: string } {
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return { valid: false, message: 'Please enter your email address.' };
  }
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }
  return { valid: true, email };
}

export function validatePhoneNumber(
  dialCode: string,
  rawNumber: string
): { valid: true; e164: string; formatted: string } | { valid: false; message: string } {
  const cleanDial = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  const digits = rawNumber.replace(/\D/g, '');

  if (!digits) {
    return { valid: false, message: 'Please enter your mobile number.' };
  }

  if (cleanDial === '+91') {
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        valid: false,
        message: 'Please enter a valid 10-digit Indian mobile number.',
      };
    }
    return {
      valid: true,
      e164: `+91${digits}`,
      formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
    };
  }

  if (digits.length < 7 || digits.length > 15) {
    return {
      valid: false,
      message: 'Please enter a valid mobile number (7 to 15 digits).',
    };
  }

  return {
    valid: true,
    e164: `${cleanDial}${digits}`,
    formatted: `${cleanDial} ${digits}`,
  };
}

export function validateOtpCode(
  rawCode: string
): { valid: true; code: string } | { valid: false; message: string } {
  const code = rawCode.replace(/\D/g, '');
  if (code.length !== 6) {
    return { valid: false, message: 'Please enter the 6-digit verification code.' };
  }
  return { valid: true, code };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const suggestions: string[] = [];
  if (!checks.minLength) {
    suggestions.push(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!checks.uppercase) {
    suggestions.push('Add an uppercase letter (A-Z)');
  }
  if (!checks.lowercase) {
    suggestions.push('Add a lowercase letter (a-z)');
  }
  if (!checks.number) {
    suggestions.push('Include a number (0-9)');
  }
  if (!checks.special) {
    suggestions.push('Include a special character (!@#$...)');
  }

  const charClassesMet = [
    checks.uppercase,
    checks.lowercase,
    checks.number,
    checks.special,
  ].filter(Boolean).length;

  let score: 1 | 2 | 3 | 4 = 1;
  let level: PasswordStrengthLevel = 'Weak';

  if (!checks.minLength || charClassesMet <= 1) {
    score = 1;
    level = 'Weak';
  } else if (charClassesMet === 2) {
    score = 2;
    level = 'Medium';
  } else if (charClassesMet === 3 || (charClassesMet === 4 && password.length < 10)) {
    score = 3;
    level = 'Strong';
    if (charClassesMet === 4 && password.length < 10) {
      suggestions.push('Use 10+ characters for Very Strong');
    }
  } else {
    score = 4;
    level = 'Very Strong';
  }

  return {
    level,
    score,
    checks,
    suggestions,
  };
}

export function validatePassword(
  password: string,
  options: { enforceLength?: boolean } = { enforceLength: true }
): { valid: true } | { valid: false; message: string } {
  if (!password) {
    return { valid: false, message: 'Please enter your password.' };
  }
  if (options.enforceLength !== false && password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
    };
  }
  return { valid: true };
}

export function validateSignUpInput(input: {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}): { valid: true; email: string; role: UserRole } | { valid: false; message: string } {
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) return emailCheck;

  const passwordCheck = validatePassword(input.password, { enforceLength: true });
  if (!passwordCheck.valid) return passwordCheck;

  if (input.password !== input.confirmPassword) {
    return { valid: false, message: 'Passwords do not match.' };
  }

  // Public self-signup only permits bidder or seller; admin accounts must be provisioned server-side
  const safeRole: UserRole = input.role === 'seller' ? 'seller' : 'bidder';

  return {
    valid: true,
    email: emailCheck.email,
    role: safeRole,
  };
}
