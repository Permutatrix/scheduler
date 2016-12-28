import Ractive from 'ractive';

export default function ClampedNumber(node) {
  const info = Ractive.getNodeInfo(node);
  if(!info.isBound()) {
    throw Error("The ClampedInteger decorator only works with two-way bindings!");
  }
  const ractive = info.ractive, keypath = info.getBindingPath();
  
  function blurHandler() {
    const value = this.value ? +this.value : NaN;
    const min = this.getAttribute('min'), minN = (+min) || 0;
    const max = this.getAttribute('max'), maxN = (+max) || 0;
    if(min && value < minN) {
      ractive.set(keypath, minN);
    } else if(max && value > maxN) {
      ractive.set(keypath, maxN);
    } else {
      const step = (+this.getAttribute('step')) || 1;
      const trunc = Math.round(value / step) * step;
      if(value !== trunc) {
        ractive.set(keypath, value === value ? trunc : minN);
      }
    }
  }
  
  node.addEventListener('blur', blurHandler, false);
  
  return {
    teardown() {
      node.removeEventListener('blur', blurHandler, false);
    },
  };
}
