import { schedule } from './algorithm.js';
import * as Timespan from './timespan.js';
import { parseTimestampAsSeconds } from './utils.js';
import Ractive from 'ractive';
import MainView from '../view/main.ractive';

import Heading from '../view/heading.ractive';
import DisguisedInput from '../view/disguised-input.ractive';
import DisguisedSelect from '../view/disguised-select.ractive';

import ClampedNumber from './decorators/clamped-number.js';
import RGB from './decorators/rgb.js';
import Label from './decorators/label.js';
import PreSelected from './decorators/pre-selected.js';
import Button from './decorators/button.js';
import ContextMenu from './decorators/context-menu.js';
import { default as ListOfOneBasedLists, refresh as refreshLOOBLs } from './decorators/list-of-one-based-lists.js';

import isDebugBuild from 'is-debug-build';

Ractive.DEBUG = isDebugBuild;

window.addEventListener('load', function() {
  let dpr = 0;
  function onResize() {
    const newDPR = window.devicePixelRatio || 1;
    if(newDPR !== dpr) {
      dpr = newDPR;
      document.body.style.setProperty('--physical-pixel', (1 / newDPR) + 'px');
    }
  }
  onResize();
  window.addEventListener('resize', onResize);
  
  const ractive = window.rct = new MainView({
    el: document.body,
    data: {
      cssColorFromRGB({ r, g, b }) {
        function convert(v) {
          return Math.round(v * 255);
        }
        
        return `rgb(${convert(r)}, ${convert(g)}, ${convert(b)})`;
      },
      isDark({ r, g, b }) {
        // http://alienryderflex.com/hsp.html
        return (0.299*r*r + 0.587*g*g + 0.114*b*b) < 0.25;
      },
      formatDuration(duration) {
        duration = duration * this.get('timespan.dayLengthInSeconds') / this.get('timespan.dayLength');
        const seconds = Math.round(duration % 60);
        duration = (duration / 60)|0;
        const minutes = duration % 60;
        duration = (duration / 60)|0;
        let out = "";
        if(duration) out += duration + "h";
        if(minutes) out += minutes + "m";
        if(seconds) out += seconds + "s";
        return out;
      },
      
      level: 1,
      inputs: {
        dayCount: 7,
        slotsPerDay: 28,
        dayStart: '9:00',
        dayEnd: '23:00',
        firstDay: new Date().toDateString(),
        activities: [
          {
            name: "activity 1",
            color: { r: 0.85, g: 0.85, b: 0.85 },
            allotment: 1,
            timeSpentSoFar: 0,
          },
          {
            name: "activity 2",
            color: { r: 0.2, g: 0.3, b: 0.9 },
            allotment: 2,
            timeSpentSoFar: 0,
          },
        ],
        patterns: [
          {
            name: "pattern 1",
            slots: [
              {
                activity: 0,
                preferredTime: 6,
                minimumTime: 1,
                maximumTime: 12,
                optional: true,
              },
              {
                activity: 1,
                preferredTime: 6,
                minimumTime: 1,
                maximumTime: 12,
                optional: true,
              },
              {
                activity: 0,
                preferredTime: 6,
                minimumTime: 1,
                maximumTime: 12,
                optional: true,
              },
              {
                activity: 1,
                preferredTime: 6,
                minimumTime: 1,
                maximumTime: 12,
                optional: true,
              },
            ],
            requires: [
              
            ],
            excludes: [
              [0, 2],
              [1, 3],
            ],
            once: [],
          },
        ],
        selectedPattern: -1,
        week: [],
        once: [],
      },
      timespan: {
        data: null,
        rawSelection: {
          start: NaN,
          end: NaN,
        },
        hoursWidth: 40,
        dayWidth: 150,
        dayLength: 24,
        dayLengthInSeconds: 24*60*60,
        hours: [],
        days: [],
      },
    },
    computed: {
      selectionStart() {
        return Math.min(this.get('timespan.rawSelection.start'),
                        this.get('timespan.rawSelection.end'));
      },
      selectionEnd() {
        return Math.max(this.get('timespan.rawSelection.start'),
                        this.get('timespan.rawSelection.end')) + 1;
      },
    },
    components: {
      Heading,
      DisguisedInput,
      DisguisedSelect,
    },
    decorators: {
      ClampedNumber,
      RGB,
      Label,
      PreSelected,
      Button,
      ContextMenu,
      ListOfOneBasedLists,
    },
  });
  
  function kp(out) {
    for(let i = 1; i < arguments.length; ++i) {
      out += '.';
      out += arguments[i];
    }
    return out;
  }
  
  function adjustForRemoval(keypath, index, propertyName) {
    const array = ractive.get(keypath);
    for(let i = 0; i < array.length; ++i) {
      const v = propertyName ? array[i][propertyName] : array[i];
      if(v === index) {
        ractive.splice(keypath, i--, 1);
      } else if(v > index) {
        if(propertyName) {
          ractive.set(kp(keypath, i, propertyName), v - 1);
        } else {
          ractive.set(kp(keypath, i), v - 1);
        }
      }
    }
  }
  
  function adjustForInsertion(keypath, index, propertyName) {
    const array = ractive.get(keypath);
    for(let i = 0; i < array.length; ++i) {
      const v = propertyName ? array[i][propertyName] : array[i];
      if(v >= index) {
        if(propertyName) {
          ractive.set(kp(keypath, i, propertyName), v + 1);
        } else {
          ractive.set(kp(keypath, i), v + 1);
        }
      }
    }
  }
  
  function adjustForPatternSlot(adjustForX, arr, index) {
    const patternPath = arr.slice(0, arr.lastIndexOf('.'));
    const requiresCount = ractive.get(kp(patternPath, 'requires')).length;
    for(let i = 0; i < requiresCount; ++i) {
      adjustForX(kp(patternPath, 'requires', i), index);
    }
    const excludesCount = ractive.get(kp(patternPath, 'excludes')).length;
    for(let i = 0; i < excludesCount; ++i) {
      adjustForX(kp(patternPath, 'excludes', i), index);
    }
  }
  
  ractive.on('duplicate-pattern-slot', (info, node) => {
    const keypath = info.resolve(), dot = keypath.lastIndexOf('.');
    // workaround for a bug in Ractive I'll hopefully never have to deal with again
    const arr = Ractive.getNodeInfo(node.closest('.pattern')).resolve() + '.slots';
    const index = +keypath.slice(dot+1);
    const dupe = Object.assign({}, info.get());
    ractive.splice(arr, index + 1, 0, dupe);
    
    adjustForPatternSlot(adjustForInsertion, arr, index + 1);
  });
  
  ractive.on('remove-pattern-slot', (info, node) => {
    const keypath = info.resolve(), dot = keypath.lastIndexOf('.');
    const arr = Ractive.getNodeInfo(node.closest('.pattern')).resolve() + '.slots';
    const index = +keypath.slice(dot+1);
    
    adjustForPatternSlot(adjustForRemoval, arr, index);
    
    ractive.splice(arr, index, 1);
  });
  
  ractive.on('toggle-pattern-slot-optional', info => {
    info.toggle('optional');
  });
  
  function adjustForActivity(adjustForX, index) {
    const patternCount = ractive.get('inputs.patterns').length;
    for(let i = 0; i < patternCount; ++i) {
      adjustForX(kp('inputs.patterns', i, 'slots'), index, 'activity');
      adjustForX(kp('inputs.patterns', i, 'once'), index, 'activity');
    }
    adjustForX('inputs.once', index, 'activity');
  }
  
  ractive.on('duplicate-activity', info => {
    const keypath = info.resolve(), dot = keypath.lastIndexOf('.');
    const arr = keypath.slice(0, dot), index = +keypath.slice(dot+1);
    const dupe = Object.assign({}, info.get());
    ractive.splice(arr, index + 1, 0, dupe);
    
    adjustForActivity(adjustForInsertion, index + 1);
  });
  
  ractive.on('remove-activity', info => {
    const keypath = info.resolve(), dot = keypath.lastIndexOf('.');
    const arr = keypath.slice(0, dot), index = +keypath.slice(dot+1);
    
    adjustForActivity(adjustForRemoval, index);
    
    ractive.splice(arr, index, 1);
  });
  
  function adjustForPattern(adjustForX, index) {
    adjustForX('inputs.week', index);
    
    const selectedPattern = ractive.get('inputs.selectedPattern');
    if(adjustForX === adjustForRemoval && selectedPattern === index) {
      ractive.set('inputs.selectedPattern', -1);
    } else if(selectedPattern >= index) {
      const plus = adjustForX === adjustForRemoval ? -1 : 1;
      ractive.set('inputs.selectedPattern', selectedPattern + plus);
    }
  }
  
  ractive.on('duplicate-pattern', info => {
    const keypath = info.resolve(), dot = keypath.lastIndexOf('.');
    const arr = keypath.slice(0, dot), index = +keypath.slice(dot+1);
    const dupe = JSON.parse(JSON.stringify(info.get()));
    ractive.splice(arr, index + 1, 0, dupe);
    
    adjustForPattern(adjustForInsertion, index + 1);
  });
  
  ractive.on('remove-pattern', info => {
    const keypath = info.resolve(), dot = keypath.lastIndexOf('.');
    const arr = keypath.slice(0, dot), index = +keypath.slice(dot+1);
    
    adjustForPattern(adjustForRemoval, index);
    
    ractive.splice(arr, index, 1);
  });
  
  ractive.on('select-pattern', i => {
    if(ractive.get('inputs.selectedPattern') === i) {
      ractive.set('inputs.selectedPattern', -1);
    } else {
      ractive.set('inputs.selectedPattern', i);
      refreshLOOBLs();
    }
  });
  
  function generateDaySlots(timespan, dayStart, dayEnd, colors) {
    let time = dayStart;
    const slots = [];
    while(time < dayEnd) {
      const activity = timespan.get(time);
      slots.push({
        start: time - dayStart,
        color: activity ? colors[activity] : { r: 0, g: 0, b: 0 },
        activity: activity || "",
      });
      time = timespan.findEnd({ from: time, to: dayEnd });
    }
    return slots;
  }
  
  ractive.on('generate-schedule', () => {
    const timeSpentSoFar = {}, allotments = {}, colors = {};
    const activities = ractive.get('inputs.activities');
    activities.forEach(({ name, color, allotment, timeSpentSoFar: tssf }) => {
      timeSpentSoFar[name] = tssf;
      allotments[name] = allotment;
      colors[name] = color;
    });
    const existingDays = ractive.get('timespan.days');
    const existingTimespan = ractive.get('timespan.data');
    let existingLength = 0;
    if(existingTimespan) {
      existingLength = existingTimespan.length;
      for(let time = 0; time < existingLength;) {
        const endTime = existingTimespan.findEnd({ from: time });
        const activity = existingTimespan.get(time);
        if(typeof timeSpentSoFar[activity] === 'number') {
          timeSpentSoFar[activity] += endTime - time;
        }
        time = endTime;
      }
    }
    // TODO: handle cases where the existing timespan ends in the middle of a pattern cycle.
    const options = {
      patterns: ractive.get('inputs.patterns').map(pattern => {
        const patternSlots = pattern.slots, slots = {}, nonoptional = [];
        for(let i = 0; i < patternSlots.length; ++i) {
          const index = '' + i;
          const ps = patternSlots[i];
          slots[index] = {
            activity: activities[ps.activity].name,
            preferredTime: ps.preferredTime,
            minimumTime: ps.minimumTime,
            maximumTime: ps.maximumTime,
          };
          if(!ps.optional) {
            nonoptional.push(index);
          }
        }
        return {
          slots,
          requires: pattern.requires.map(list => list.map(x => '' + x)),
          excludes: pattern.excludes.map(list => list.map(x => '' + x)),
          nonoptional,
          once: {},
        };
      }),
      once: {},
      timeSpentSoFar,
      allotments,
    };
    const dayLength = ractive.get('inputs.slotsPerDay');
    const dayCount = ractive.get('inputs.dayCount');
    const timespan = schedule({
      dayLength,
      dayCount,
      activities: options,
    });
    const days = [];
    let timeValue = new Date(ractive.get('inputs.firstDay')).getTime() + 1000*60*60*24*existingDays.length;
    for(let time = 0; time < dayLength * dayCount; timeValue += 1000*60*60*24) {
      const dayStart = time, dayEnd = time + dayLength;
      const date = new Date(timeValue);
      days.push({
        name: date.toDateString(),
        date,
        start: dayStart + existingLength,
        end: dayEnd + existingLength,
        slots: generateDaySlots(timespan, dayStart, dayEnd, colors),
      });
      time = dayEnd;
    }
    const { hoursWidth, dayWidth } = ractive.get('timespan');
    const slotsPerDay = ractive.get('inputs.slotsPerDay');
    const dayStart = parseTimestampAsSeconds(ractive.get('inputs.dayStart'))|0;
    const dayEnd = parseTimestampAsSeconds(ractive.get('inputs.dayEnd')) || 24*60*60;
    const dayLengthInSeconds = dayEnd - dayStart;
    const hours = [];
    for(let i = 0; i < slotsPerDay; i += 2) {
      const time = i * dayLengthInSeconds / dayLength + dayStart;
      hours.push({
        start: i,
        name: `${time/60/60|0}:${('0'+((time/60|0)%60)).slice(-2)}`,
      });
    }
    if(existingTimespan) {
      const newTimespan = existingTimespan.resize(existingLength + timespan.length);
      newTimespan.copyFrom({ other: timespan, start: existingLength });
      ractive.set('timespan.data', newTimespan);
      ractive.push('timespan.days', ...days);
    } else {
      ractive.set('timespan', {
        data: timespan,
        hoursWidth,
        dayWidth,
        dayLength: slotsPerDay,
        dayLengthInSeconds,
        hours,
        days,
      });
    }
  });
  
  ractive.on('absorb-schedule', () => {
    const timespan = ractive.get('timespan.data');
    if(!timespan) {
      return;
    }
    const days = ractive.get('timespan.days');
    const dayLength = ractive.get('timespan.dayLength');
    let endDay = Math.ceil(ractive.get('selectionEnd') / dayLength);
    if(Number.isNaN(endDay) || Number.isNaN(+ractive.get('selectionStart'))) {
      endDay = days.length;
    }
    const additions = {};
    for(let time = 0; time < endDay * dayLength;) {
      const endTime = timespan.findEnd({ from: time, to: endDay * dayLength });
      const length = endTime - time, activity = timespan.get(time);
      additions[activity] = (additions[activity]|0) + length;
      time = endTime;
    }
    const activities = ractive.get('inputs.activities');
    for(let i = 0; i < activities.length; ++i) {
      const addition = additions[activities[i].name];
      if(addition) {
        ractive.add('inputs.activities.'+i+'.timeSpentSoFar', addition);
      }
    }
    ractive.set('inputs.firstDay', new Date(new Date(ractive.get('inputs.firstDay')).getTime() + 1000*60*60*24*endDay).toDateString());
    if(endDay !== days.length) {
      days.splice(0, endDay);
      for(let i = 0, len = days.length; i < len; ++i) {
        days[i].start -= endDay * dayLength;
        days[i].end -= endDay * dayLength;
      }
      ractive.update('timespan.days');
      const newTimespan = Timespan.create(days.length * dayLength);
      newTimespan.copyFrom({ other: timespan, from: endDay * dayLength });
      ractive.set('timespan.data', newTimespan);
      ractive.set('timespan.rawSelection', { start: NaN, end: NaN });
    } else {
      ractive.set('timespan.data', null);
      ractive.set('timespan.days', []);
    }
  });
  
  ractive.on('discard-schedule', () => {
    let timespan = ractive.get('timespan.data');
    if(!timespan) {
      return;
    }
    const selectionStart = +ractive.get('selectionStart'),
          selectionEnd = +ractive.get('selectionEnd');
    if(selectionEnd > selectionStart) {
      const dayLength = ractive.get('timespan.dayLength');
      const startDay = Math.floor(selectionStart / dayLength);
      const endDay = Math.ceil(selectionEnd / dayLength);
      const dayCount = endDay - startDay;
      const days = ractive.get('timespan.days');
      for(let i = endDay, len = days.length; i < len; ++i) {
        days[i - dayCount].slots = days[i].slots;
      }
      days.length -= dayCount;
      ractive.update('timespan.days');
      timespan.copyFrom({ from: endDay * dayLength, start: startDay * dayLength });
      ractive.set('timespan.data', timespan = timespan.resize(timespan.length - dayCount * dayLength));
      ractive.set('timespan.rawSelection', { start: NaN, end: NaN });
    } else {
      ractive.set('timespan.data', null);
      ractive.set('timespan.days', []);
    }
  });
  
  ractive.on('selectionStart selectionProgress', event => {
    if(event.original.buttons & 1) {
      // TODO: Oh, no! Magic number 20?!?!
      const slot = (event.original.offsetY / 20 + event.get('start'))|0;
      if(event.name === 'selectionStart') {
        ractive.set('timespan.rawSelection.start', slot);
      }
      ractive.set('timespan.rawSelection.end', slot);
      event.original.preventDefault();
      event.original.stopPropagation();
    }
  });
  
  document.body.addEventListener('mousedown', event => {
    if((event.buttons & 1) && event.target.tagName !== 'BUTTON') {
      ractive.set('timespan.rawSelection', { start: NaN, end: NaN });
    }
  });
  
  function updateSlots(timespan, startTime, endTime) {
    const dayLength = ractive.get('timespan.dayLength');
    const startDay = Math.floor(startTime / dayLength);
    const endDay = Math.ceil(endTime / dayLength);
    const colors = {};
    ractive.get('inputs.activities').forEach(({ name, color }) => {
      colors[name] = color;
    });
    for(let i = startDay; i < endDay; ++i) {
      ractive.set(kp('timespan.days', i, 'slots'), generateDaySlots(timespan, i * dayLength, (i + 1) * dayLength, colors));
    }
  }
  
  ractive.on('apply-activity', info => {
    const selectionStart = +ractive.get('selectionStart');
    const selectionEnd = +ractive.get('selectionEnd');
    if(selectionEnd > selectionStart) {
      const activity = info ? info.get('name') : undefined;
      const timespan = ractive.get('timespan.data');
      timespan.overwrite({ from: selectionStart, to: selectionEnd, activity });
      updateSlots(timespan, selectionStart, selectionEnd);
    }
  });
  
  window.addEventListener('keypress', event => {
    if(event.key === 'Delete') {
      ractive.fire('apply-activity', false);
    }
  });
  
  ractive.on('save-to-file', () => {
    const json = JSON.stringify(ractive.get(), function(key, value) {
      // root
      if(key === 'level' || key === 'selectionStart' || key === 'selectionEnd') {
        return;
      }
      // root.timespan
      if(key === 'rawSelection' || key === 'data') {
        return;
      }
      // root.timespan.days.*.slots.*
      if(key === 'color' && typeof this.start === 'number') {
        return;
      }
      return value;
    }, 2);
    window.open('data:application/json;charset=utf-8,' + encodeURIComponent(json));
  });
  
  ractive.on('load-from-file', () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.addEventListener('change', () => {
      const file = input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        let data;
        try {
          data = JSON.parse(reader.result);
          data.timespan.rawSelection = { start: NaN, end: NaN };
          const { days, dayLength } = data.timespan;
          const timespan = data.timespan.data = Timespan.create(days.length * dayLength);
          const colors = {};
          data.inputs.activities.forEach(({ name, color }) => {
            colors[name] = color;
          });
          for(let dayIndex = 0; dayIndex < days.length; ++dayIndex) {
            const { start, end, slots } = days[dayIndex];
            for(let i = 0; i < slots.length; ++i) {
              const slotEnd = i + 1 < slots.length ? slots[i + 1].start : end;
              timespan.overwrite({ from: slots[i].start, to: slotEnd, activity: slots[i].activity });
              slots[i].color = colors[slots[i].activity] || { r: 0, g: 0, b: 0 };
            }
            days[dayIndex].date = new Date(days[dayIndex].date);
          }
        } catch(e) {
          return;
        }
        ractive.set('inputs', data.inputs);
        ractive.set('timespan', data.timespan);
      });
      reader.readAsText(file);
    });
    input.click();
  });
});
