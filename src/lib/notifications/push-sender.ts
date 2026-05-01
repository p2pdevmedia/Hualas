type WebPushClient = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(subscription: unknown, payload: string): Promise<unknown>;
};

let configured = false;
let webpushClient: WebPushClient | null = null;

async function getWebPushClient(): Promise<WebPushClient> {
  if (webpushClient) return webpushClient;

  const webPushImport = new Function(
    'return import("web-push")'
  ) as () => Promise<unknown>;
  const webPushModule = await webPushImport().catch(() => null);
  const client = ((webPushModule as { default?: WebPushClient } | null)
    ?.default ?? webPushModule) as WebPushClient | null;
  if (!client) {
    throw new Error(
      'web-push package is not available. Push notifications are disabled in this environment.'
    );
  }

  webpushClient = client;
  return client;
}

function ensureConfigured(client: WebPushClient): void {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      'VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.'
    );
  }
  client.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  data?: unknown;
};

export type SubscriptionInfo = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export class PushSendError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'PushSendError';
    this.statusCode = statusCode;
  }
}

export async function sendPush(
  subscription: SubscriptionInfo,
  payload: PushPayload
): Promise<void> {
  const client = await getWebPushClient();
  ensureConfigured(client);
  const sub = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };
  try {
    await client.sendNotification(sub, JSON.stringify(payload));
  } catch (err: unknown) {
    const status =
      typeof err === 'object' && err !== null && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    throw new PushSendError(
      `Push delivery failed${status ? ` (HTTP ${status})` : ''}`,
      status
    );
  }
}
