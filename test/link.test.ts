// The rooms co-op's phones meet in (src/link.ts): codes, rooms in memory, and rooms between a browser's tabs.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanCode, memoryRooms, newCode, tabRooms, type Msg } from '../src/link';

/** Lets messages between tabs arrive. */
const settle = () => new Promise(r => setTimeout(r, 20));

describe('room codes', () => {
  it('are six letters and digits that are hard to mix up', () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(cleanCode(' abc234 ')).toBe('ABC234');
    expect(cleanCode('ABC10O')).toBeNull();
    expect(cleanCode(null)).toBeNull();
  });
});

describe('rooms in memory', () => {
  it("won't join a room that isn't there", async () => {
    await expect(memoryRooms().join('ZZZZZZ')).rejects.toThrow('no-room');
  });

  it('carries messages both ways, as JSON, and says when either side goes', async () => {
    const rooms = memoryRooms(), host = await rooms.open();
    const heard: unknown[] = [];
    host.onJoin = uid => heard.push(['join', uid]);
    host.onMsg = (uid, m) => heard.push([uid, m]);
    host.onLeave = uid => heard.push(['leave', uid]);
    const g = await rooms.join(host.code), got: Msg[] = [];
    g.onMsg = m => got.push(m);
    let gone = false;
    g.onGone = () => { gone = true; };
    const sent = { k: 'hi', n: 1 };
    g.send(sent);
    host.send({ k: 'd', to: 'someone-else' });
    host.send({ k: 'd' });
    expect(got).toEqual([{ k: 'd' }]);
    expect(heard).toEqual([['join', 'guest'], ['guest', sent]]);
    expect((heard[1] as unknown[])[1]).not.toBe(sent);
    g.close();
    g.close();
    expect(heard[2]).toEqual(['leave', 'guest']);
    const g2 = await rooms.join(host.code);
    g2.onGone = () => { gone = true; };
    host.close();
    expect(gone).toBe(true);
  });
});

describe('rooms between tabs', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('meet over a BroadcastChannel', async () => {
    const rooms = tabRooms(), host = await rooms.open();
    const heard: unknown[] = [];
    host.onJoin = uid => heard.push(['join', uid]);
    host.onMsg = (_uid, m) => heard.push(m);
    host.onLeave = () => heard.push('leave');
    const g = await tabRooms().join(host.code);
    expect(heard).toEqual([['join', g.uid]]);
    const got: Msg[] = [];
    g.onMsg = m => got.push(m);
    let gone = false;
    g.onGone = () => { gone = true; };
    g.send({ k: 'hi' });
    host.send({ k: 'welcome' });
    await settle();
    expect(heard[1]).toEqual({ k: 'hi' });
    expect(got).toEqual([{ k: 'welcome' }]);
    g.close();
    await settle();
    expect(heard[2]).toBe('leave');
    const g2 = await tabRooms().join(host.code);
    g2.onGone = () => { gone = true; };
    host.close();
    await settle();
    expect(gone).toBe(true);
    g2.close();
  });

  it("gives up on a room nobody's hosting", async () => {
    const joining = tabRooms().join('ZZZZZZ');
    await expect(joining).rejects.toThrow('no-room');
  }, 10_000);
});
