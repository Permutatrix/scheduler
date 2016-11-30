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
      level: 1,
      days: [{}]
    },
    components: {
      Heading
    },
    adapt: [Ractbone]
  });
});
