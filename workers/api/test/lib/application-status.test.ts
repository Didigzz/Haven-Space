import { describe, expect, it } from 'bun:test';

import {
  allowedTransitions,
  APPLICATION_STATUSES,
  canTransition,
  isApplicationStatus,
  isTerminalStatus,
} from '../../src/lib/application-status';

describe('application status state machine', () => {
  it('declares the full lifecycle statuses', () => {
    expect(APPLICATION_STATUSES).toEqual([
      'pending',
      'accepted',
      'confirmed',
      'ended',
      'rejected',
      'cancelled',
    ]);
  });

  it('walks the happy path pending -> accepted -> confirmed -> ended', () => {
    expect(canTransition('pending', 'accepted')).toBe(true);
    expect(canTransition('accepted', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'ended')).toBe(true);
  });

  it('allows a landlord to reject a pending application', () => {
    expect(canTransition('pending', 'rejected')).toBe(true);
  });

  it('allows a boarder to withdraw pending and accepted applications', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('accepted', 'cancelled')).toBe(true);
  });

  it('never skips a step', () => {
    expect(canTransition('pending', 'confirmed')).toBe(false);
    expect(canTransition('pending', 'ended')).toBe(false);
    expect(canTransition('accepted', 'ended')).toBe(false);
    expect(canTransition('confirmed', 'accepted')).toBe(false);
    expect(canTransition('confirmed', 'cancelled')).toBe(false);
  });

  it('treats ended, rejected, and cancelled as terminal', () => {
    expect(isTerminalStatus('ended')).toBe(true);
    expect(isTerminalStatus('rejected')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('pending')).toBe(false);
    expect(isTerminalStatus('accepted')).toBe(false);
    expect(isTerminalStatus('confirmed')).toBe(false);

    for (const from of ['ended', 'rejected', 'cancelled']) {
      for (const to of APPLICATION_STATUSES) {
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(false);
      }
    }
  });

  it('rejects unknown statuses everywhere', () => {
    expect(isApplicationStatus('submitted')).toBe(false);
    expect(canTransition('pending', 'submitted')).toBe(false);
    expect(canTransition('submitted', 'accepted')).toBe(false);
    expect(allowedTransitions('submitted')).toEqual([]);
  });

  it('reports the reachable statuses for each state', () => {
    expect(allowedTransitions('pending').sort()).toEqual(['accepted', 'cancelled', 'rejected']);
    expect(allowedTransitions('accepted').sort()).toEqual(['cancelled', 'confirmed']);
    expect(allowedTransitions('confirmed')).toEqual(['ended']);
    expect(allowedTransitions('ended')).toEqual([]);
    expect(allowedTransitions('rejected')).toEqual([]);
    expect(allowedTransitions('cancelled')).toEqual([]);
  });
});
