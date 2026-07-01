import type { TFunction } from 'i18next';

function getMessage(error: unknown): string {
  if (!error) return '';

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }

  return '';
}

function includesAny(message: string, needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

export function translateAuthError(error: unknown, t: TFunction): string {
  const message = getMessage(error);

  if (!message.trim()) {
    return t('auth.errors.generic');
  }

  if (includesAny(message, ['Invalid login credentials'])) {
    return t('auth.errors.invalidLoginCredentials');
  }

  if (includesAny(message, ['Email not confirmed'])) {
    return t('auth.errors.emailNotConfirmed');
  }

  if (
    includesAny(message, [
      'User already registered',
      'already registered',
      'already exists',
      'email address is already registered',
    ])
  ) {
    return t('auth.errors.emailAlreadyRegistered');
  }

  if (includesAny(message, ['Signup is disabled', 'Signups not allowed'])) {
    return t('auth.errors.signupDisabled');
  }

  if (includesAny(message, ['invalid email', 'email address is invalid'])) {
    return t('auth.invalidEmailMessage');
  }

  if (
    includesAny(message, [
      'Password should be at least',
      'Password must be at least',
      'weak password',
      'password is too short',
    ])
  ) {
    return t('auth.errors.passwordTooShort');
  }

  if (
    includesAny(message, [
      'otp expired',
      'token has expired',
      'expired',
      'email link is invalid or has expired',
    ])
  ) {
    return t('auth.errors.codeExpired');
  }

  if (
    includesAny(message, [
      'invalid otp',
      'invalid token',
      'token is invalid',
      'invalid code',
      'otp is invalid',
    ])
  ) {
    return t('auth.errors.invalidCode');
  }

  if (
    includesAny(message, [
      'rate limit',
      'too many requests',
      'email rate limit exceeded',
      'over email send rate limit',
    ])
  ) {
    return t('auth.errors.tooManyRequests');
  }

  if (
    includesAny(message, [
      'network request failed',
      'failed to fetch',
      'network error',
      'fetch failed',
    ])
  ) {
    return t('auth.errors.network');
  }

  return message;
}
