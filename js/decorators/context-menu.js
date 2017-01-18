import Ractive from 'ractive';

let idNumber = 0;

export default function ContextMenu(node, items) {
  let id = 'decorator-context-menu-' + (idNumber++);
  
  const menu = document.createElement('menu');
  menu.setAttribute('type', 'context');
  menu.setAttribute('id', id);
  
  function addMenuItems(items) {
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
  
  addMenuItems(items);
  
  document.body.appendChild(menu);
  node.setAttribute('contextmenu', id);
  
  return {
    update(items) {
      while(menu.hasChildNodes()) {
        menu.removeChild(menu.lastChild);
      }
      addMenuItems(items);
    },
    teardown() {
      node.removeAttribute('contextmenu');
      document.body.removeChild(menu);
    },
  };
}
