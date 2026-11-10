/* icons.js — inline SVG sprite (works from file://, no fetch needed).
   Use:  <svg class="ic"><use href="#i-robot"/></svg>      (stroke icon, inherits currentColor)
         <svg class="ic fill"><use href="#f-person"/></svg> (filled flat avatar)
   Add an icon: append a <symbol id="i-name" viewBox="0 0 24 24">…</symbol> below. */
(function () {
  var S = {
    'chat': '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    'code': '<polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/><line x1="14" y1="4" x2="10" y2="20"/>',
    'terminal': '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="6 10 9.5 13 6 16"/><line x1="12" y1="16" x2="18" y2="16"/>',
    'robot': '<rect x="4" y="8" width="16" height="12" rx="3"/><line x1="12" y1="4.4" x2="12" y2="8"/><circle cx="12" cy="3.4" r="1.2"/><circle cx="9" cy="13.2" r="1.4"/><circle cx="15" cy="13.2" r="1.4"/><line x1="9.5" y1="17" x2="14.5" y2="17"/><line x1="2" y1="13" x2="4" y2="13"/><line x1="20" y1="13" x2="22" y2="13"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    'users': '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M17 14.2c2.9.1 4.8 1.8 4.8 5"/>',
    'laptop': '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19.5h20"/>',
    'doc': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
    'chart': '<line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="11" width="3" height="9"/><rect x="11" y="6" width="3" height="14"/><rect x="16" y="14" width="3" height="6"/>',
    'search': '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/>',
    'shield': '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><polyline points="9 12 11.2 14.2 15 10"/>',
    'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    'key': '<circle cx="8" cy="15" r="4"/><line x1="11" y1="12" x2="20" y2="3"/><line x1="16" y1="7" x2="19" y2="10"/>',
    'check': '<polyline points="5 12.5 10 17.5 19 7"/>',
    'x': '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    'warn': '<path d="M12 3l10 18H2z"/><line x1="12" y1="10" x2="12" y2="15"/><line x1="12" y1="18" x2="12" y2="18.2"/>',
    'bulb': '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    'arrow': '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>',
    'arrow-both': '<line x1="3" y1="12" x2="21" y2="12"/><polyline points="7 7 2 12 7 17"/><polyline points="17 7 22 12 17 17"/>',
    'loop': '<path d="M4 11a8 8 0 0 1 14-4l2 2"/><polyline points="20 4 20 9 15 9"/><path d="M20 13a8 8 0 0 1-14 4l-2-2"/><polyline points="4 20 4 15 9 15"/>',
    'sliders': '<line x1="3" y1="7" x2="5.7" y2="7"/><line x1="10.3" y1="7" x2="21" y2="7"/><circle cx="8" cy="7" r="2.3"/><line x1="3" y1="17" x2="13.7" y2="17"/><line x1="18.3" y1="17" x2="21" y2="17"/><circle cx="16" cy="17" r="2.3"/>',
    'book': '<path d="M3 5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0z"/><path d="M12 5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0z"/>',
    'cap': '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><line x1="22" y1="9" x2="22" y2="15"/>',
    'flask': '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><line x1="7.5" y1="15" x2="16.5" y2="15"/>',
    'db': '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5"/><path d="M4.5 12v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V12"/>',
    'folder': '<path d="M3 6a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    'tool': '<path d="M20.5 6.8l-3.2 3.2-3.3-.8-.8-3.3 3.2-3.2a5 5 0 0 0-6.3 6.5L3.3 17.4a2 2 0 0 0 2.8 2.8l8.4-6.8a5 5 0 0 0 6-6.6z"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    'eye': '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/>',
    'pen': '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><line x1="14.5" y1="6.5" x2="17.5" y2="9.5"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/>',
    'star': '<polygon points="12 3 14.8 9 21 9.7 16.4 14 17.8 21 12 17.5 6.2 21 7.6 14 3 9.7 9.2 9"/>',
    'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.2 1-1.2 1.9"/><line x1="12" y1="17" x2="12" y2="17.2"/>',
    'phone': '<rect x="7" y="2.5" width="10" height="19" rx="2"/><line x1="11" y1="18.5" x2="13" y2="18.5"/>',
    'qr': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="17"/><line x1="17" y1="14" x2="21" y2="14"/><line x1="17" y1="17" x2="17" y2="21"/><line x1="21" y1="17" x2="21" y2="21"/><line x1="14" y1="21" x2="15" y2="21"/>',
    'board': '<rect x="3" y="4" width="18" height="12" rx="1"/><line x1="12" y1="16" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/>',
    'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    'list': '<line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    'sparkle': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8L16.5 18.5l1.8-.7z"/>',
    'cloud': '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5 4.8 4.8 0 0 1 17.5 18z"/>',
    'scale': '<line x1="12" y1="3" x2="12" y2="20"/><line x1="7" y1="20" x2="17" y2="20"/><line x1="4" y1="7" x2="20" y2="7"/><path d="M4 7l-2.5 6a3 3 0 0 0 5 0z"/><path d="M20 7l-2.5 6a3 3 0 0 0 5 0z"/>',
    'play': '<polygon points="7 4 20 12 7 20"/>',
    'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'ext': '<path d="M14 4h6v6"/><line x1="20" y1="4" x2="11" y2="13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    'file-code': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><polyline points="10 12 8 14 10 16"/><polyline points="14 12 16 14 14 16"/>',
    'link': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    'edit': '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>',
    'branch': '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><line x1="6" y1="7" x2="6" y2="17"/><path d="M18 11c0 4-6 3-12 6"/>'
  };
  var FILL = {
    'person': '<circle cx="12" cy="8" r="4.6"/><path d="M3 22c0-5.2 4-8 9-8s9 2.8 9 8z"/>',
    'robot': '<path fill-rule="evenodd" d="M6 8h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3zm3 3.6a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zm6 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM9 17.2h6v1.4H9z"/><rect x="11.2" y="3.6" width="1.6" height="4.6"/><circle cx="12" cy="3.2" r="1.7"/>',
    'screen': '<path fill-rule="evenodd" d="M4 4h16a1.5 1.5 0 0 1 1.5 1.5V15A1.5 1.5 0 0 1 20 16.5H4A1.5 1.5 0 0 1 2.5 15V5.5A1.5 1.5 0 0 1 4 4zm.8 1.6v8.6h14.4V5.6z"/><rect x="9" y="17.5" width="6" height="1.6"/><rect x="6.5" y="19.4" width="11" height="1.6"/>'
  };
  var h = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
  Object.keys(S).forEach(function (k) { h += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + S[k] + '</symbol>'; });
  Object.keys(FILL).forEach(function (k) { h += '<symbol id="f-' + k + '" viewBox="0 0 24 24">' + FILL[k] + '</symbol>'; });
  h += '</defs></svg>';
  function inject() { document.body.insertAdjacentHTML('afterbegin', h); }
  if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);
  window.DeckIcons = { names: Object.keys(S).map(function (k) { return 'i-' + k; }).concat(Object.keys(FILL).map(function (k) { return 'f-' + k; })) };
})();
