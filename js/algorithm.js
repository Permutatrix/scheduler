import * as Timespan from './timespan.js';
import { assert, clone, forKeys, hasOwnProperty, keys, removeAt, splitOn, spread } from './utils.js';

/*
{
  dayLength: xx,
  dayCount: xx,
  activities: {
    pattern: {
      slots: {
        a: {
          activity: 'activity 1',
          preferredTime: xx,
          minimumTime: xx,
          maximumTime: xx,
        },
        ...
      },
      requires: [
        // if one of a, b, or c is included, the others must be as well.
        ['a', 'b', 'c'],
      ],
      excludes: [
        // if one of x, y, or z is included, the others must not be.
        ['x', 'y', 'z'],
      ],
      nonoptional: [
        // c will always be included. since it requires a & b, they will, too.
        'c',
      ],
      once: {
        // range [ss,ee) relative to the day's start will always be activity 1.
        'ss:ee': 'activity 1',
      },
    },
    // or more than one pattern. `patterns: [...],`
    once: {
      // range [ss,ee) will be activity 1. patterns will work around it.
      'ss:ee': 'activity 1',
    },
    // if specified, overrides the array of patterns.
    // this would map `patterns: [a, b, c]` to `[a, b, b, a]`.
    week: [0, 1, 1, 0],
    timeSpentSoFar: {
      'activity 1': 12,
      'activity 2': 17,
      ...
    },
    allotments: {
      // the algorithm will attempt to allocate about two-thirds as much time
      // to activity 1 as to activity 2.
      'activity 1': 2,
      'activity 2': 3,
      ...
    },
  },
}
*/

