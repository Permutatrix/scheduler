import { assert } from './utils.js';

export function create(length) {
  length = length|0;
  assert(length >= 0, "Can't create a timespan of negative length (",length,")!");
  
  const buffer = new ArrayBuffer(nextValidASMHeapSize(length));
  const asm = createASM(window, { length }, buffer);
  const data = new Uint8Array(buffer, 0, length);
  const activityForId = [''], idForActivity = {};
  
  function getID(activity) {
    if(activity == null) {
      return 0;
    }
    activity = '' + activity;
    const id = idForActivity[activity];
    if(id) {
      return id;
    } else {
      const newID = activityForId.length;
      assert(newID <= 0xFF, "The number of activities exceeds the limit of 255!");
      activityForId.push(activity);
      idForActivity[activity] = newID;
      return newID;
    }
  }
  
  return {
    overwrite({ from, to, activity }) {
      return asm.overwrite(from, to, getID(activity));
    },
    underwrite({ from, to, activity }) {
      return asm.underwrite(from, to, getID(activity));
    },
    overwritePeriodically({ from, to, period, cycles, activity }) {
      return asm.overwritePeriodically(from, to, period, cycles, getID(activity));
    },
    findStartOf({ activity, from, to }) {
      if(to === undefined) {
        to = length;
      }
      const id = activity === undefined ? 0 : idForActivity[activity];
      if(typeof id !== 'number') {
        return to;
      }
      return asm.findStartOf(id, from, to);
    },
    findEnd({ from, to }) {
      return asm.findEnd(from, to === undefined ? length : to);
    },
    findStart({ from }) {
      return asm.findStart(from);
    },
    get(at) {
      if(at >= 0 && at < length) {
        const id = data[at|0];
        if(id) {
          return activityForId[id];
        }
      }
    },
  };
}

function nextValidASMHeapSize(v) {
  v = v|0;
  if(v <= 0x10000) {
    return 0x10000;
  }
  if(v >= 0x4000000) {
    return (v + 0x3FFFFFF) & ~0x3FFFFFF;
  }
  --v;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  return v + 1;
}

