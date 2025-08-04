import { NextRequest, NextResponse } from 'next/server';

interface ScheduleEventRequest {
  date: string;               // selected calendar day (UTC or TZ-offset ISO string)
  time: string;               // full ISO timestamp for the chosen slot
  invitee: { name: string; email: string };
  description?: string;
}

/**
 * POST /api/calendly/schedule-event
 *
 * Creates a single-use scheduling link, then “deep-links” it straight to the
 * exact time-slot with the invitee’s name & email pre-filled.
 *
 * Calendly allows pre-filling standard fields via query-string variables
 * (name, email, etc.) :contentReference[oaicite:0]{index=0}
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.CALENDLY_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Calendly integration not configured' },
        { status: 500 }
      );
    }

    const body: ScheduleEventRequest = await request.json();
    const { date, time, invitee } = body;

    if (!date || !time || !invitee?.name || !invitee?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    /* -------------------------------------------------------------------- */
    /* 1 ── identify a 30-minute event type for the current user            */
    /* -------------------------------------------------------------------- */
    const userRes = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!userRes.ok) {
      return NextResponse.json({ error: 'Calendly auth failed' }, { status: 401 });
    }

    const userUri = (await userRes.json()).resource.uri;
    const etRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const eventTypes = (await etRes.json()).collection;
    const targetET =
      eventTypes.find((e: any) =>
        (e.slug || '').includes('30min') ||
        (e.name || '').toLowerCase().includes('30') ||
        e.duration === 30
      ) || eventTypes[0];

    /* -------------------------------------------------------------------- */
    /* 2 ── create a single-use scheduling link (expires in 2 h)            */
    /* -------------------------------------------------------------------- */
    const linkRes = await fetch('https://api.calendly.com/scheduling_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_event_count: 1,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        owner: targetET.uri,
        owner_type: 'EventType'
      })
    });

    if (!linkRes.ok) {
      const txt = await linkRes.text();
      console.error('Calendly link error:', txt);
      return NextResponse.json({ error: 'Could not create booking link' }, { status: 502 });
    }

    const { resource } = await linkRes.json(); // contains booking_url
    /* -------------------------------------------------------------------- */
    /* 3 ── build a deep-link pointing at the exact slot, with pre-fill     */
    /* -------------------------------------------------------------------- */
    const slotIso = time;                         // already full ISO from client
    const dayObj  = new Date(date);
    const monthQS = dayObj.toISOString().slice(0, 7);  // YYYY-MM
    const dateQS  = dayObj.toISOString().slice(0, 10); // YYYY-MM-DD

    const deepLink = [
      resource.booking_url.replace(/\/$/, ''),           // trim trailing slash
      encodeURIComponent(slotIso)                        // path segment
    ].join('/') +
      `?month=${monthQS}&date=${dateQS}` +
      `&name=${encodeURIComponent(invitee.name)}` +
      `&email=${encodeURIComponent(invitee.email)}`;

    return NextResponse.json({
      success: true,
      booking_url: deepLink,        // front-end will open this in a new tab
      expires_at: resource.expires_at
    });
  } catch (err) {
    console.error('schedule-event error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
