const hasOwnProperty = Object.prototype.hasOwnProperty;

export function assert(condition, message) {
  if(!condition) {
    throw Error(message);
  }
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

export function splitOn(str, delimiter) {
  const index = str.indexOf(delimiter);
  assert(index >= 0, `"${str}" does not contain "${delimiter}"!`);
  return { start: str.substr(0, index), end: str.substr(index + 1) };
}
