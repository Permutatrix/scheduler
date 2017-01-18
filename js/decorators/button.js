export default function Button(node) {
  function keypressHandler(event) {
    if(event.key === 'Enter' || event.key === ' ') {
      node.click();
    }
  }
  
  node.addEventListener('keypress', keypressHandler, false);
  
  node.setAttribute('tabindex', '0');
  node.setAttribute('aria-role', 'button');
  
  return {
    teardown() {
      node.removeEventListener('keypress', keypressHandler, false);
      
      node.removeAttribute('tabindex');
      node.removeAttribute('aria-role');
    },
  };
}
