export const formatVnd = (value = 0) => `${Math.round(value).toLocaleString('vi-VN')} ₫`;

export const formatPercent = (value = 0) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

export const parseDate = (value: string) => {
  let day: number, month: number, year: number;

  if (value.includes('-')) {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3) return null;
    [year, month, day] = parts;
  } else if (value.includes('/')) {
    const parts = value.split('/').map(Number);
    if (parts.length !== 3) return null;
    [day, month, year] = parts;
  } else {
    return null;
  }

  if (!day || !month || !year) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const daysUntil = (date: Date | null) => {
  if (!date) return null;
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  return Math.ceil((time - Date.now()) / 86400000);
};

export const formatDate = (date: Date | null) => {
  if (!date) return 'Chưa xác định';
  if (Number.isNaN(date.getTime())) return 'Chưa xác định';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const todayStr = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date());

export const todayDateStr = new Date().toLocaleDateString('en-GB');
