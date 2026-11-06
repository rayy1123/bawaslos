import { NextResponse } from 'next/server';
import { getDisplayState, setDisplayState } from '@/lib/queries';
import { isAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await getDisplayState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 });
  }
  const body = await req.json();
  const state = await setDisplayState(body);
  return NextResponse.json(state);
}
