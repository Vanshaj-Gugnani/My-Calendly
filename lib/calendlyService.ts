// lib/calendlyService.ts
import axios from 'axios';
import { format, startOfDay, endOfDay } from 'date-fns';

const CALENDLY_API_BASE = 'https://api.calendly.com';

interface EventType {
  uri: string;
  name: string;
  duration: number;
  scheduling_url: string;
  slug: string;
}

interface AvailableTime {
  start_time: string;
  invitee_start_time: string;
  status: string;
}

interface CalendlyUser {
  uri: string;
  name: string;
  slug: string;
  email: string;
  scheduling_url: string;
}

class CalendlyService {
  private getHeaders() {
    return {
      'Authorization': `Bearer ${process.env.CALENDLY_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async getUserInfo(): Promise<CalendlyUser> {
    try {
      const response = await axios.get(`${CALENDLY_API_BASE}/users/me`, {
        headers: this.getHeaders(),
      });
      return response.data.resource;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw new Error('Failed to fetch user information');
    }
  }

  async getEventTypes(userUri: string): Promise<EventType[]> {
    try {
      const response = await axios.get(`${CALENDLY_API_BASE}/event_types`, {
        headers: this.getHeaders(),
        params: {
          user: userUri,
          active: true,
        },
      });
      return response.data.collection;
    } catch (error) {
      console.error('Error fetching event types:', error);
      throw new Error('Failed to fetch event types');
    }
  }

  async getAvailableTimes(eventTypeUri: string, selectedDate: Date): Promise<AvailableTime[]> {
    try {
      const startTime = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      const endTime = format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

      const response = await axios.get(`${CALENDLY_API_BASE}/event_type_available_times`, {
        headers: this.getHeaders(),
        params: {
          event_type: eventTypeUri,
          start_time: startTime,
          end_time: endTime,
        },
      });
      
      return response.data.collection || [];
    } catch (error) {
      console.error('Error fetching available times:', error);
      throw new Error('Failed to fetch available times');
    }
  }
}

export const calendlyService = new CalendlyService();
