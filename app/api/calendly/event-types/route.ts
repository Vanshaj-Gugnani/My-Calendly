// app/api/calendly/event-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userUri = searchParams.get('userUri');

  if (!userUri) {
    return NextResponse.json(
      { message: 'User URI is required' },
      { status: 400 }
    );
  }

  try {
    const response = await axios.get('https://api.calendly.com/event_types', {
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        user: userUri,
        active: true,
      },
    });

    return NextResponse.json(response.data.collection);
  } catch (error) {
    console.error('Calendly event types API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch event types' },
      { status: 500 }
    );
  }
}
