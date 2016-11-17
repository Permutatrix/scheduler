import * as Timespan from './timespan.js';
import { assert, clone, forKeys, keys, removeAt, splitOn, spread } from './utils.js';

export function schedule({ dayLength, dayCount, activities }) {
  dayLength = dayLength|0;
  dayCount = dayCount|0;
  
  assert(dayLength >= 0, `dayLength of ${dayLength} is less than zero!`);
  assert(dayCount >= 0, `dayCount of ${dayCount} is less than zero!`);
  
  const length = dayLength * dayCount, timespan = Timespan.create(length);
  let patterns = activities.patterns || [activities.pattern];
  const patternCount = Math.min(patterns.length, dayCount);
  let requiresExcludes = Array(patternCount);
  for(let patternIndex = 0; patternIndex < patternCount; ++patternIndex) {
    const pattern = patterns[patternIndex];
    pattern.requires.forEach(x => x.forEach(y => assert(pattern.slots[y],
        `Can't require nonexistent slot "${y}!"`)));
    pattern.excludes.forEach(x => x.forEach(y => assert(pattern.slots[y],
        `Can't exclude nonexistent slot "${y}!"`)));
    requiresExcludes[patternIndex] = pattern && {
      requires: spread(pattern.requires),
      excludes: spread(pattern.excludes)
    };
  }
  const week = activities.week;
  if(week) {
    patterns = week.map(x => patterns[x]);
    requiresExcludes = week.map(x => requiresExcludes[x]);
  }
  const timeSpentSoFar = clone(activities.timeSpentSoFar);
  const allotments = {};
  for(let patternIndex = 0; patternIndex < patternCount; ++patternIndex) {
    forKeys(patterns[patternIndex].slots, (key, { activity }) => {
      const tssf = timeSpentSoFar[activity];
      if(tssf === undefined) {
        timeSpentSoFar[activity] = 0;
      } else {
        assert(tssf === (tssf|0), `Time spent so far of ${tssf} isn't an integer!`);
      }
      if(!allotments[activity]) {
        if(activities.allotments) {
          const allotment = activities.allotments[activity];
          assert(allotment === (allotment|0), `Allotment of ${allotment} isn't an integer!`);
          assert(allotment > 0, `Allotment of ${allotment} isn't greater than zero!`);
          allotments[activity] = allotment;
        } else {
          allotments[activity] = 1;
        }
      }
    });
  }
  
  function adjustTimeSpentSoFar() {
    let minimum = Infinity;
    forKeys(timeSpentSoFar, (key, value) => {
      value = value|0;
      minimum = Math.min(minimum, value / allotments[key]);
    });
    minimum = minimum|0;
    if(minimum > 0) {
      forKeys(timeSpentSoFar, (key, value) => {
        value = value|0;
        timeSpentSoFar[key] = value - minimum * allotments[key];
      });
    }
  }
  
  function createDay(from, to) {
    from = Math.max(from, 0);
    to = Math.min(to, length);
    
    const blocks = [];
    let next = from;
    while(true) {
      const start = timespan.findStartOf({ next, to });
      if(start >= to) {
        break;
      }
      next = timespan.findEnd({ from: start, to });
      blocks.push({ from: start, to: next });
    }
    
    return (function buildDay(blocks) {
      return Object.freeze({
        blocks,
        clone() {
          return buildDay(blocks.map(block => ({
            from: block.from,
            to: block.to
          })));
        }
      });
    })(blocks);
  }
  
  /*
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
  */
  
  for(let dayIndex = 0; dayIndex < dayCount; ++dayIndex) {
    const pattern = patterns[dayIndex % patternCount];
    if(!pattern) {
      continue;
    }
    forKeys(pattern.once, (name, activity) => {
      const { start, end } = splitOn(name, ':');
      timespan.overwrite({
        from: Math.max(+start, 0) + dayIndex * dayLength,
        to: Math.min(+end, dayLength) + dayIndex * dayLength,
        activity
      });
    });
  }
  
  forKeys(activities.once, (name, activity) => {
    const { start, end } = splitOn(name, ':');
    timespan.overwrite({
      from: +start,
      to: +end,
      activity
    });
  });
  
  for(let dayIndex = 0; dayIndex < dayCount; ++dayIndex) {
    const pattern = patterns[dayIndex % patternCount];
    if(!pattern) {
      continue;
    }
    const { requires, excludes } = requiresExcludes[dayIndex % patternCount];
    const { slots } = pattern;
    const day = createDay(dayIndex * dayLength, dayIndex * dayLength + dayLength);
    const dayLength = day.blocks.reduce((l, b) => l + b.to - b.from, 0);
    adjustTimeSpentSoFar();
    const probabilities = {};
    forKeys(timeSpentSoFar, (key, value) => {
      
    });
    while(true) {
      const includedSlots = [], pendingSlots = keys(slots);
      let minimumTime = 0;
      while(true) {
        const previousMinimumTime = minimumTime;
        let newSlot;
        while(true) {
          newSlot = pendingSlots[(Math.random() * pendingSlots.length)|0];
        }
      }
    }
  }
}
