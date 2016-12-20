import './algorithm.js';
import Ractive from 'ractive';
import MainView from '../view/main.ractive';

import Heading from '../view/heading.ractive';
import ClampedNumber from './decorators/clamped-number.js';

import isDebugBuild from 'is-debug-build';

Ractive.DEBUG = isDebugBuild;

import * as Timespan from './timespan.js';

window.addEventListener('load', function() {
  const ractive = window.rct = new MainView({
    el: document.body,
    data: {
      cssColorFromRGB({ r, g, b }) {
        return `rgb(${(r * 255)|0}, ${(g * 255)|0}, ${(b * 255)|0})`;
      },
      perceivedBrightnessSquared({ r, g, b }) {
        // http://alienryderflex.com/hsp.html
        return 0.299*r*r + 0.587*g*g + 0.114*b*b;
      },
      formatDuration(duration) {
        return duration + 'h';
      },
      
      level: 1,
      inputs: {
        dayCount: 7,
        slotsPerDay: 48,
        activities: [
          {
            name: 'activity 1',
            color: '#DDDDDD',
            allotment: 1,
            timeSpentSoFar: 0
          }
        ],
        patterns: [
          {
            slots: [
              {
                activity: 0,
                preferredTime: 2,
                minimumTime: 2,
                maximumTime: 4
              }
            ],
            requires: [
              [0]
            ],
            excludes: [
              [0]
            ],
            nonoptional: [0],
            once: []
          }
        ],
        week: [],
        once: []
      },
      timespan: {
        hoursWidth: 40,
        dayWidth: 150,
        dayLength: 24,
        hours: [
          { start: 0, name: '0:00' },
          { start: 4, name: '4:00' },
          { start: 8, name: '8:00' },
          { start: 12, name: '12:00' },
          { start: 16, name: '16:00' },
          { start: 20, name: '20:00' }
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
              { start: 22, color: { r: 1, g: 0, b: 1 }, activity: "F" }
            ]
          },
          {
            slots: [
              { start: 0, color: { r: 1, g: 0, b: 0 }, activity: "Z" },
              { start: 9, color: { r: 0, g: 1, b: 0 }, activity: "Y" },
              { start: 15, color: { r: 0, g: 0, b: 1 }, activity: "X" },
            ]
          }
        ]
      }
    },
    components: {
      Heading
    },
    decorators: {
      ClampedNumber
    }
  });
});
