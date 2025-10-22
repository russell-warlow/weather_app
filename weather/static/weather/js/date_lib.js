import { DateTime }  from "../vendored/luxon_3.6.1.js";

// assumptions ... accepts DateTime objects
// what does this function do?
export function dayDiff(start, end) {
  if (start > end) {
    return -1;
  }
  
  // this is the main issue here ... need to calculate day diff based on specific time zone and not utc
  // let standard1 = new Date(Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate()));
  // let standard2 = new Date(Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate()));

  let standard1 = DateTime.fromObject({ year: start.year, month: start.month, day: start.day}, { zone: start.zoneName });
  let standard2 = DateTime.fromObject({ year: end.year, month: end.month, day: end.day}, { zone: end.zoneName });
  const msPerDay = (24*60*60*1000);
  return (standard2 - standard1)/msPerDay;
}

/*

have first date, first isDaytime, and when first forecast generated at
given a forecast (date + isDaytime), calculate how many half days between it and the grid's first forecast

maybe just use day diff and then some minor is daytime math?
so if start is day, end is night; then has to be +1?
start is night, end is day; then has to be +1?  

1/1 night, 1/1 day => 1 half day; date diff 0
1/1 night, 1/2 day => 1 half day; date diff 1
1/1 night, 1/3 day => 3 half days; date diff 2
1/1 night, 1/4 day => 5 half days; date diff 3

so 2*(dateDiff)-1 is the trick, unless 

===========

1/1 day, 1/1 night => 1 half day; date diff: 0
1/1 day, 1/2 night => 3 half day; date diff: 1
1/1 day, 1/3 night => 5 half day; date diff: 2
1/1 day, 1/4 night => 7 half day; date diff: 3

base edge case is a bit different (subtle)

so 2*(dayDiff)+1 is the trick?



*/

// NOTE: assumption that parameters are DateTime objects
// TO-DO: should return -1 or throw an error?
export function halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime) {
  console.log(`startDate: ${startDate}, startIsDaytime: ${startIsDaytime}, targetDate: ${targetDate}, targetIsDaytime: ${targetIsDaytime}`);
  let daysBetween = dayDiff(startDate, targetDate);
  if (daysBetween === -1) {
    return -1;
  }
  if (startDate.zoneName !== targetDate.zoneName) {
    return -1;
  }

  // start is day, target is night
  if(startIsDaytime && !targetIsDaytime) {
    return 2*daysBetween + 1;
  } 
  // start is night, target is day
  else if (!startIsDaytime && targetIsDaytime) {
    if(daysBetween === 0) {
      return 1;
    }
    return 2*daysBetween - 1;
  }
  return daysBetween*2;
}

/*
key point: half day defined as crossing thee 6:00 or 18:00 boundary 

 a bit trickier, seeking an alternative solution
assume first period ends at either 6pm or 6am in the given timezone, and that 
subsequent periods follow a 12 hour model (what about crossing DST boundary ... ? taken care of by the timezone

sanity checks
get hour of first day, calculate ending of first time period
then keep adding 1/2 days until you past targetDate

assumes both dates are same time zone

sanity check, if startdate is later than targetdate, return -1
else get 

*/
export function halfDaysBetweenOnlyDateTimes(startDate, endDate) {
  if (startDate > endDate) {
    return -1;
  }
  if (startDate === endDate) {
    return 0;
  }
  if (startDate.zoneName !== endDate.zoneName) {
    return -1;
  }
  let halfDays = 0;
  let nextPeriodEnd = getEndOfFirstPeriod(startDate);
  while(nextPeriodEnd < endDate) {
    nextPeriodEnd = nextPeriodEnd.plus({days: 0.5});
    halfDays += 1;
  }
  return halfDays;
}

// if hour is ... 18-23 or 0-5 then 6:00 is the next time
// if hour is 6-17 then 18:00 is the end of the next time
export function getEndOfFirstPeriod(dt) {
  let hour = dt.hour;
  // make a copy?
  if (hour >= 18) {
    return dt.plus({days: 1}).set({hour: 6})
  }
  else if(hour <= 5) {
    return dt.set({hour: 6});
  }
  else {
    return dt.set({hour: 18});
  }
}