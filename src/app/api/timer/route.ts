import { NextResponse } from 'next/server';
import { getTimerState, setTimerState } from '@/lib/queries';
import { isAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await getTimerState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 });
  }
  const body = await req.json();
  const state = await setTimerState(body);
  return NextResponse.json(state);
}
