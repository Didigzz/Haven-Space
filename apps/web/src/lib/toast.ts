import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  /** Stable id — required for stacking + dismissal. */
  id: string;
  tone: ToastTone;
  message: ReactNode;
  /** Overrides the default auto-dismiss duration (ms). */
  duration?: number;
  /** Optional action button (e.g. "View dashboard"). */
  action?: { label: string; onClick: () => void };
}

export interface PendingToast {
  tone: ToastTone;
  message: string;
  duration?: number;
}

const PENDING_KEY = 'haven_toast_pending';
const TONES: readonly ToastTone[] = ['success', 'error', 'info', 'warning'];

/**
 * Stash a toast that should appear after the next navigation (login/logout
 * redirects). Call this BEFORE `navigate()`. The ToastHost mounted in the root
 * layout picks it up on the destination page.
 */
export function setPendingToast(tone: ToastTone, message: string, duration?: number): void {
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ tone, message, duration } satisfies PendingToast)
    );
  } catch {
    // Storage unavailable (private mode, quota) — the auth flow still works,
    // the toast is just skipped.
  }
}

/**
 * Read + clear the pending toast, validating its shape. Returns null when
 * nothing (or something malformed) is stored.
 */
export function readPendingToast(): PendingToast | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_KEY);
    if (raw !== null) sessionStorage.removeItem(PENDING_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingToast>;
    if (typeof parsed.tone !== 'string' || !TONES.includes(parsed.tone as ToastTone)) return null;
    if (typeof parsed.message !== 'string' || !parsed.message.trim()) return null;
    return {
      tone: parsed.tone as ToastTone,
      message: parsed.message,
      duration: typeof parsed.duration === 'number' ? parsed.duration : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Hook for the global ToastHost: returns the pending toast for the current
 * navigation. Re-reads on mount and on every route change, so a toast stashed
 * before `navigate()` is picked up once on the destination page.
 */
export function usePendingToast(): PendingToast | null {
  const location = useLocation();
  const [pending, setPending] = useState<PendingToast | null>(null);

  useEffect(() => {
    setPending(readPendingToast());
  }, [location.href]);

  return pending;
}
