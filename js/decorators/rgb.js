import Ractive from 'ractive';

function encodeHexColor(color) {
  if(!color) {
    return '#000000';
  }
  
  const { r, g, b } = color;
  
  function toTwoDigit(v) {
    return ('0' + Math.round(v * 255).toString(16).toUpperCase()).slice(-2);
  }
  
  return '#' + toTwoDigit(r) + toTwoDigit(g) + toTwoDigit(b);
}

function decodeHexColor(hex) {
  function parseSingle(char) {
    const v = parseInt(char, 16);
    return v * 16 + v;
  }
  
  if(!hex) {
    return;
  }
  
  if(hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  
  if(hex.length === 3) {
    const r = parseSingle(hex.charAt(0)) / 255,
          g = parseSingle(hex.charAt(1)) / 255,
          b = parseSingle(hex.charAt(2)) / 255;
    if(r === r && g === g && b === b) { // check they were all valid (not NaN)
      return { r, g, b };
    }
  } else if(hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16) / 255,
          g = parseInt(hex.slice(2, 4), 16) / 255,
          b = parseInt(hex.slice(4, 6), 16) / 255;
    if(r === r && g === g && b === b) { // check they were all valid (not NaN)
      return { r, g, b };
    }
  }
}

export default function RGB(node, propertyName) {
  const info = Ractive.getNodeInfo(node);
  
  /*function observe({ init }) {
    return info.observe(propertyName, value => {
      const encoded = encodeHexColor(value);
      
      if(node.value.toUpperCase() !== encoded) {
        const currentColor = decodeHexColor(node.value);
        if(!currentColor || encodeHexColor(currentColor) !== encoded) {
          node.value = encoded;
        }
      }
    }, { init: init });
  }
  
  let observer = observe({ init: true });*/
  
  node.value = encodeHexColor(info.get(propertyName));
  
  function changeHandler() {
    const decoded = decodeHexColor(node.value);
    
    if(decoded) {
      info.set(propertyName, decoded);
    }
  }
  
  node.addEventListener('change', changeHandler, false);
  node.addEventListener('input', changeHandler, false);
  
  return {
    update(newPropertyName) {
      //observer.cancel();
      propertyName = newPropertyName;
      changeHandler();
      //observer = observe({ init: false });
    },
    teardown() {
      //observer.cancel();
      node.removeEventListener('change', changeHandler, false);
      node.removeEventListener('input', changeHandler, false);
    },
  };
}