export function schedule({ dayLength, dayCount, activities }) {
  dayLength = dayLength|0;
  dayCount = dayCount|0;
  
  assert(dayLength >= 0, "dayLength of ",dayLength," is less than zero!");
  assert(dayCount >= 0, "dayCount of ",dayCount," is less than zero!");
  
  const length = dayLength * dayCount, timespan = Timespan.create(length);
  let patterns = activities.patterns || [activities.pattern];
  let patternCount = patterns.length;
  let requiresExcludes = Array(patternCount);
  let patternSlotsInBetween = Array(patternCount);
  for(let patternIndex = 0; patternIndex < patternCount; ++patternIndex) {
    const pattern = patterns[patternIndex];
    if(!pattern) {
      requiresExcludes[patternIndex] = undefined;
      continue;
    }
    if(pattern.requires) {
      pattern.requires.forEach(x => x.forEach(y => assert(pattern.slots[y],
          "Can't require nonexistent slot \"",y,"\"!")));
    }
    if(pattern.excludes) {
      pattern.excludes.forEach(x => x.forEach(y => assert(pattern.slots[y],
          "Can't exclude nonexistent slot \"",y,"\"!")));
    }
    requiresExcludes[patternIndex] = {
      requires: spread(pattern.requires),
      excludes: spread(pattern.excludes),
    };
    const between = patternSlotsInBetween[patternIndex] = {};
    const lastForActivity = {};
    forKeys(pattern.slots, (slot, { activity }) => {
      const tween = between[slot] = [];
      const lfa = lastForActivity[activity];
      if(lfa !== undefined) {
        tween.push(lfa);
        between[lfa.sister].push({
          sister: slot,
          tweens: lfa.tweens,
        });
      }
      lastForActivity[activity] = { sister: slot, tweens: [] };
      forKeys(lastForActivity, (otherActivity, lfa) => {
        if(otherActivity !== activity) {
          lfa.tweens.push(slot);
        }
      });
    });
  }
  const week = activities.week;
  if(week) {
    patterns = week.map(x => patterns[x]);
    requiresExcludes = week.map(x => requiresExcludes[x]);
    patternSlotsInBetween = week.map(x => patternSlotsInBetween[x]);
    patternCount = Math.min(patterns.length, dayCount);
  }
  const timeSpentSoFar = clone(activities.timeSpentSoFar);
  const allotments = {};
  let greatestAllotment = 1;
  for(let patternIndex = 0; patternIndex < patternCount; ++patternIndex) {
    forKeys(patterns[patternIndex].slots, (key, { activity }) => {
      if(hasOwnProperty.call(timeSpentSoFar, activity)) {
        const tssf = timeSpentSoFar[activity];
        assert(tssf === (tssf|0), "Time spent so far of ",tssf," isn't an integer!");
      } else {
        timeSpentSoFar[activity] = 0;
      }
      if(!allotments[activity]) {
        if(activities.allotments) {
          const allotment = activities.allotments[activity];
          assert(allotment === (allotment|0), "Allotment of ",allotment," isn't an integer!");
          assert(allotment > 0, "Allotment of ",allotment," isn't greater than zero!");
          allotments[activity] = allotment;
          if(allotment > greatestAllotment) {
            greatestAllotment = allotment;
          }
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
      const start = timespan.findStartOf({ from: next, to });
      if(start >= to) {
        break;
      }
      next = timespan.findEnd({ from: start, to });
      blocks.push({ from: start, to: next });
    }
    
    blocks.reverse();
    
    return (function buildDay(blocks) {
      return {
        blocks,
        allocate({ length, activity }) {
          // Returns the amount of length that couldn't fit.
          while(true) {
            if(!blocks.length) {
              return length;
            }
            const block = blocks[blocks.length - 1];
            const blockLength = block.to - block.from;
            if(blockLength > length) {
              timespan.overwrite({
                from: block.from,
                to: block.from += length,
                activity: activity,
              });
              timeSpentSoFar[activity] = (timeSpentSoFar[activity]|0) + length;
              return 0;
            } else {
              timespan.overwrite({
                from: block.from,
                to: block.to,
                activity: activity,
              });
              length -= blockLength;
              timeSpentSoFar[activity] = (timeSpentSoFar[activity]|0) + blockLength;
              blocks.pop();
            }
          }
        },
        clone() {
          return buildDay(blocks.map(block => ({
            from: block.from,
            to: block.to,
          })));
        },
        wipe() {
          // TODO: clean up timeSpentSoFar
          blocks.forEach(timespan.overwrite);
        },
      };
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
      activity,
    });
  });
  */
  
  for(let dayIndex = 0; dayIndex < dayCount; ++dayIndex) {
    const pattern = patterns[dayIndex % patternCount];
    if(!pattern) {
      continue;
    }
    forKeys(pattern.once, (name, activity) => {
      const { startS, endS } = splitOn(name, ':');
      const start = +startS, end = +endS;
      timespan.overwrite({
        from: Math.max(start, 0) + dayIndex * dayLength,
        to: Math.min(end, dayLength) + dayIndex * dayLength,
        activity,
      });
      timeSpentSoFar[activity] = (timeSpentSoFar[activity]|0) + (end - start);
    });
  }
  
  forKeys(activities.once, (name, activity) => {
    const { startS, endS } = splitOn(name, ':');
    const start = +startS, end = +endS;
    timespan.overwrite({
      from: start,
      to: end,
      activity,
    });
    timeSpentSoFar[activity] = (timeSpentSoFar[activity]|0) + (end - start);
  });
  
  for(let dayIndex = 0; dayIndex < dayCount; ++dayIndex) {
    const pattern = patterns[dayIndex % patternCount];
    if(!pattern) {
      continue;
    }
    
    const { requires, excludes } = requiresExcludes[dayIndex % patternCount];
    const between = patternSlotsInBetween[dayIndex % patternCount];
    const { slots, nonoptional } = pattern;
    
    adjustTimeSpentSoFar();
    const probabilities = {};
    forKeys(allotments, (key, allotment) => {
      probabilities[key] = allotment * Math.pow(0.85, timeSpentSoFar[key] * greatestAllotment / allotment);
    });
    
    const emptyDay = createDay(dayIndex * dayLength, dayIndex * dayLength + dayLength);
    const currentDayLength = emptyDay.blocks.reduce((l, b) => l + b.to - b.from, 0);
    
    // This is in a while(true) loop to allow failing and retrying.
    // That isn't currently taken advantage of, so the loop only runs once.
    while(true) {
      let includedSlots = [], pendingSlots = [], numberOfSlotsForActivity = {};
      forKeys(slots, (key, value) => {
        pendingSlots.push(key);
        numberOfSlotsForActivity[value.activity] = (numberOfSlotsForActivity[value.activity]|0) + 1;
      });
      
      let minimumTime = 0, preferredTime = 0;
      
      const exclude = function exclude(slot) {
        const index = pendingSlots.indexOf(slot);
        if(index !== -1) {
          removeAt(pendingSlots, index);
          numberOfSlotsForActivity[slot] -= 1;
          const requirements = requires[slot];
          requirements && requirements.forEach(exclude);
        }
      };
      
      const add = function add(slot, lenient) {
        const index = pendingSlots.indexOf(slot);
        if(index === -1 && lenient) {
          return;
        }
        assert(index !== -1, "Slot \"",slot,"\" was not pending!");
        
        removeAt(pendingSlots, index);
        
        includedSlots.push(slot);
        const slotObj = slots[slot];
        preferredTime += slotObj.preferredTime;
        minimumTime += slotObj.minimumTime;
        
        const requirements = requires[slot], exclusions = excludes[slot];
        exclusions && exclusions.forEach(exclude);
        requirements && requirements.forEach(slot => add(slot, true));
      };
      
      if(nonoptional) {
        nonoptional.forEach(add);
      }
      assert(minimumTime <= currentDayLength,
             "Non-optional slots add up to at least ", minimumTime,
             "; day length is only ", currentDayLength, "!");
      
      while(preferredTime < currentDayLength && pendingSlots.length) {
        const previous = {
          minimumTime,
          preferredTime,
          includedSlots: includedSlots.slice(),
          pendingSlots: pendingSlots.slice(),
          numberOfSlotsForActivity: clone(numberOfSlotsForActivity),
        };
        
        let greatestProbability = 0;
        forKeys(probabilities, (activity, probability) => {
          if(probability > greatestProbability && pendingSlots.some(key => slots[key].activity === activity)) {
            greatestProbability = probability;
          }
        });
        
        let newSlot, iterations = 0;
        do {
          newSlot = pendingSlots[(Math.random() * pendingSlots.length)|0];
        } while(++iterations <= 1000 && (
                Math.random() >=
                (probabilities[slots[newSlot].activity] / greatestProbability) /
                numberOfSlotsForActivity[slots[newSlot].activity] ||
                between[newSlot].some(({ sister, tweens }) => includedSlots.indexOf(sister) !== -1 && tweens.every(tween => includedSlots.indexOf(tween) === -1))
              ));
        
        add(newSlot);
        if(minimumTime > currentDayLength) {
          ({
            minimumTime,
            preferredTime,
            includedSlots,
            pendingSlots,
            numberOfSlotsForActivity,
          } = previous);
          exclude(newSlot);
        }
      }
      
      // Clone emptyDay instead of just moving it if fail/retry is implemented.
      const day = emptyDay;
      
      const allocatedSlots = [];
      const unallocatedSlots = includedSlots.map(slot => ({
        slotName: slot,
        slotObj: slots[slot],
        time: slots[slot].preferredTime,
      }));
      let bleed = 0;
      while(unallocatedSlots.length) {
        const currentTime = unallocatedSlots.reduce((t, s) => t + s.time, 0) +
                              allocatedSlots.reduce((t, s) => t + s.time, 0);
        if(currentTime === currentDayLength) {
          break;
        }
        const makeup = (currentDayLength - currentTime) / unallocatedSlots.length;
        for(let slotIndex = 0; slotIndex < unallocatedSlots.length;) {
          const slot = unallocatedSlots[slotIndex];
          const goalTime = slot.time + makeup + bleed;
          const actualTime = slot.time = (goalTime + 0.5)|0;
          bleed = goalTime - actualTime;
          const { slotObj } = slot;
          if(actualTime > slotObj.maximumTime) {
            slot.time = slotObj.maximumTime;
            removeAt(unallocatedSlots, slotIndex);
            allocatedSlots.push(slot);
          } else if(actualTime < slotObj.minimumTime) {
            slot.time = slotObj.minimumTime;
            removeAt(unallocatedSlots, slotIndex);
            allocatedSlots.push(slot);
          } else {
            ++slotIndex;
          }
        }
      }
      allocatedSlots.push.apply(allocatedSlots, unallocatedSlots);
      const slotTimes = {};
      allocatedSlots.forEach(({ slotName, time }) => {
        slotTimes[slotName] = time;
      });
      
      forKeys(slots, (key, slot) => {
        const time = slotTimes[key];
        if(time) {
          day.allocate({ length: time, activity: slot.activity });
        }
      });
      
      break;
      // Wipe emptyDay before retrying if fail/retry is implemented.
      // Also restore timeSpentSoFar.
    }
  }
  
  return timespan;
}
