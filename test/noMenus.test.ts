// A long press or drag on a phone opens none of the browser's menus (noMenus.ts and index.html's CSS).
import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import '../src/noMenus';

const $ = (id: string) => document.getElementById(id)!;
/** Sends a cancellable event at an element, and says whether the game took its default. */
const stopped = (target: EventTarget, type: string) => {
  const e = new Event(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e.defaultPrevented;
};

describe('no browser menus over the game', () => {
  it('makes nothing selectable or long-pressable but what is typed, links and the letter', () => {
    const css = indexHtml.slice(indexHtml.indexOf('<style>'), indexHtml.indexOf('</style>'));
    expect(css).toMatch(/\*, \*::before, \*::after\{\s*user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent;/);
    expect(css).toMatch(/input, textarea, select, [^{]*#korki \.memo \*\{\s*user-select:text; -webkit-user-select:text; -webkit-touch-callout:default;/);
    expect(css).toMatch(/a\[href\]\{ -webkit-touch-callout:default; \}/);
  });

  it('opens no right-click or long-press menu on the game, but does on the report box and links', () => {
    expect(stopped($('game'), 'contextmenu')).toBe(true);
    expect(stopped($('cash'), 'contextmenu')).toBe(true);
    expect(stopped($('reportText'), 'contextmenu')).toBe(false);
    expect(stopped($('kofi'), 'contextmenu')).toBe(false);
  });

  it('starts no selection in the HUD, but does in the report box and the letter', () => {
    expect(stopped($('cash'), 'selectstart')).toBe(true);
    expect(stopped($('cash').firstChild ?? $('cash'), 'selectstart')).toBe(true);
    expect(stopped($('reportText'), 'selectstart')).toBe(false);
    expect(stopped(document.querySelector('#korki .memo')!, 'selectstart')).toBe(false);
  });

  it("keeps a touch on the play surfaces the game's, and leaves their buttons their taps", () => {
    expect(stopped($('game'), 'touchstart')).toBe(true);
    expect(stopped($('wayLook'), 'touchstart')).toBe(true);
    expect(stopped($('showPlay'), 'touchstart')).toBe(true);
    expect(stopped($('wayPocket'), 'touchstart')).toBe(false);
    expect(stopped($('showGo'), 'touchstart')).toBe(false);
    expect(stopped($('gear'), 'touchstart')).toBe(false); // the HUD's buttons, and the panels' scrolling, are the browser's
  });

  it('lets go of a selection that starts anyway, but not one in the letter', () => {
    const sel = document.getSelection()!;
    sel.selectAllChildren($('cash'));
    document.dispatchEvent(new Event('selectionchange'));
    expect(sel.isCollapsed).toBe(true);
    const memo = document.querySelector('#korki .memo')!;
    memo.textContent = 'Dear chef';
    sel.selectAllChildren(memo);
    document.dispatchEvent(new Event('selectionchange'));
    expect(sel.toString()).toBe('Dear chef');
    sel.removeAllRanges();
  });
});
