import * as Timespan from './timespan.js';
import { assert, forKeys, splitOn } from './utils.js';

export function schedule(dayLength, dayCount, activities) {
  assert(dayLength >= 0, `dayLength of ${dayLength} is less than zero!`);
  assert(dayCount >= 0, `dayCount of ${dayCount} is less than zero!`);
  
  const timespan = Timespan.create(dayLength * dayCount);
  
  forKeys(activities.daily, (name, activity) => {
    const { start, end } = splitOn(name, ':');
    const from = +start, to = +end;
    const shift = Math.floor(to / dayLength) * dayLength;
    timespan.overwritePeriodically({
      from: from - shift,
      to: to - shift,
      period: dayLength,
      cycles: dayCount + 1,
      activity
    });
  });
  
  forKeys(activities.once, (name, activity) => {
    const { start, end } = splitOn(name, ':');
    timespan.overwrite({
      from: +start,
      to: +end,
      activity
    });
  });
}
