import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { code } = await req.json();
  const valid = process.env.ACCESS_CODE;
  if (!valid) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  if (code?.trim().toUpperCase() === valid.trim().toUpperCase()) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
