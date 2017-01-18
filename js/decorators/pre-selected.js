export default function PreSelected(node) {
  node.focus && node.focus();
  node.select && node.select();
  
  return {
    teardown() {
      
    },
  };
}
