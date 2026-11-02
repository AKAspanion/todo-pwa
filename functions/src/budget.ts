/**
 * Budget kill-switch: Blaze has no spending cap, so a Cloud Billing budget publishes to the
 * `billing-budget-alerts` topic and this function unlinks the project's billing account once the
 * month's actual cost reaches the budget. Unlinking stops every paid service, this function and
 * the reminders included, until someone links the account again in the console.
 *
 * Billing publishes a notification several times a day whether or not a threshold was crossed,
 * so a failed unlink throws, is logged, and the next notification tries again. Forecasts never
 * trigger it: only spend already incurred does.
 */
import { GoogleAuth } from 'google-auth-library';
import * as logger from 'firebase-functions/logger';
import { projectID } from 'firebase-functions/params';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';

/** The Pub/Sub topic the budget is connected to (Billing → Budgets & alerts → Manage notifications). */
export const BUDGET_TOPIC = 'billing-budget-alerts';

/** The account the function runs as; it holds Project Billing Manager and nothing else. */
const KILL_SWITCH_SERVICE_ACCOUNT = 'budget-kill-switch@';

const BILLING_API = 'https://cloudbilling.googleapis.com/v1';

/** The fields of a budget notification (schema 1.0) the kill-switch reads. */
export interface BudgetNotification {
  budgetDisplayName: string;
  costAmount: number;
  budgetAmount: number;
  currencyCode: string;
}

/** The Cloud Billing calls the kill-switch makes, so tests can fake them. */
export interface BillingApi {
  isBillingEnabled(projectId: string): Promise<boolean>;
  disableBilling(projectId: string): Promise<void>;
}

export type KillSwitchOutcome = 'under-budget' | 'already-disabled' | 'disabled' | 'ignored';

/** The notification's fields, or `null` when the message isn't a budget notification. */
export function parseBudgetNotification(payload: unknown): BudgetNotification | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { budgetDisplayName, costAmount, budgetAmount, currencyCode } = payload as Record<
    string,
    unknown
  >;
  if (
    typeof costAmount !== 'number' ||
    !Number.isFinite(costAmount) ||
    typeof budgetAmount !== 'number' ||
    !Number.isFinite(budgetAmount) ||
    budgetAmount <= 0
  ) {
    return null;
  }
  return {
    budgetDisplayName: typeof budgetDisplayName === 'string' ? budgetDisplayName : '',
    costAmount,
    budgetAmount,
    currencyCode: typeof currencyCode === 'string' ? currencyCode : '',
  };
}

/** Unlinks `projectId`'s billing account when the notification's actual cost reached its budget. */
export async function runKillSwitch(
  billing: BillingApi,
  projectId: string,
  payload: unknown,
): Promise<KillSwitchOutcome> {
  const notification = parseBudgetNotification(payload);
  if (!notification) {
    logger.warn('budget: message is not a budget notification');
    return 'ignored';
  }
  const { costAmount, budgetAmount, currencyCode, budgetDisplayName } = notification;
  if (costAmount < budgetAmount) return 'under-budget';

  if (!(await billing.isBillingEnabled(projectId))) return 'already-disabled';

  logger.warn('budget: cost reached the budget; disabling billing', {
    projectId,
    budgetDisplayName,
    costAmount,
    budgetAmount,
    currencyCode,
  });
  await billing.disableBilling(projectId);
  return 'disabled';
}

/** {@link BillingApi} over the Cloud Billing REST API, with the runtime's own credentials. */
export function cloudBillingApi(
  auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-billing' }),
): BillingApi {
  const billingInfoUrl = (projectId: string) =>
    `${BILLING_API}/projects/${encodeURIComponent(projectId)}/billingInfo`;
  return {
    async isBillingEnabled(projectId) {
      const res = await auth.request<{ billingEnabled?: boolean }>({
        url: billingInfoUrl(projectId),
      });
      return res.data.billingEnabled === true;
    },
    async disableBilling(projectId) {
      // An empty billing account name unlinks the project from its billing account.
      await auth.request({
        url: billingInfoUrl(projectId),
        method: 'PUT',
        data: { billingAccountName: '' },
      });
    },
  };
}

/** The deployed trigger. Deploying creates the topic if it doesn't exist yet. */
export const stopBillingOnBudget = onMessagePublished(
  { topic: BUDGET_TOPIC, serviceAccount: KILL_SWITCH_SERVICE_ACCOUNT },
  async (event) => {
    let payload: unknown;
    try {
      payload = event.data.message.json;
    } catch {
      logger.warn('budget: message data is not JSON');
      return;
    }
    const outcome = await runKillSwitch(cloudBillingApi(), projectID.value(), payload);
    logger.info('budget: notification handled', { outcome });
  },
);
