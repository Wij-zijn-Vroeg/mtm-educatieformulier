// Date formatting utilities for the application

/**
 * Format a date string to Dutch format
 * @param dateString - ISO date string (e.g., "2024-03-15")
 * @returns Formatted date (e.g., "15 maart 2024")
 */
export const formatDutchDate = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const months = [
      'januari', 'februari', 'maart', 'april', 'mei', 'juni',
      'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];
    
    // Use local date to avoid timezone conversion issues
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    return dateString;
  }
};

/**
 * Format a time string to HH:MM format
 * @param timeString - Time string (e.g., "14:30:00")
 * @returns Formatted time (e.g., "14:30")
 */
export const formatTime = (timeString: string | null): string => {
  if (!timeString) return '';
  
  try {
    // Handle ISO datetime format (e.g., "0001-01-01T11:00:00Z")
    if (timeString.includes('T')) {
      const timePart = timeString.split('T')[1].replace('Z', '');
      if (timePart && timePart.includes(':')) {
        const parts = timePart.split(':');
        if (parts.length >= 2) {
          // Add 1 hour to convert UTC to local time
          let hour = parseInt(parts[0]);
          hour = hour + 1;
          if (hour >= 24) hour = hour - 24;
          return `${hour.toString().padStart(2, '0')}:${parts[1]}`;
        }
      }
    }
    // Handle regular time format
    else if (timeString.includes(':')) {
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    
    return timeString;
  } catch (error) {
    return timeString;
  }
};

/**
 * Format screening display with date and time
 * @param datum - Date string
 * @param aanvang - Time string
 * @returns Formatted datetime for display
 */
export const formatScreeningDateTime = (datum: string | null, aanvang: string | null): string => {
  const formattedDate = formatDutchDate(datum);
  const formattedTime = formatTime(aanvang);
  
  if (formattedDate && formattedTime) {
    return `${formattedDate} om ${formattedTime}`;
  } else if (formattedDate) {
    return formattedDate;
  } else if (formattedTime) {
    return `om ${formattedTime}`;
  }
  
  return '';
};