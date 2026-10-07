import indexHtml from '../index.html?raw';

const body = indexHtml
  .slice(indexHtml.indexOf('<body>') + '<body>'.length, indexHtml.indexOf('</body>'))
  .replace(/<script[\s\S]*?<\/script>/g, '');

/** Restores index.html's markup; the game grabs these elements when its modules load. */
export function resetDom() {
  document.body.innerHTML = body;
}
