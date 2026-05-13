import { ProxyAgent, type Dispatcher } from 'undici';

export const runtime = 'nodejs';

const documentaryDriveFileId = '1xEVM3yeRTx1fCKqcqwGGn_pEFXWIBHIp';
const documentaryDriveDownloadUrl = `https://drive.google.com/uc?export=download&id=${documentaryDriveFileId}`;

const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
const proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

type ProxiedRequestInit = RequestInit & {
  dispatcher?: Dispatcher;
};

export async function GET() {
  try {
    const requestInit: ProxiedRequestInit = {
      cache: 'no-store',
      dispatcher: proxyDispatcher,
    };
    const driveResponse = await fetch(documentaryDriveDownloadUrl, requestInit);

    if (!driveResponse.ok || !driveResponse.body) {
      return Response.json(
        { error: 'No se pudo cargar el PDF del documental.' },
        { status: 502 }
      );
    }

    return new Response(driveResponse.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return Response.json(
      { error: 'No se pudo cargar el PDF del documental.' },
      { status: 502 }
    );
  }
}
