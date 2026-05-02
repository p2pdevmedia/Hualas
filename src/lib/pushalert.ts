type PushAlertSendResponse = {
  success?: boolean;
  id?: number;
  msg?: string;
};

export type PushAlertPayload = {
  title: string;
  message: string;
  url?: string;
  icon?: string;
};

export class PushAlertError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'PushAlertError';
    this.statusCode = statusCode;
  }
}

function getApiKey(): string {
  const apiKey = process.env.PUSHALERT_REST_API_KEY;
  if (!apiKey) {
    throw new Error('PUSHALERT_REST_API_KEY is not configured.');
  }
  return apiKey;
}

export async function sendPushAlert(
  subscriberIds: string[],
  payload: PushAlertPayload
): Promise<void> {
  if (subscriberIds.length === 0) return;

  const body = new URLSearchParams();
  body.set('title', payload.title);
  body.set('message', payload.message);
  if (payload.url) body.set('url', payload.url);
  if (payload.icon) body.set('icon', payload.icon);
  if (subscriberIds.length === 1) {
    body.set('subscriber', subscriberIds[0]);
  } else {
    body.set('subscribers', JSON.stringify(subscriberIds));
  }

  const res = await fetch('https://api.pushalert.co/rest/v2/web-push/send', {
    method: 'POST',
    headers: {
      Authorization: `api_key=${getApiKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  let data: PushAlertSendResponse | null = null;
  try {
    data = (await res.json()) as PushAlertSendResponse;
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    throw new PushAlertError(
      data?.msg ||
        `PushAlert delivery failed${res.status ? ` (HTTP ${res.status})` : ''}`,
      res.status
    );
  }
}
