import indexHtml from '../index.html?raw';

const body = indexHtml
  .slice(indexHtml.indexOf('<body>') + '<body>'.length, indexHtml.indexOf('</body>'))
  .replace(/<script[\s\S]*?<\/script>/g, '');

// The game listens on window and document (keys, the page hiding, the window's size...), and those last the whole test
// file, while each test loads the game afresh: so every game before stayed in memory behind its listeners, scene and
// all (some 17 MB a load, a gigabyte by the end of a file that loads it fifty times, slowing everything as the
// collector worked through it), and went on hearing every key and page event of the games after it. So what the game
// adds there is noted, and taken off before the next load.
type Listening = [EventTarget, string, EventListenerOrEventListenerObject, boolean | EventListenerOptions | undefined];
const listening: Listening[] = [];
// (each wrapped as itself: vitest's window is Node's global, its addEventListener jsdom's window's, bound)
for (const target of [window, document] as EventTarget[]) {
  const listen = target.addEventListener.bind(target);
  target.addEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, opts?: boolean | AddEventListenerOptions) => {
    if (fn) listening.push([target, type, fn, opts]);
    listen(type, fn, opts);
  };
}

/** Restores index.html's markup (the game grabs these elements when its modules load), and takes the last game's
 *  listeners off window and document. */
export function resetDom() {
  for (const [target, type, fn, opts] of listening.splice(0)) target.removeEventListener(type, fn, opts);
  document.body.innerHTML = body;
}
