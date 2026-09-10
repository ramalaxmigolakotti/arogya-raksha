import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import webpush from 'web-push';
import { subscriptionStore } from '../subscribe/route';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  || 'BHOdQACKVJYWq4yqNIq84mhXHf3UJgL6Hc-ttnY-cQXLgO-J01YLPqWSO9nHlFk7-p3SD7jyb4qdrAaGOMRTuMY';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'rK-fcs1XzgrmiypEMwM5tn4_s59j7_5drFNJV6TA6Wc';

webpush.setVapidDetails(
  'mailto:arogya@healthcare.in',
  VAPID_PUBLIC,
  VAPID_PRIVATE,
);

export async function POST(req: NextRequest) {
  try {
    const { title, body, url, tag, icon } = await req.json();

    const payload = JSON.stringify({
      title: title || 'Arogya Raksha',
      body:  body  || 'You have a health notification',
      url:   url   || '/dashboard',
      tag:   tag   || 'arogya',
      icon:  icon  || '/icon-192.png',
    });

    const results = await Promise.allSettled(
      subscriptionStore.map(sub =>
        webpush.sendNotification(sub, payload).catch(() => null)
      )
    );

    const sent    = results.filter(r => r.status === 'fulfilled').length;
    const failed  = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ success: true, sent, failed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
