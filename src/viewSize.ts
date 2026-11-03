// The window's size, in CSS pixels, kept as it changes. Asked for (window.innerWidth, innerHeight) after the page has
// changed, the browser lays the whole page out again there and then to answer, and the game asks every frame, in a
// dozen places, between its writes to the HUD: on a phone that was several layouts a frame. The browser sends
// `resize` before a frame's callbacks run, so this is the size the frame's drawn at. Read it from here, never the
// window (docs/graphics.md).
export const viewSize = { w: window.innerWidth, h: window.innerHeight };
const measure = () => { viewSize.w = window.innerWidth; viewSize.h = window.innerHeight; };
window.addEventListener('resize', measure);
// (and the visual viewport's: on a phone the window's size can settle after its own `resize`, a keyboard or the
// browser's bars coming and going)
window.visualViewport?.addEventListener('resize', measure);
