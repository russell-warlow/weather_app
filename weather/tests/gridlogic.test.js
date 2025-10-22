import { expect, test } from 'vitest'

/* 
/home/robert/trunk/weather_app/weather/static/weather/js/main.js
/home/robert/trunk/weather_app/weather/tests/gridlogic.test.js
*/

import { dayDiff, halfDaysBetween, getEndOfFirstPeriod, halfDaysBetweenOnlyDateTimes } from '../static/weather/js/date_lib.js'
import { DateTime } from '../static/weather/vendored/luxon_3.6.1.js'

test('dayDiff, second date before first date', () => {
  let first = DateTime.fromISO('2025-01-01T00:00:00.000Z');
  let second = DateTime.fromISO('2024-12-31T00:00:00.000Z');
  expect(dayDiff(first, second)).toBe(-1);
})

test('dayDiff, same day', () => {
  let first = DateTime.fromISO('2025-01-01T01:00:00.000Z');
  let second = DateTime.fromISO('2025-01-01T02:00:00.000Z');
  expect(dayDiff(first, second)).toBe(0);
})

test('dayDiff, one day apart, <24h, crossing midnight boundary', () => {
  // let first = DateTime.fromISO('2025-01-01T23:00:00.000Z', { zone: 'UTC'});
  // let second = DateTime.fromISO('2025-01-02T01:00:00.000Z', { zone: 'UTC'});

  let first = DateTime.utc(2025, 1, 1, 23, 0, 0);
  let second = DateTime.utc(2025, 1, 2, 1, 0, 0);

  expect(dayDiff(first, second)).toBe(1);
})

test('dayDiff, one day apart, very nearly but less than 24h', () => {
  // let first = DateTime.fromISO('2025-01-01T00:00:00.000Z');
  // let second = DateTime.fromISO('2025-01-02T23:59:59.000Z');

  let first = DateTime.utc(2025, 1, 1);
  let second = DateTime.utc(2025, 1, 2, 23, 59, 59);

  expect(dayDiff(first, second)).toBe(1);
})

test('dayDiff, one day apart, >24h', () => {
  let first = DateTime.fromISO('2025-01-01T00:00:00.001Z', {zone: 'utc'});
  let second = DateTime.fromISO('2025-01-02T23:59:59.999Z', { zone: 'utc'});

  expect(dayDiff(first, second)).toBe(1);
})

test('dayDiff, two days apart', () => {
  let first = DateTime.utc(2025, 1, 1, 1);
  let second = DateTime.utc(2025, 1, 3, 2)

  expect(dayDiff(first, second)).toBe(2);
})

test('dayDiff, two days apart, across months', () => {
  let first = DateTime.utc(2025, 1, 30, 1);
  let second = DateTime.utc(2025, 2, 1, 2);

  expect(dayDiff(first, second)).toBe(2);
})

test('dayDiff, two days apart, across leap day', () => {
  let first = DateTime.fromISO('2024-02-28T01:00:00.000Z', { zone: 'utc'});
  let second = DateTime.fromISO('2024-03-01T02:00:00.000Z', { zone: 'utc'});
  expect(dayDiff(first, second)).toBe(2);
})

test('dayDiff, seven days apart', () => {
  let first = DateTime.fromISO('2024-07-10T01:00:00.000Z', { zone: 'utc'});
  let second = DateTime.fromISO('2024-07-17T01:00:00.000Z', { zone: 'utc'});
  expect(dayDiff(first, second)).toBe(7);
})

test('dayDiff, seven days apart, across month', () => {
  let first = DateTime.fromISO('2024-11-27T00:00:00.000Z', { zone: 'utc'});
  let second = DateTime.fromISO('2024-12-04T00:00:00.000Z', { zone: 'utc'});
  expect(dayDiff(first, second)).toBe(7);
})

test('dayDiff, seven days apart, across month and year', () => {
  let first = DateTime.fromISO('2024-12-28T00:00:00.000Z', { zone: 'utc'});
  let second = DateTime.fromISO('2025-01-04T00:00:00.000Z', { zone: 'utc'});
  expect(dayDiff(first, second)).toBe(7);
})

// have to kind of assume that HH:mm:ss.sss are irrelevant b/c basing logic on trusting isDaytime is set properly
// and b/c i don't know how api.weather.gov determines when is daytime vs nighttime, just have to go with it

test('halfDaysBetween, d1 night + d2 day, same day; d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T23:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2024-05-05T13:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(-1);
})

