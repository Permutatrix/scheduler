export const hasOwnProperty = Object.prototype.hasOwnProperty;

export function assert(condition, str) {
  if(!condition) {
    for(let i = 2, len = arguments.length; i < len; ++i) {
      str += arguments[i];
    }
    throw Error(str);
  }
}

export function clone(obj) {
  const out = {};
  forKeys(obj, (key, value) => {
    out[key] = value;
  });
  return out;
}

export function forKeys(obj, callback) {
  if(obj != null) {
    for(let key in obj) {
      if(hasOwnProperty.call(obj, key)) {
        callback(key, obj[key]);
      }
    }
  }
}

export function keys(obj) {
  const out = [];
  if(obj != null) {
    for(let key in obj) {
      if(hasOwnProperty.call(obj, key)) {
        out.push(key);
      }
    }
  }
  return out;
}

export function removeAt(array, index) {
  const len = array.length - 1;
  while(index < len) {
    array[index] = array[++index];
  }
  array.pop();
}

export function splitOn(str, delimiter) {
  const index = str.indexOf(delimiter);
  assert(index >= 0, "\"",str,"\" does not contain \"",delimiter,"\"!");
  return { start: str.substr(0, index), end: str.substr(index + 1) };
}

export function spread(array) {
  const out = {};
  for(let i = 0, leni = array.length; i < leni; ++i) {
    const items = array[i];
    for(let j = 0, lenj = items.length; j < lenj; ++j) {
      const item = items[j];
      const r = out[item] || (out[item] = []);
      for(let k = 0; k < lenj; ++k) {
        const item2 = items[k];
        if(item2 !== item && r.indexOf(item2) === -1) {
          r.push(item2);
        }
      }
    }
  }
}
