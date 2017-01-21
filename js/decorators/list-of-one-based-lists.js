import Ractive from 'ractive';
import { removeAt } from '../utils.js';

function encodeList(list) {
  return list.map(x => x.map(x => x + 1).join(', ')).join('\n');
}

function decodeList(list) {
  return list.split('\n').map(list => list.split(',').map(x => parseInt(x.trim(), 10) - 1).filter(x => x === x));
}

const inAction = [];
export function refresh() {
  for(let i = 0, len = inAction.length; i < len; ++i) {
    inAction[i]();
  }
}

export default function ListOfOneBasedLists(node, propertyName) {
  const info = Ractive.getNodeInfo(node.closest('.pattern'));
  
  function refresh() {
    observer.cancel();
    observer = observe({ init: true });
  }
  inAction.push(refresh);
  
  function observe({ init }) {
    return info.ractive.observe(info.resolve() + '.' + propertyName, () => {
      const encoded = encodeList(info.get(propertyName));
      
      if(node.value !== encoded) {
        const currentList = decodeList(node.value);
        if(!currentList || encodeList(currentList) !== encoded) {
          node.value = encoded;
        }
      }
    }, { init: init });
  }
  
  let observer = observe({ init: true });
  
  node.value = encodeList(info.get(propertyName));
  
  function changeHandler() {
    const decoded = decodeList(node.value);
    
    if(decoded) {
      info.set(propertyName, decoded);
    }
  }
  
  node.addEventListener('change', changeHandler, false);
  node.addEventListener('input', changeHandler, false);
  
  return {
    update(newPropertyName) {
      observer.cancel();
      propertyName = newPropertyName;
      changeHandler();
      observer = observe({ init: false });
    },
    teardown() {
      observer.cancel();
      node.removeEventListener('change', changeHandler, false);
      node.removeEventListener('input', changeHandler, false);
      removeAt(inAction, inAction.indexOf(refresh));
    },
  };
}