test('halfDaysBetween, d1 day + d2 day, same day, hour-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-05T10:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(-1);
})

test('halfDaysBetween, d1 day + d2 day, same day, minute-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T13:20:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-05T13:15:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(-1);
})

test('halfDaysBetween, d1 day + d2 day, same day, second-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T13:00:50.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-05T13:00:40.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(-1);
})

test('halfDaysBetween, d1 day + d2 day, same day, hour-wise d2 after d1; zero half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T10:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-05T14:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(0);
})

test('halfDaysBetween, d1 night + d2 night; hour-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T05:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2024-05-05T03:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = false;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(-1);
})

test('halfDaysBetween, d1 night + d2 night; hour-wise d2 after d1; zero half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T00:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2024-05-05T02:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = false;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(0);
})

test('halfDaysBetween, d1 day + d2 day; zero half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T15:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-05T15:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(0);
})

test('halfDaysBetween, d1 day + d2 night, same day; one half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T15:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-05T22:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = false;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(1);
})

test('halfDaysBetween, d1 night + d2 day, diff day; one half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T23:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2024-05-06T11:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(1);
})

test('halfDaysBetween, d1 day + d2 day, +1 calendar day; two half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-06T11:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(2);
})

test('halfDaysBetween, d1 day + d2 night, +1 calendar day; three half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-06T23:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = false;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(3);
})


test('halfDaysBetween, d1 night + d2 day, +1 calendar day; one half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T23:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2024-05-06T11:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(1);
})

test('halfDaysBetween, d1 night + d2 day, +2 calendar days; three half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T20:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2024-05-07T08:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(3);
})

test('halfDaysBetween, d1 day + d2 day, +2 calendar day; four half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-05-07T11:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(4);
})

