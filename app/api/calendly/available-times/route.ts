// app/api/calendly/available-times/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventTypeUri = searchParams.get('eventTypeUri');   // must be full URI
  const date          = searchParams.get('date');          // ISO string

  if (!eventTypeUri || !date) {
    return NextResponse.json(
      { message: 'eventTypeUri and date are required' },
      { status: 400 },
    );
  }

  try {
    // 1 – build a SAME-DAY range in UTC ISO-8601 (Calendly requirement)
    const selected = new Date(date);
    const now = new Date();
    const isToday = selected.toDateString() === now.toDateString();

    const startIso = isToday ? now.toISOString() : startOfDay(selected).toISOString();
    const endIso   = endOfDay(selected).toISOString();

    // 2 – call Calendly
    const { data } = await axios.get(
      'https://api.calendly.com/event_type_available_times',
      {
        headers: {
          Authorization : `Bearer ${process.env.CALENDLY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        params: {
          event_type: eventTypeUri,   // full https://api.calendly.com/event_types/…
          start_time: startIso,
          end_time  : endIso,
        },
      },
    );

    return NextResponse.json(data.collection ?? []);
  } catch (err) {
    console.error('Calendly available-times error:', err);
    return NextResponse.json(
      { message: 'Failed to fetch available times' },
      { status: 500 },
    );
  }
}
