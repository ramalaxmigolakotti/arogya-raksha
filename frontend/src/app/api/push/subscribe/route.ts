import { NextRequest, NextResponse } from 'next/server';

// In production, store subscriptions in Supabase. For now, store in-memory.
const subscriptions: any[] = [];
export const subscriptionStore = subscriptions;

export async function POST(req: NextRequest) {
  try {
    const sub = await req.json();
    if (!sub?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Avoid duplicates
    const exists = subscriptions.find(s => s.endpoint === sub.endpoint);
    if (!exists) {
      subscriptions.push(sub);
    }

    return NextResponse.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    const idx = subscriptions.findIndex(s => s.endpoint === endpoint);
    if (idx !== -1) subscriptions.splice(idx, 1);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
