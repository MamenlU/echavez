const MANILA_OFFSET_MINUTES = 8 * 60;

function manilaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type) => Number(parts.find((part) => part.type === type)?.value || 0);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };
}

function startOfManilaCalendarDayUtc({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day) - MANILA_OFFSET_MINUTES * 60_000);
}

function formatServerLocalDateTime(utcDate, serverOffsetMinutes) {
  const shifted = new Date(utcDate.getTime() + serverOffsetMinutes * 60_000);
  const pad = (value) => String(value).padStart(2, '0');

  return [
    shifted.getUTCFullYear(),
    '-',
    pad(shifted.getUTCMonth() + 1),
    '-',
    pad(shifted.getUTCDate()),
    ' ',
    pad(shifted.getUTCHours()),
    ':',
    pad(shifted.getUTCMinutes()),
    ':',
    pad(shifted.getUTCSeconds()),
  ].join('');
}

export async function getServerOffsetMinutes(database) {
  const [[row]] = await database.query(
    `SELECT 0 AS server_offset_minutes`
  );

  const offset = Number(row?.server_offset_minutes);
  return Number.isFinite(offset) ? offset : 0;
}

export async function getPhilippineBusinessRanges(database, now = new Date()) {
  const serverOffsetMinutes = await getServerOffsetMinutes(database);
  const today = manilaDateParts(now);
  const todayCalendarUtc = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const weekday = todayCalendarUtc.getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;

  const todayStartUtc = startOfManilaCalendarDayUtc(today);
  const weekStartUtc = new Date(todayStartUtc.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);

  const currentServerDateTime = formatServerLocalDateTime(now, serverOffsetMinutes);

  return {
    timezone: 'Asia/Manila',
    serverOffsetMinutes,
    today: {
      start: formatServerLocalDateTime(todayStartUtc, serverOffsetMinutes),
      end: currentServerDateTime,
    },
    week: {
      start: formatServerLocalDateTime(weekStartUtc, serverOffsetMinutes),
      end: currentServerDateTime,
    },
    labels: {
      today: `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`,
      weekStartsMonday: true,
    },
  };
}