// Hand-written asm.js? Sure. It's simple enough stuff.
function createASM(stdlib, foreign, buffer) {
  'use asm';
  
  var length = foreign.length|0;
  var data = new stdlib.Uint8Array(buffer);
  var quarts = new stdlib.Uint32Array(buffer);
  
  function overwrite(from, to, value) {
    from = from|0;
    to = to|0;
    value = value|0;
    
    var quart = 0, fromQ = 0, toQ = 0, total = 0;
    
    if((from|0) < 0) {
      from = 0;
    }
    if((to|0) > (length|0)) {
      to = length;
    }
    if((to|0) <= (from|0)) {
      return 0;
    }
    
    fromQ = (from + 3) & ~3;
    toQ = to & ~3;
    if(((fromQ|0) > (to|0)) ? 1 : ((toQ|0) < (from|0))) {
      fromQ = to;
      toQ = to;
    } else {
      quart = value | (value << 8) | (value << 16) | (value << 24);
    }
    
    total = (to - from)|0;
    
    while((from|0) < (fromQ|0)) {
      data[from >> 0] = value;
      from = (from + 1)|0;
    }
    while((fromQ|0) < (toQ|0)) {
      quarts[fromQ >> 2] = quart;
      fromQ = (fromQ + 4)|0;
    }
    while((toQ|0) < (to|0)) {
      data[toQ >> 0] = value;
      toQ = (toQ + 1)|0;
    }
    
    return total|0;
  }
  
  function underwrite(from, to, value) {
    from = from|0;
    to = to|0;
    value = value|0;
    
    var quart = 0, fromQ = 0, toQ = 0;
    
    if((from|0) < 0) {
      from = 0;
    }
    if((to|0) > (length|0)) {
      to = length;
    }
    if((to|0) <= (from|0)) {
      return;
    }
    
    fromQ = (from + 3) & ~3;
    toQ = to & ~3;
    if(((fromQ|0) > (to|0)) ? 1 : ((toQ|0) < (from|0))) {
      fromQ = to;
      toQ = to;
    } else {
      quart = value | (value << 8) | (value << 16) | (value << 24);
    }
    
    while((from|0) < (fromQ|0)) {
      if(!(data[from >> 0]|0)) {
        data[from >> 0] = value;
      }
      from = (from + 1)|0;
    }
    while((fromQ|0) < (toQ|0)) {
      if(quarts[fromQ >> 2]|0) {
        if(!(data[fromQ >> 0]|0)) {
          data[fromQ >> 0] = value;
        }
        for(fromQ = (fromQ + 1)|0; fromQ & 3; fromQ = (fromQ + 1)|0) {
          if(!(data[fromQ >> 0]|0)) {
            data[fromQ >> 0] = value;
          }
        }
      } else {
        quarts[fromQ >> 2] = quart;
        fromQ = (fromQ + 4)|0;
      }
    }
    while((toQ|0) < (to|0)) {
      if(!(data[toQ >> 0]|0)) {
        data[toQ >> 0] = value;
      }
      toQ = (toQ + 1)|0;
    }
  }
  
  function overwritePeriodically(from, to, period, cycles, value) {
    from = from|0;
    to = to|0;
    period = period|0;
    cycles = cycles|0;
    value = value|0;
    
    var offset = 0, total = 0;
    
    if((period|0) < 0) {
      total = cycles;
      while((total|0) > 1) {
        total = (total - 1)|0;
        offset = (offset + period)|0;
      }
      from = (from + offset)|0;
      to = (to + offset)|0;
      period = (-period)|0;
      offset = 0;
      total = 0;
    }
    
    if(((to - from)|0) >= (period|0)) {
      if(((cycles|0) <= 0) ? 1 : ((to|0) <= (from|0))) {
        return 0;
      }
      while((cycles|0) > 1) {
        cycles = (cycles - 1)|0;
        offset = (offset + period)|0;
      }
      return overwrite(from, (to + offset)|0, value)|0;
    }
    
    while((cycles|0) > 0) {
      total = (total + (overwrite((from + offset)|0, (to + offset)|0, value)|0))|0;
      cycles = (cycles - 1)|0;
      offset = (offset + period)|0;
    }
    
    return total|0;
  }
  
  function findStartOf(value, from, maximum) {
    value = value|0;
    from = from|0;
    maximum = maximum|0;
    
    var quart = 0, fromQ = 0, shortMaximum = 0;
    
    if((maximum|0) > (length|0)) {
      maximum = length;
    }
    
    if((from|0) < 0) {
      from = 0;
    } else if((from|0) >= (maximum|0)) {
      return maximum|0;
    } else {
      fromQ = (from + 3) & ~3;
      if((fromQ|0) > (maximum|0)) {
        fromQ = maximum;
      }
      while((from|0) < (fromQ|0)) {
        if((data[from >> 0]|0) == (value|0)) {
          return from|0;
        }
        from = (from + 1)|0;
      }
    }
    
    shortMaximum = (maximum - 3)|0;
    while(1) {
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) == (value|0)) {
        return fromQ|0;
      }
      fromQ = (fromQ + 1)|0;
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) == (value|0)) {
        return fromQ|0;
      }
      fromQ = (fromQ + 1)|0;
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) == (value|0)) {
        return fromQ|0;
      }
      fromQ = (fromQ + 1)|0;
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) == (value|0)) {
        return fromQ|0;
      }
      quart = quarts[fromQ >> 2]|0;
      fromQ = (fromQ + 1)|0;
      while((fromQ|0) < (shortMaximum|0)) {
        if((quarts[fromQ >> 2]|0) != (quart|0)) {
          break;
        }
        fromQ = (fromQ + 4)|0;
      }
    }
    // This shouldn't be reachable.
    return maximum|0;
  }
  
  function findEnd(from, maximum) {
    from = from|0;
    maximum = maximum|0;
    
    var value = 0, quart = 0, fromQ = 0, shortMaximum = 0;
    
    if((maximum|0) > (length|0)) {
      maximum = length;
    }
    
    if((from|0) < 0) {
      return 0;
    } else if((from|0) >= (maximum|0)) {
      return maximum|0;
    }
    
    value = data[from >> 0]|0;
    fromQ = (from + 3) & ~3;
    if((fromQ|0) > (maximum|0)) {
      fromQ = maximum;
    }
    for(from = (from + 1)|0; (from|0) < (fromQ|0); from = (from + 1)|0) {
      if((data[from >> 0]|0) != (value|0)) {
        return from|0;
      }
    }
    
    quart = value | (value << 8) | (value << 16) | (value << 24);
    shortMaximum = (maximum - 3)|0;
    while(1) {
      while((fromQ|0) < (shortMaximum|0)) {
        if((quarts[fromQ >> 2]|0) != (quart|0)) {
          break;
        }
        fromQ = (fromQ + 4)|0;
      }
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) != (value|0)) {
        return fromQ|0;
      }
      fromQ = (fromQ + 1)|0;
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) != (value|0)) {
        return fromQ|0;
      }
      fromQ = (fromQ + 1)|0;
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) != (value|0)) {
        return fromQ|0;
      }
      fromQ = (fromQ + 1)|0;
      if((fromQ|0) >= (maximum|0)) {
        return maximum|0;
      }
      if((data[fromQ >> 0]|0) != (value|0)) {
        return fromQ|0;
      }
      fromQ = (fromQ + 1)|0;
    }
    // This shouldn't be reachable.
    return maximum|0;
  }
  
  function findStart(from) {
    from = from|0;
    
    var value = 0, quart = 0, fromQ = 0;
    
    if((from|0) < 0) {
      return 0;
    } else if((from|0) >= (length|0)) {
      return length|0;
    }
    
    value = data[from >> 0]|0;
    fromQ = from & ~3;
    for(from = (from - 1)|0; (from|0) >= (fromQ|0); from = (from - 1)|0) {
      if((data[from >> 0]|0) != (value|0)) {
        return (from + 1)|0;
      }
    }
    
    quart = value | (value << 8) | (value << 16) | (value << 24);
    fromQ = (fromQ - 1)|0;
    while(1) {
      while(1) {
        if((fromQ|0) < 0) {
          return 0;
        }
        if((quarts[fromQ >> 2]|0) != (quart|0)) {
          break;
        }
        fromQ = (fromQ - 4)|0;
      }
      if((data[fromQ >> 0]|0) != (value|0)) {
        return (fromQ + 1)|0;
      }
      if((data[(fromQ - 1) >> 0]|0) != (value|0)) {
        return fromQ|0;
      }
      if((data[(fromQ - 2) >> 0]|0) != (value|0)) {
        return (fromQ - 1)|0;
      }
      if((data[(fromQ - 3) >> 0]|0) != (value|0)) {
        return (fromQ - 2)|0;
      }
      fromQ = (fromQ - 4)|0;
    }
    // This shouldn't be reachable.
    return 0;
  }
  
  return {
    overwrite: overwrite,
    underwrite: underwrite,
    overwritePeriodically: overwritePeriodically,
    findStartOf: findStartOf,
    findEnd: findEnd,
    findStart: findStart,
  };
}
