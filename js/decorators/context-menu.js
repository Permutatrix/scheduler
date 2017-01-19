import Ractive from 'ractive';

let idNumber = 0;

export default function ContextMenu(node, ...itemGroups) {
  let id = 'decorator-context-menu-' + (idNumber++);
  
  const menu = document.createElement('menu');
  menu.setAttribute('type', 'context');
  menu.setAttribute('id', id);
  
  function addMenuItems(itemGroups) {
    for(let i = 0; i < itemGroups.length; ++i) {
      const items = itemGroups[i];
      if(!items) {
        continue;
      }
      if(menu.hasChildNodes()) {
        menu.appendChild(document.createElement('hr'));
      }
      for(let label in items) {
        const item = document.createElement('menuitem');
        item.setAttribute('label', label);
        item.addEventListener('click', () => {
          const info = Ractive.getNodeInfo(node);
          info.ractive.fire(items[label], info, node);
        });
        menu.appendChild(item);
      }
    }
  }
  
  addMenuItems(itemGroups);
  
  document.body.appendChild(menu);
  node.setAttribute('contextmenu', id);
  
  return {
    update(...itemGroups) {
      while(menu.hasChildNodes()) {
        menu.removeChild(menu.lastChild);
      }
      addMenuItems(itemGroups);
    },
    teardown() {
      node.removeAttribute('contextmenu');
      document.body.removeChild(menu);
    },
  };
}
