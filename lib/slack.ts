import { logger } from '@/lib/logger';

/**
 * Slack alerts for UNATTENDED operations — the ones that touch money or
 * inventory with no human in the loop, where a silent failure would otherwise
 * only ever surface in Vercel logs nobody is watching.
 *
 * Contract: this must never affect the operation it reports on.
 *   - no webhook configured → silent no-op (so previews/dev stay quiet);
 *   - never throws — a failed alert is logged and swallowed;
 *   - hard timeout, so a hanging Slack can't hold a request open.
 *
 * Set SLACK_WEBHOOK_URL to a Slack Incoming Webhook to arm it.
 */

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TIMEOUT_MS = 5_000;

const slackLog = logger.withTag('slack');

/**
 * critical — money or inventory is in a wrong state RIGHT NOW, act today
 * error    — the operation failed but self-healed (rolled back)
 * warn     — refused to act on purpose; nothing broken, but worth an eye
 * info     — it worked; reported because it moved money unattended
 */
export type AlertLevel = 'critical' | 'error' | 'warn' | 'info';

const PREFIX: Record<AlertLevel, string> = {
  critical: ':rotating_light: *CRITICAL*',
  error: ':x: *Error*',
  warn: ':warning: *Warning*',
  info: ':white_check_mark:',
};

/** Slack renders this fenced, so values stay aligned and copy-pasteable. */
function formatFields(fields: Record<string, unknown>): string {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  const width = Math.max(...entries.map(([k]) => k.length));
  const lines = entries.map(([k, v]) => `${k.padEnd(width)}  ${String(v)}`);
  return '\n```\n' + lines.join('\n') + '\n```';
}

/**
 * Post an alert to Slack. Awaited by callers so the message is actually flushed
 * before a serverless function freezes, but it can never break them: every
 * failure path is swallowed.
 */
export async function notifySlack(
  level: AlertLevel,
  title: string,
  fields: Record<string, unknown> = {},
): Promise<void> {
  if (!WEBHOOK_URL) return;

  const text = `${PREFIX[level]} ${title}${formatFields(fields)}`;

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      slackLog.warn('alert not delivered', { status: res.status, title });
    }
  } catch (err) {
    // Includes the timeout abort. Never rethrow — the caller's own work has
    // already happened and must not be judged by whether Slack answered.
    slackLog.warn('alert failed', {
      title,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
