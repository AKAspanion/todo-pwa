/** The budget kill-switch's decision, with Cloud Billing faked. */
import { describe, expect, it, vi } from 'vitest';
import { parseBudgetNotification, runKillSwitch, type BillingApi } from './budget';

vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  write: vi.fn(),
}));

const PROJECT = 'spanion-todo';

/** A budget notification as Cloud Billing publishes it (schema 1.0). */
function notification(costAmount: number, overrides: Record<string, unknown> = {}) {
  return {
    budgetDisplayName: 'todo-pwa-5',
    alertThresholdExceeded: 1.0,
    costAmount,
    costIntervalStart: '2026-11-01T07:00:00Z',
    budgetAmount: 5,
    budgetAmountType: 'SPECIFIED_AMOUNT',
    currencyCode: 'USD',
    ...overrides,
  };
}

function fakeBilling(enabled = true) {
  return {
    isBillingEnabled: vi.fn<BillingApi['isBillingEnabled']>().mockResolvedValue(enabled),
    disableBilling: vi.fn<BillingApi['disableBilling']>().mockResolvedValue(undefined),
  };
}

describe('runKillSwitch', () => {
  it('disables billing once the cost reaches the budget', async () => {
    const billing = fakeBilling();
    await expect(runKillSwitch(billing, PROJECT, notification(5))).resolves.toBe('disabled');
    expect(billing.disableBilling).toHaveBeenCalledWith(PROJECT);
  });

  it('disables billing when the cost is past the budget', async () => {
    const billing = fakeBilling();
    await expect(runKillSwitch(billing, PROJECT, notification(7.42))).resolves.toBe('disabled');
  });

  it('leaves billing alone under the budget, even when a forecast threshold is exceeded', async () => {
    const billing = fakeBilling();
    const payload = notification(4.99, {
      alertThresholdExceeded: 0.9,
      forecastThresholdExceeded: 1.0,
    });
    await expect(runKillSwitch(billing, PROJECT, payload)).resolves.toBe('under-budget');
    expect(billing.isBillingEnabled).not.toHaveBeenCalled();
    expect(billing.disableBilling).not.toHaveBeenCalled();
  });

  it('does nothing when billing is already disabled', async () => {
    const billing = fakeBilling(false);
    await expect(runKillSwitch(billing, PROJECT, notification(6))).resolves.toBe(
      'already-disabled',
    );
    expect(billing.disableBilling).not.toHaveBeenCalled();
  });

  it('ignores a message that is not a budget notification', async () => {
    const billing = fakeBilling();
    await expect(runKillSwitch(billing, PROJECT, { hello: 'world' })).resolves.toBe('ignored');
    expect(billing.disableBilling).not.toHaveBeenCalled();
  });

  it('throws when the unlink fails, so the next notification tries again', async () => {
    const billing = fakeBilling();
    billing.disableBilling.mockRejectedValue(new Error('PERMISSION_DENIED'));
    await expect(runKillSwitch(billing, PROJECT, notification(5))).rejects.toThrow(
      'PERMISSION_DENIED',
    );
  });
});

describe('parseBudgetNotification', () => {
  it.each([
    ['null', null],
    ['a string', 'costAmount=10'],
    ['a string cost', notification(0, { costAmount: '10' })],
    ['a missing budget', notification(10, { budgetAmount: undefined })],
    ['a zero budget', notification(10, { budgetAmount: 0 })],
    ['a NaN cost', notification(Number.NaN)],
  ])('rejects %s', (_name, payload) => {
    expect(parseBudgetNotification(payload)).toBeNull();
  });

  it('keeps the fields it reads', () => {
    expect(parseBudgetNotification(notification(3.5))).toEqual({
      budgetDisplayName: 'todo-pwa-5',
      costAmount: 3.5,
      budgetAmount: 5,
      currencyCode: 'USD',
    });
  });
});
