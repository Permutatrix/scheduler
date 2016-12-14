import './algorithm.js';
import * as Backbone from './backbone.js';
import Ractive from 'ractive';
import Ractbone from './ractive-adaptors-backbone.js';
import MainView from '../ractive/main.ractive';
import Heading from '../ractive/heading.ractive';
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
        return '' + duration;
      },
      
      level: 1,
      hoursWidth: 30,
      dayWidth: 150,
      slotHeight: 20,
      dayLength: 24,
      hours: [0, 4, 8, 12, 16, 20],
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
    },
    components: {
      Heading
    },
    adapt: [Ractbone]
  });
});
