// A cropped screenshot of one part of the game, as the player sees it (the 3D world with the panels over it), sent to
// receiver.py. Run it in the browser pane's javascript_tool on the demo build (localhost:5177), with NAME and SEL (or
// RECT, in screen pixels) set first. It answers with the receiver's status (200 when saved) and the crop's size.
const NAME = 'roulette-keys', SEL = '#roulette', RECT = null, PAD = 24, PORT = 5199;

// (the modules as the page loaded them: a bare '/src/…' import can load a second copy of the game)
const url = n => performance.getEntriesByType('resource').map(e => e.name).find(u => new URL(u).pathname === '/src/' + n) ?? '/src/' + n;
const R = await import(url('render.ts')), Rep = await import(url('report.ts'));
// the game's canvas is cleared once a frame is shown: draw one and copy it at once, full size
R.renderer.render(R.scene, R.camera);
const src = R.renderer.domElement, world = document.createElement('canvas');
world.width = src.width; world.height = src.height;
world.getContext('2d').drawImage(src, 0, 0);
// the panels, buttons and HUD over it (html2canvas, as the bug reports' screenshots)
const full = (await Rep.takeUi(world)) ?? world;
const k = full.width / innerWidth;
const r = RECT ?? document.querySelector(SEL).getBoundingClientRect();
const x = Math.max(0, r.left - PAD), y = Math.max(0, r.top - PAD);
const w = Math.min(innerWidth - x, r.width + 2 * PAD), h = Math.min(innerHeight - y, r.height + 2 * PAD);
const out = document.createElement('canvas');
out.width = Math.round(w * k); out.height = Math.round(h * k);
out.getContext('2d').drawImage(full, x * k, y * k, w * k, h * k, 0, 0, out.width, out.height);
const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', 0.85));
const status = await fetch(`http://127.0.0.1:${PORT}/${NAME}.jpg`, { method: 'POST', body: blob, headers: { 'Content-Type': 'image/jpeg' } }).then(q => q.status);
({ status, size: `${out.width}×${out.height}` });
