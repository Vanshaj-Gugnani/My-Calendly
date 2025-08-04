"use client";
import React, { useState, useEffect, useMemo } from "react";
import { format } from 'date-fns';

interface CalendarProps {
  onDateSelect?: (date: Date) => void;
}

interface AvailableTime {
  start_time: string;
  invitee_start_time: string;
  status: string;
}

interface EventType {
  uri: string;
  name: string;
  duration: number;
  scheduling_url: string;
  slug: string;
}

interface CalendlyUser {
  uri: string;
  name: string;
  slug: string;
  email: string;
  scheduling_url: string;
}

interface BookingDetails {
  name: string;
  email: string;
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // First/last day of month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentYear, currentMonth + direction, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(clickedDate);
    onDateSelect?.(clickedDate);
  };

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === currentMonth &&
    today.getFullYear() === currentYear;

  const isSelected = (day: number) =>
    !!selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === currentMonth &&
    selectedDate.getFullYear() === currentYear;

  const isPastDate = (day: number) =>
    new Date(currentYear, currentMonth, day) <
    new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Build calendar cells and pad to 6 full rows (42 cells) for stable height
  const calendarDays: Array<number | null> = [];
  for (let i = 0; i < firstDayWeekday; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);
  const totalCells = 42; // 6 rows * 7 cols
  while (calendarDays.length < totalCells) calendarDays.push(null);

  return (
    <div className="w-full h-full flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 bg-black/60 border border-white/10 rounded-lg p-2">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-lg font-semibold">
          {monthNames[currentMonth]} {currentYear}
        </h2>

        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2 shrink-0">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-white/60 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid: lock to 6 rows for consistent height */}
      <div className="grid grid-cols-7 grid-rows-6 gap-1 grow min-h-0 rounded-lg p-2">
        {calendarDays.map((day, index) => (
          <div key={index} className="aspect-square">
            {day && (
              <button
                onClick={() => handleDateClick(day)}
                disabled={isPastDate(day)}
                className={`
                  w-full h-full rounded-lg text-sm font-medium transition-colors duration-200
                  flex items-center justify-center
                  ${isPastDate(day)
                    ? "text-white/30 cursor-not-allowed"
                    : "hover:bg-white/10 cursor-pointer"}
                  ${isToday(day) ? "bg-white/20 text-white" : ""}
                  ${isSelected(day) ? "border border-[#2FA4FF] text-[#2FA4FF]" : ""}
                `}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Memoized date display component to prevent unnecessary re-renders
const DateDisplay = React.memo<{ selectedDate: Date | null }>(({ selectedDate }) => {
  if (!selectedDate) return null;
  
  return (
    <p className="text-sm text-white/60">
      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
    </p>
  );
});

DateDisplay.displayName = 'DateDisplay';

// Memoized header component to prevent background refresh
const TimeSlotsHeader = React.memo<{ selectedDate: Date | null }>(({ selectedDate }) => (
  <div className="mb-4 bg-black/80 rounded-xl p-4">
    <h3 className="text-lg font-semibold text-white mb-2">
      Available Times
    </h3>
    <DateDisplay selectedDate={selectedDate} />
  </div>
));

TimeSlotsHeader.displayName = 'TimeSlotsHeader';

const TimeSlots: React.FC<{ 
  selectedDate: Date | null; 
  onTimeSelect: (time: AvailableTime) => void;
  selectedTime: AvailableTime | null;
}> = ({ selectedDate, onTimeSelect, selectedTime }) => {
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<CalendlyUser | null>(null);

  // Initialize by getting user info and event types
  useEffect(() => {
    const initializeCalendly = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user info
        const userResponse = await fetch('/api/calendly/user');
        if (!userResponse.ok) throw new Error('Failed to fetch user info');
        const userData = await userResponse.json();
        setUserInfo(userData);

        // Fetch event types
        const eventTypesResponse = await fetch(`/api/calendly/event-types?userUri=${encodeURIComponent(userData.uri)}`);
        if (!eventTypesResponse.ok) throw new Error('Failed to fetch event types');
        const eventTypesData = await eventTypesResponse.json();
        setEventTypes(eventTypesData);

      } catch (error) {
        console.error('Failed to initialize Calendly:', error);
        setError('Failed to initialize Calendly integration');
      } finally {
        setLoading(false);
      }
    };

    initializeCalendly();
  }, []);

  // Fetch available times when date is selected
  useEffect(() => {
    if (selectedDate && eventTypes.length > 0) {
      fetchAvailableTimes();
    } else {
      setAvailableTimes([]);
    }
  }, [selectedDate, eventTypes]);

  const fetchAvailableTimes = async () => {
    if (!selectedDate || eventTypes.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the 30min event type or use the first one
      const targetEventType = eventTypes.find(et => 
        et.slug.includes('30min') || 
        et.name.toLowerCase().includes('30') ||
        et.scheduling_url.includes('30min')
      ) || eventTypes[0];

      if (!targetEventType) {
        throw new Error('No suitable event type found');
      }

      const response = await fetch(
        `/api/calendly/available-times?eventTypeUri=${encodeURIComponent(targetEventType.uri)}&date=${selectedDate.toISOString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch available times');
      }
      
      const times = await response.json();
      setAvailableTimes(times);
    } catch (error) {
      console.error('Failed to fetch available times:', error);
      setError('Failed to fetch available times');
      setAvailableTimes([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoize the time slots content to prevent unnecessary re-renders
  const timeSlotsContent = useMemo(() => {
    if (availableTimes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-white/60">
          <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-center">No available times for this date</p>
        </div>
      );
    }

    return availableTimes.map((time, index) => {
      const isSelected = selectedTime?.start_time === time.start_time;
      
      return (
        <button
          key={index}
          onClick={() => onTimeSelect(time)}
          className={`w-full p-3 rounded-lg transition-all duration-200 text-left group border
                     ${isSelected 
                       ? "bg-[#2FA4FF]/20 border-[#2FA4FF] text-[#2FA4FF]" 
                       : "bg-white/10 hover:bg-white/20 border-white/10 hover:border-[#2FA4FF]/50"
                     }`}
        >
          <div className="flex justify-between items-center">
            <span className={`font-medium ${isSelected ? "text-[#2FA4FF]" : "text-white"}`}>
              {format(new Date(time.start_time), 'h:mm a')}
            </span>
            <svg className={`w-4 h-4 transition-colors ${isSelected ? "text-[#2FA4FF]" : "text-white/60 group-hover:text-[#2FA4FF]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
      );
    });
  }, [availableTimes, selectedTime]);

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/60">
        <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-center">Select a date to view available times</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <TimeSlotsHeader selectedDate={selectedDate} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <TimeSlotsHeader selectedDate={selectedDate} />
        <div className="flex-1 flex flex-col items-center justify-center text-red-400">
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <TimeSlotsHeader selectedDate={selectedDate} />
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {timeSlotsContent}
      </div>
    </div>
  );
};

const BookingForm: React.FC<{
  selectedDate: Date | null;
  selectedTime: AvailableTime | null;
  bookingDetails: BookingDetails;
  onBookingDetailsChange: (details: BookingDetails) => void;
}> = ({ selectedDate, selectedTime, bookingDetails, onBookingDetailsChange }) => {
  const handleInputChange = (field: keyof BookingDetails, value: string) => {
    onBookingDetailsChange({
      ...bookingDetails,
      [field]: value
    });
  };

  if (!selectedTime) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/60">
        <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-center">Choose a time slot to proceed</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 bg-black/80 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          Booking Details
        </h3>
        {selectedDate && selectedTime && (
          <div className="text-sm text-white/60">
            <p>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
            <p>{format(new Date(selectedTime.start_time), 'h:mm a')}</p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={bookingDetails.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/10 
                       text-white placeholder-white/50 focus:border-[#2FA4FF] 
                       focus:outline-none transition-colors"
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={bookingDetails.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/10 
                       text-white placeholder-white/50 focus:border-[#2FA4FF] 
                       focus:outline-none transition-colors"
            placeholder="Enter your email address"
            required
          />
        </div>

        
      </div>
    </div>
  );
};

const BookMe = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<AvailableTime | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    name: '',
    email: '',
  });
  const [isScheduling, setIsScheduling] = useState(false);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset time selection when date changes
    console.log("Selected date:", date);
  };

  const handleTimeSelect = (time: AvailableTime) => {
    setSelectedTime(time);
    console.log("Selected time:", time);
  };

 const handleScheduleEvent = async () => {
  if (!selectedDate || !selectedTime || !bookingDetails.name || !bookingDetails.email) {
    alert('Please fill in all required fields');
    return;
  }

  setIsScheduling(true);
  try {
    const response = await fetch('/api/calendly/schedule-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: selectedDate.toISOString(),
        time: selectedTime.start_time,
        invitee: {
          name: bookingDetails.name,
          email: bookingDetails.email,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create booking');
    }

    const result = await response.json();
    
    // Open the enhanced booking URL with pre-filled details
    if (result.booking_url) {
      window.open(result.booking_url, '_blank');
      alert('Please complete your booking in the new tab. Your details have been pre-filled!');
    }

    // Reset form
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingDetails({ name: '', email: '' });
    
  } catch (error) {
    console.error('Failed to create booking:', error);
    alert('Failed to create booking. Please try again.');
  } finally {
    setIsScheduling(false);
  }
};



  const isFormValid = selectedDate && selectedTime && bookingDetails.name && bookingDetails.email;

  return (
    <div
      className="relative isolate mx-auto max-w-7xl px-4 py-8"
      style={{ ["--titleSize" as any]: "15vw" }}
    >
      <div
        className="relative z-0 leading-none text-white font-moonet pointer-events-none select-none text-center
        [font-variant-ligatures:common-ligatures_discretionary-ligatures_contextual]
        [font-feature-settings:'liga'_1,'clig'_1,'calt'_1,'dlig'_1,'salt'_1,'ss01'_1]"
        style={{ fontSize: "var(--titleSize)" }}
        aria-hidden="true"
      >
        BOOK ME
      </div>

      <div
        className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 items-stretch"
        style={{ marginTop: "calc(var(--titleSize) / -2.3)" }}
      >
        {/* Calendar Card */}
        <div className="w-full h-[22rem] sm:h-[24rem] lg:h-[28rem] p-6 rounded-[1.5rem] bg-white/5
                        border border-white/10 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)]
                        backdrop-blur-md transition-transform duration-300 overflow-hidden">
          <Calendar onDateSelect={handleDateSelect} />
        </div>

        {/* Time Slots Card */}
        <div className="w-full h-[22rem] sm:h-[24rem] lg:h-[28rem] p-6 rounded-[1.5rem]
                        bg-white/5 border border-white/10
                        shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)]
                        backdrop-blur-sm transition-transform duration-300 overflow-hidden">
          <TimeSlots 
            selectedDate={selectedDate} 
            onTimeSelect={handleTimeSelect}
            selectedTime={selectedTime}
          />
        </div>

        {/* Booking Form Card */}
        <div className="w-full h-[22rem] sm:h-[24rem] lg:h-[28rem] p-6 rounded-[1.5rem]
                        bg-white/5 border border-white/10
                        shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)]
                        backdrop-blur-sm transition-transform duration-300 overflow-hidden">
          <BookingForm 
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            bookingDetails={bookingDetails}
            onBookingDetailsChange={setBookingDetails}
          />
        </div>
      </div>

      {/* Schedule Event Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleScheduleEvent}
          disabled={!isFormValid || isScheduling}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300
                     ${isFormValid 
                       ? "bg-[#2FA4FF] text-white hover:bg-[#2FA4FF]/90 shadow-[0_10px_30px_-5px_rgba(47,164,255,0.3)]" 
                       : "bg-white/10 text-white/50 cursor-not-allowed"
                     }
                     ${isScheduling ? "opacity-75" : ""}`}
        >
          {isScheduling ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Scheduling...</span>
            </div>
          ) : (
            "Schedule Event"
          )}
        </button>
      </div>
    </div>
  );
};

export default BookMe;
