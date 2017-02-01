import { schedule } from './algorithm.js';
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

import * as Timespan from './timespan.js';

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
  
  ractive.on('generate-schedule', () => {
    const timeSpentSoFar = {}, allotments = {}, colors = {};
    const activities = ractive.get('inputs.activities');
    activities.forEach(({ name, color, allotment, timeSpentSoFar: tssf }) => {
      timeSpentSoFar[name] = tssf;
      allotments[name] = allotment;
      colors[name] = color;
    });
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
        }
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
    let timeValue = new Date(ractive.get('inputs.firstDay')).getTime();
    for(let time = 0; time < dayLength * dayCount; timeValue += 1000*60*60*24) {
      const dayStart = time, dayEnd = time + dayLength;
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
      const date = new Date(timeValue);
      days.push({
        name: date.toDateString(),
        date,
        start: dayStart,
        end: dayEnd,
        slots,
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
    ractive.set('timespan', {
      data: timespan,
      hoursWidth,
      dayWidth,
      dayLength: slotsPerDay,
      dayLengthInSeconds,
      hours,
      days,
    });
  });
  
  ractive.on('absorb-schedule', () => {
    const timespan = ractive.get('timespan.data');
    const additions = {};
    let time = 0;
    while(true) {
      const endTime = timespan.findEnd({ from: time });
      if(endTime === time) break;
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
    ractive.set('inputs.firstDay', new Date(new Date(ractive.get('inputs.firstDay')).getTime() + 1000*60*60*24*ractive.get('timespan.days').length).toDateString());
    ractive.set('timespan.days', []);
  });
  
  ractive.on('discard-schedule', () => {
    ractive.set('timespan.days', []);
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
  
  window.addEventListener('mousedown', () => {
    ractive.set('timespan.rawSelection', { start: NaN, end: NaN });
  });
});
