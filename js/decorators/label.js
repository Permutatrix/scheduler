export default function Label(node, label) {
  function update(label) {
    node.setAttribute('title', label);
    node.setAttribute('aria-label', label);
  }
  
  update(label);
  
  return {
    update,
    teardown() {
      node.removeAttribute('title');
      node.removeAttribute('aria-label');
    },
  };
}
