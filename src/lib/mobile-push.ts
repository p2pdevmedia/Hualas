import { connect, type ClientHttp2Session } from 'node:http2';
import { createPrivateKey, createSign, type BinaryLike } from 'node:crypto';
import type { NotificationType } from '@prisma/client';

export type MobilePushDevice = {
  id: string;
  token: string;
  environment: string | null;
  bundleId: string | null;
  userId: string;
};

export type MobilePushPayload = {
  type: NotificationType;
  title: string;
  body: string;
  url?: string | null;
  data?: Record<string, unknown> | null;
};

export type MobilePushResult = {
  deviceId: string;
  token: string;
  environment: string;
  ok: boolean;
  status?: number;
  reason?: string;
};

type ApnsConfig = {
  teamId: string;
  keyId: string;
  privateKey: string;
  topic: string;
};

type CachedJwt = {
  value: string;
  expiresAt: number;
};

let cachedJwt: CachedJwt | null = null;

function readConfig(): ApnsConfig | null {
  const teamId = process.env.APPLE_APNS_TEAM_ID?.trim();
  const keyId = process.env.APPLE_APNS_KEY_ID?.trim();
  const privateKey = process.env.APPLE_APNS_PRIVATE_KEY?.trim();
  const topic =
    process.env.APPLE_APNS_BUNDLE_ID?.trim() ||
    process.env.APPLE_APNS_TOPIC?.trim();

  if (!teamId || !keyId || !privateKey || !topic) {
    return null;
  }

  return {
    teamId,
    keyId,
    privateKey: normalizePrivateKey(privateKey),
    topic,
  };
}

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, '\n');
}

function getJwt(config: ApnsConfig): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now + 60) {
    return cachedJwt.value;
  }

  const key = createPrivateKey({
    key: config.privateKey,
    format: 'pem',
  });

  const header = base64Url(
    JSON.stringify({
      alg: 'ES256',
      kid: config.keyId,
    })
  );
  const payload = base64Url(
    JSON.stringify({
      iss: config.teamId,
      iat: now,
    })
  );

  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();

  const signature = signer.sign({
    key,
    dsaEncoding: 'ieee-p1363',
  });

  const token = `${header}.${payload}.${base64Url(signature)}`;
  cachedJwt = {
    value: token,
    expiresAt: now + 50 * 60,
  };
  return token;
}

function base64Url(value: string | BinaryLike): string {
  return Buffer.from(value).toString('base64url');
}

function apnsHost(environment: string): string {
  return environment === 'development'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';
}

function createRequest(
  session: ClientHttp2Session,
  path: string,
  jwt: string,
  topic: string
) {
  return session.request({
    ':method': 'POST',
    ':path': path,
    authorization: `bearer ${jwt}`,
    'apns-topic': topic,
    'apns-push-type': 'alert',
    'apns-priority': '10',
    'content-type': 'application/json',
  });
}

async function sendToDevice(
  session: ClientHttp2Session,
  config: ApnsConfig,
  device: MobilePushDevice,
  payload: MobilePushPayload
): Promise<MobilePushResult> {
  const environment =
    device.environment === 'development' ? 'development' : 'production';
  const jwt = getJwt(config);
  const request = createRequest(
    session,
    `/3/device/${device.token}`,
    jwt,
    config.topic
  );
  const body = JSON.stringify({
    aps: {
      alert: {
        title: payload.title,
        body: payload.body,
      },
      sound: 'default',
    },
    hualas: {
      type: payload.type,
      url: payload.url ?? null,
      data: payload.data ?? null,
    },
  });

  return await new Promise<MobilePushResult>((resolve) => {
    let responseBody = '';

    request.setEncoding('utf8');
    request.on('response', (headers) => {
      const status = Number(headers[':status'] ?? 0);
      request.on('data', (chunk: string) => {
        responseBody += chunk;
      });
      request.on('end', () => {
        if (status >= 200 && status < 300) {
          resolve({
            deviceId: device.id,
            token: device.token,
            environment,
            ok: true,
            status,
          });
          return;
        }

        let reason: string | undefined;
        try {
          const parsed = JSON.parse(responseBody) as { reason?: string };
          reason = parsed.reason;
        } catch {
          reason = responseBody || undefined;
        }

        resolve({
          deviceId: device.id,
          token: device.token,
          environment,
          ok: false,
          status,
          reason,
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        deviceId: device.id,
        token: device.token,
        environment,
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      });
    });

    request.end(body);
  });
}

export async function sendMobilePushNotifications(
  devices: MobilePushDevice[],
  payload: MobilePushPayload
): Promise<MobilePushResult[]> {
  if (devices.length === 0) {
    return [];
  }

  const config = readConfig();
  if (!config) {
    console.info('[apns] configuration missing, skipping mobile push');
    return [];
  }

  const grouped = new Map<string, MobilePushDevice[]>();
  for (const device of devices) {
    const environment =
      device.environment === 'development' ? 'development' : 'production';
    const list = grouped.get(environment) ?? [];
    list.push(device);
    grouped.set(environment, list);
  }

  const results: MobilePushResult[] = [];
  for (const [environment, list] of grouped.entries()) {
    const session = connect(apnsHost(environment));
    try {
      const batch = await Promise.all(
        list.map((device) => sendToDevice(session, config, device, payload))
      );
      results.push(...batch);
    } finally {
      session.close();
    }
  }

  return results;
}