test('halfDaysBetween, d1 day + d2 night, across leap day + month; five half days', () => {
  let startDate = DateTime.fromISO('2024-02-28T11:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = true;
  let targetDate = DateTime.fromISO('2024-03-01T22:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = false;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(5);
})

test('halfDaysBetween, d1 night + d2 day, across year; three half days', () => {
  let startDate = DateTime.fromISO('2024-12-31T21:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2025-01-02T11:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(3);
})

test('halfDaysBetween, d1 night + d2 night, across month; fourteen half days', () => {
  let startDate = DateTime.fromISO('2025-03-27T18:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2025-04-03T21:00:00.000Z', { zone: 'utc'});
  let targetIsDaytime = false;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(14);
})

test('luxon adding half days by day increments across DST boundary', () => {
  let date = DateTime.local(2025, 3, 9, 1, 0, 0);
  expect(date.plus({ days: 0.5}).toISO()).toBe('2025-03-09T14:00:00.000-07:00');
})

test('luxon adding half days by hour increments across DST boundary', () => {
  let date = DateTime.local(2025, 3, 9, 1, 0, 0);
  expect(date.plus({ hours: 12}).toISO()).toBe('2025-03-09T14:00:00.000-07:00');
})

test('luxon adding full day across DST boundary', () => {
  let date = DateTime.local(2025, 3, 9, 0, 0, 0);
  expect(date.plus({ days: 1}).toISO()).toBe('2025-03-10T00:00:00.000-07:00');
})

test('halfDaysBetween, error when running', () => {
  let startDate = DateTime.fromISO('2024-12-17T02:00:00.000Z', { zone: 'utc'});
  let startIsDaytime = false;
  let targetDate = DateTime.fromISO('2024-12-17T14:00:00Z', { zone: 'utc'});
  let targetIsDaytime = true;
  expect(halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime)).toBe(1);
})

test('dayDiff, error when running', () => {
  let startDate = DateTime.fromISO('2024-12-17T02:00:00.000Z', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-12-17T14:00:00Z', { zone: 'utc'});
  expect(dayDiff(startDate, targetDate)).toBe(0);
})

test('getEndOfFirstPeriod, 6:00 boundary case', () => {
  let dt = DateTime.local(2025, 2, 3, 6, 0, 0);
  let result = getEndOfFirstPeriod(dt);
  let expected = DateTime.local(2025, 2, 3, 18, 0, 0);
  expect(result.toISO()).toBe(expected.toISO());
})

test('getEndOfFirstPeriod, 8:00 -> get afternoon', () => {
  let dt = DateTime.local(2025, 2, 3, 8, 0, 0);
  let result = getEndOfFirstPeriod(dt);
  let expected = DateTime.local(2025, 2, 3, 18, 0, 0);
  expect(result.toISO()).toBe(expected.toISO());
})

test('getEndOfFirstPeriod, 17:00 -> get afternoon', () => {
  let dt = DateTime.local(2025, 2, 3, 17, 0, 0);
  let result = getEndOfFirstPeriod(dt);
  let expected = DateTime.local(2025, 2, 3, 18, 0, 0);
  expect(result.toISO()).toBe(expected.toISO());
})

test('getEndOfFirstPeriod, 18:00 -> get next day 6:00', () => {
  let dt = DateTime.local(2025, 2, 3, 18, 0, 0);
  let result = getEndOfFirstPeriod(dt);
  let expected = DateTime.local(2025, 2, 4, 6, 0, 0);
  expect(result.toISO()).toBe(expected.toISO());
})

test('getEndOfFirstPeriod, 21:00 -> get next day 6:00', () => {
  let dt = DateTime.local(2025, 2, 3, 21, 0, 0);
  let result = getEndOfFirstPeriod(dt);
  let expected = DateTime.local(2025, 2, 4, 6, 0, 0);
  expect(result.toISO()).toBe(expected.toISO());
})

test('getEndOfFirstPeriod, 18:00 boundary case, get next day 6:00', () => {
  let dt = DateTime.local(2025, 2, 3, 18, 0, 0);
  let result = getEndOfFirstPeriod(dt);
  let expected = DateTime.local(2025, 2, 4, 6, 0, 0); 
  expect(result.toISO()).toBe(expected.toISO());
})

test('getEndOfFirstPeriod, try non-local timezone', () => {
  let dt = DateTime.fromObject({ year: 2025, month: 2, day: 3, hour: 19}, { zone: 'America/New_York' });
  let result = getEndOfFirstPeriod(dt);
  let expected = DateTime.fromObject({ year: 2025, month: 2, day: 4, hour: 6}, { zone: 'America/New_York' });
  expect(result.toISO()).toBe(expected.toISO());
})

test('halfDaysBetweenOnlyDateTimes, d1 night + d2 day, same day; d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T23:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T13:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(-1);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 day, same day, hour-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T10:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(-1);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 day, same day, minute-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T13:20:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T13:15:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(-1);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 day, same day, second-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T13:00:50.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T13:00:40.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(-1);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 day, same day, hour-wise d2 after d1; zero half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T10:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T14:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(0);
})

test('halfDaysBetweenOnlyDateTimes, d1 night + d2 night; hour-wise d2 before d1; invalid input', () => {
  let startDate = DateTime.fromISO('2024-05-05T05:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T03:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(-1);
})

test('halfDaysBetweenOnlyDateTimes, d1 night + d2 night; hour-wise d2 after d1; zero half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T00:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T02:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(0);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 day; zero half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T15:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T15:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(0);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 night, same day; one half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T15:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-05T22:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(1);
})

test('halfDaysBetweenOnlyDateTimes, d1 night + d2 day, diff day; one half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T23:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-06T11:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(1);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 day, +1 calendar day; two half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-06T11:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(2);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 night, +1 calendar day; three half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-06T23:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(3);
})


test('halfDaysBetweenOnlyDateTimes, d1 night + d2 day, +1 calendar day; one half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T23:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-06T11:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(1);
})

test('halfDaysBetweenOnlyDateTimes, d1 night + d2 day, +2 calendar days; three half day', () => {
  let startDate = DateTime.fromISO('2024-05-05T20:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-07T08:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(3);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 day, +2 calendar day; four half days', () => {
  let startDate = DateTime.fromISO('2024-05-05T11:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-05-07T11:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(4);
})

test('halfDaysBetweenOnlyDateTimes, d1 day + d2 night, across leap day + month; five half days', () => {
  let startDate = DateTime.fromISO('2024-02-28T11:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2024-03-01T22:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(5);
})

test('halfDaysBetweenOnlyDateTimes, d1 night + d2 day, across year; three half days', () => {
  let startDate = DateTime.fromISO('2024-12-31T21:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2025-01-02T11:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(3);
})

test('halfDaysBetweenOnlyDateTimes, d1 night + d2 night, across month; fourteen half days', () => {
  let startDate = DateTime.fromISO('2025-03-27T18:00:00.000', { zone: 'utc'});
  let targetDate = DateTime.fromISO('2025-04-03T21:00:00.000', { zone: 'utc'});
  expect(halfDaysBetweenOnlyDateTimes(startDate, targetDate)).toBe(14);
})