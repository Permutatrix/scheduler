import * as Backbone from './backbone.js';
import Ractive from 'ractive';
import Ractbone from './ractive-adaptors-backbone.js';
import MainView from '../ractive/main.ractive';

Ractive.DEBUG = /unminified/.test(function() {/*unminified*/});

import * as Timespan from './timespan.js';

window.addEventListener('load', function() {
  const ractive = new MainView({
    el: document.body,
    data: {
      friend: "hello"
    },
    adapt: [Ractbone]
  });
  
  ractive.set('friend', "old buddy old pal");
  
  const ts = Timespan.create(1000001);
  
  const time = performance.now();
  console.log(ts.overwrite({ from: 5001, to: 238973, activity: 'have fun' }));
  console.log(ts.overwrite({ from: 598589, to: 2000000, activity: 'be cool' }));
  console.log(ts.findStartOf({ activity: 'be cool' }));
  console.log(ts.findEnd({ from: 600000 }));
  console.log(ts.findStart({ from: 5000 }));
  ractive.set('friend', performance.now() - time);
});
