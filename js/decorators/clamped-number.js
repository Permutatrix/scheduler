import Ractive from 'ractive';

export default function ClampedNumber(node) {
  const info = Ractive.getNodeInfo(node);
  if(!info.isBound()) {
    throw Error("The ClampedNumber decorator only works with two-way bindings!");
  }
  const ractive = info.ractive, keypath = info.getBindingPath();
  
  function blurHandler() {
    const value = node.value ? +node.value : NaN;
    const min = node.getAttribute('min'), minN = (+min) || 0;
    const max = node.getAttribute('max'), maxN = (+max) || 0;
    if(min && value < minN) {
      ractive.set(keypath, minN);
    } else if(max && value > maxN) {
      ractive.set(keypath, maxN);
    } else {
      const step = (+node.getAttribute('step')) || 1;
      const trunc = Math.round(value / step) * step;
      if(value !== trunc) {
        ractive.set(keypath, value === value ? trunc : minN);
      }
    }
  }
  
  node.addEventListener('blur', blurHandler, false);
  
  const observer = new MutationObserver(blurHandler);
  
  observer.observe(node, {
    attributes: true,
    attributeFilter: ['min', 'max', 'step'],
  });
  
  return {
    teardown() {
      node.removeEventListener('blur', blurHandler, false);
      observer.disconnect();
    },
  };
}
