import { NextResponse } from 'next/server';

const PINATA_JWT = process.env.PINATA_JWT;

export async function POST(req: Request) {
  if (!PINATA_JWT) {
    return NextResponse.json(
      { error: 'PINATA_JWT is not set' },
      { status: 500 },
    );
  }

  const data = await req.formData();
  const file = data.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) {
    let message = `Failed to upload file to Pinata: ${res.status} ${res.statusText}`;
    try {
      const body = await res.text();
      if (body) message += ` - ${body}`;
    } catch {
      // ignore
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const json = await res.json();
  const cid = json.IpfsHash as string;
  const url = `https://ipfs.io/ipfs/${cid}`;

  return NextResponse.json({ cid, url });
}
