import './algorithm.js';
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

import isDebugBuild from 'is-debug-build';

Ractive.DEBUG = isDebugBuild;

import * as Timespan from './timespan.js';

window.addEventListener('load', function() {
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
        return duration + "h";
      },
      
      level: 1,
      inputs: {
        dayCount: 7,
        slotsPerDay: 48,
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
                preferredTime: 2,
                minimumTime: 2,
                maximumTime: 4,
                optional: true,
              },
            ],
            requires: [
              [0],
            ],
            excludes: [
              [0],
            ],
            once: [],
          },
        ],
        selectedPattern: -1,
        week: [],
        once: [],
      },
      timespan: {
        hoursWidth: 40,
        dayWidth: 150,
        dayLength: 24,
        hours: [
          { start: 0, name: "0:00" },
          { start: 4, name: "4:00" },
          { start: 8, name: "8:00" },
          { start: 12, name: "12:00" },
          { start: 16, name: "16:00" },
          { start: 20, name: "20:00" },
        ],
        days: [
          {
            name: 'Day 1',
            slots: [
              { start: 0, color: { r: 1, g: 0, b: 0 }, activity: "A" },
              { start: 1, color: { r: 1, g: 1, b: 0 }, activity: "B" },
              { start: 6, color: { r: 0, g: 1, b: 0 }, activity: "C" },
              { start: 9, color: { r: 0, g: 1, b: 1 }, activity: "D" },
              { start: 18, color: { r: 0, g: 0, b: 1 }, activity: "E" },
              { start: 22, color: { r: 1, g: 0, b: 1 }, activity: "F" },
            ],
          },
          {
            slots: [
              { start: 0, color: { r: 1, g: 0, b: 0 }, activity: "Z" },
              { start: 9, color: { r: 0, g: 1, b: 0 }, activity: "Y" },
              { start: 15, color: { r: 0, g: 0, b: 1 }, activity: "X" },
            ],
          },
        ],
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
    console.log(arr);
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
});
