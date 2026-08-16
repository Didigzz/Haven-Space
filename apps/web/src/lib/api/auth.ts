import { getApiBaseUrl } from '../config';
import type {
  CheckEmailResponse,
  ForgotPasswordResponse,
  LoginResponse,
  MeResponse,
  RegisterInput,
  RegisterResponse,
  ResetResponse,
  VerifyResetCodeResponse,
} from '../types';
import { apiFetch } from './http';

const base = () => getApiBaseUrl();

export function checkEmail(email: string): Promise<CheckEmailResponse> {
  return apiFetch<CheckEmailResponse>(base(), '/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(base(), '/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>(base(), '/auth/register', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(input),
  });
}

export function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>(base(), '/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/change-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>(base(), '/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyResetCode(email: string, code: string): Promise<VerifyResetCodeResponse> {
  return apiFetch<VerifyResetCodeResponse>(base(), '/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function resendResetCode(email: string): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>(base(), '/auth/resend-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  email: string,
  requestId: number,
  newPassword: string
): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, request_id: requestId, new_password: newPassword }),
  });
}

export function refreshToken(): Promise<{ access_token: string }> {
  return apiFetch(base(), '/auth/refresh-token', { method: 'POST', credentials: 'include' });
}

export function logout(): Promise<ResetResponse> {
  return apiFetch<ResetResponse>(base(), '/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
