// app/api/calendly/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const response = await axios.get('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response.data.resource);
  } catch (error) {
    console.error('Calendly user API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}
