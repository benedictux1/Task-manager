// Singapore Public Holidays 2026 (and can be extended for future years)
const SINGAPORE_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-29', // Chinese New Year
  '2026-01-30', // Chinese New Year
  '2026-04-18', // Good Friday
  '2026-05-01', // Labour Day
  '2026-05-26', // Vesak Day
  '2026-08-09', // National Day
  '2026-08-31', // Hari Raya Haji
  '2026-10-24', // Deepavali
  '2026-12-25', // Christmas Day
];

// Can add more years as needed
const ALL_HOLIDAYS = {
  2026: SINGAPORE_HOLIDAYS_2026,
  // Add 2027, 2028, etc. as needed
};

/**
 * Check if a date is a Singapore public holiday
 * @param {Date} date 
 * @returns {boolean}
 */
export function isHoliday(date) {
  const year = date.getFullYear();
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const holidays = ALL_HOLIDAYS[year] || [];
  return holidays.includes(dateString);
}

/**
 * Check if a date is a working day (Mon-Fri, not holiday)
 * @param {Date} date 
 * @returns {boolean}
 */
export function isWorkingDay(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  return isWeekday && !isHoliday(date);
}

/**
 * Calculate working days between two dates (excluding start date, including end date)
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {number}
 */
export function calculateWorkingDays(startDate, endDate) {
  if (startDate > endDate) return 0;
  
  let workingDays = 0;
  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // Start from next day
  
  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Calculate working days from today to a due date
 * @param {string|Date} dueDate 
 * @returns {number|null}
 */
export function getWorkingDaysUntilDue(dueDate) {
  if (!dueDate) return null;
  
  let dueDateObj;
  if (typeof dueDate === 'string') {
    dueDateObj = parseDueDate(dueDate);
  } else {
    dueDateObj = dueDate;
  }
  
  if (!dueDateObj || isNaN(dueDateObj)) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  dueDateObj.setHours(0, 0, 0, 0); // Reset time to start of day
  
  return calculateWorkingDays(today, dueDateObj);
}

/**
 * Parse various date formats that might be in the dueDate field
 * @param {string} dateString 
 * @returns {Date|null}
 */
export function parseDueDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  // Handle MM/DD format (current format in the app)
  if (/^\d{1,2}\/\d{1,2}$/.test(dateString)) {
    const [month, day] = dateString.split('/').map(num => parseInt(num));
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month - 1, day); // month is 0-indexed
  }
  
  // Handle DD/MMM format (28/Mar)
  if (/^\d{1,2}\/[A-Za-z]{3}$/.test(dateString)) {
    const [day, monthStr] = dateString.split('/');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
    if (month === -1) return null;
    
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month, parseInt(day));
  }
  
  // Handle natural language dates
  if (dateString.toLowerCase() === 'today') {
    return new Date();
  }
  if (dateString.toLowerCase() === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (dateString.toLowerCase().includes('next')) {
    // Could add more sophisticated natural language parsing
    return null;
  }
  
  // Try to parse as standard date
  const parsed = new Date(dateString);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a date to DD/MMM format (28/Mar)
 * @param {Date|string} date 
 * @returns {string}
 */
export function formatDateToDDMMM(date) {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    dateObj = parseDueDate(date);
  } else {
    dateObj = date;
  }
  
  if (!dateObj || isNaN(dateObj)) return '';
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = dateObj.getDate();
  const month = monthNames[dateObj.getMonth()];
  
  return `${day}/${month}`;
}

/**
 * Add working days to a date
 * @param {Date} startDate 
 * @param {number} workingDaysToAdd 
 * @returns {Date}
 */
export function addWorkingDays(startDate, workingDaysToAdd) {
  let currentDate = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < workingDaysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (isWorkingDay(currentDate)) {
      daysAdded++;
    }
  }
  
  return currentDate;
}