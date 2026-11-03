(function (root) {
  'use strict';

  function create(element) {
    const node = element.ownerDocument.createTextNode(element.textContent.trim());
    element.replaceChildren(node);
    let previous = node.data;
    return value => {
      const text = String(value);
      if (text === previous) return;
      node.data = text;
      previous = text;
    };
  }

  const TimerDisplay = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = TimerDisplay;
  else root.TimerDisplay = TimerDisplay;
})(typeof globalThis !== 'undefined' ? globalThis : this);
