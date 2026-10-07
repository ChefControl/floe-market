// The marketing campaigns, built for real: looks.ts puts one up for each level of marketing bought. They're spread
// round the market (the dock, the customers' path, across the road) and round the restaurant (inside, the front).
//   Market: posters on the fence, a promoter handing out flyers, a radio playing the jingle, a giant phone with the
//   market's post collecting likes, a billboard, a food blogger taking photos, a newspaper box with the market on
//   the front page, and a TV playing the market's commercial.
//   Restaurant: a chalk menu board, big paper lanterns, a phone on a ring light filming the bar, a food critic at
//   a table, a magazine rack with the restaurant on the covers, a TV camera filming the chefs, the gourmet guide's
//   stars over a pedestal, and flags from all over the world strung across the room.
import {
  type BufferGeometry, CatmullRomCurve3, DoubleSide, ExtrudeGeometry, Group, type Material, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, PlaneGeometry, Shape, Sprite, SpriteMaterial, TorusGeometry, TubeGeometry,
} from 'three';
import { Person, SUITS } from './characters';
import { C1 } from './counters';
import { glowMats } from './hall';
import { HALL_BOX } from './layout';
import { bake, CAM_YAW, canvasTex, type Draw, FONT, G, mesh, type Part, rr } from './render';
import { FY, V } from './util';

export interface Ad {
  g: Group;
  /** Animates it while it's up. */
  upd?: (dt: number, t: number) => void;
}

// ---------- helpers ----------
function part(g: Group, geo: BufferGeometry, c: number | Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
  const m = mesh(geo, c, x, y, z, true); m.scale.set(sx, sy, sz); g.add(m);
  return m;
}
/** A flat picture drawn on a canvas `px` wide; a screen (`lit`) glows instead of taking the light. */
function picture(w: number, h: number, px: number, draw: Draw, lit = false) {
  const t = canvasTex(px, Math.round(px * h / w), draw);
  const m = new Mesh(new PlaneGeometry(w, h), lit ? new MeshBasicMaterial({ map: t.tex }) : new MeshLambertMaterial({ map: t.tex }));
  return { m, t };
}
function emoji(c: CanvasRenderingContext2D, icon: string, x: number, y: number, size: number) {
  c.font = size + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(icon, x, y);
}
function write(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, font = FONT) {
  c.fillStyle = color; c.font = `800 ${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y);
}
/** A group standing at (x, y, z), turned to the camera unless it's given a heading. Hidden until bought. */
function spot(x: number, y: number, z: number, h = CAM_YAW) {
  const g = new Group(); g.position.set(x, y, z); g.rotation.y = h; g.visible = false;
  return g;
}
const glowTex = canvasTex(64, 64, (c, w) => {
  const r = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,250,220,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = r; c.fillRect(0, 0, w, w);
}).tex;

/** Little icons (music notes, hearts) rising from a spot and fading, one every `every` seconds. */
class Floaters {
  private readonly ps: { s: Sprite; age: number }[] = [];
  private t = 0;
  constructor(g: Group, private readonly x: number, private readonly y: number, private readonly z: number, icon: string, private readonly every: number) {
    const tex = canvasTex(64, 64, c => emoji(c, icon, 32, 34, 50)).tex;
    for (let i = 0; i < 4; i++) {
      const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      s.scale.setScalar(0.3); s.visible = false; g.add(s);
      this.ps.push({ s, age: -1 });
    }
  }
  update(dt: number) {
    this.t += dt;
    const free = this.ps.find(p => p.age < 0);
    if (this.t >= this.every && free) { this.t = 0; free.age = 0; free.s.visible = true; }
    for (const p of this.ps) {
      if (p.age < 0) continue;
      p.age += dt;
      const k = p.age / 1.8;
      p.s.position.set(this.x + Math.sin(p.age * 4) * 0.1, this.y + k * 1.1, this.z);
      p.s.material.opacity = 1 - k;
      if (k >= 1) { p.age = -1; p.s.visible = false; }
    }
  }
}

// ======================= the market (stage 1) =======================

/** Posters pasted on the fence west of the walk-up counter, facing the street. */
function posters(): Ad {
  const g = spot(0.4, 0, 8.07, 0);
  const designs: Draw[] = [
    (c, w, h) => { c.fillStyle = '#5BC0EB'; c.fillRect(0, 0, w, h); write(c, 'FRESH', w / 2, h * 0.15, 30, '#C0392B'); emoji(c, '🐟', w / 2, h * 0.5, 64); write(c, 'FISH', w / 2, h * 0.85, 30, '#FFFFFF'); },
    (c, w, h) => { c.fillStyle = '#FFD24A'; c.fillRect(0, 0, w, h); write(c, 'OPEN', w / 2, h * 0.15, 28, '#23384A'); write(c, 'DAILY', w / 2, h * 0.33, 28, '#23384A'); emoji(c, '🎣', w / 2, h * 0.68, 58); },
    (c, w, h) => { c.fillStyle = '#E85D75'; c.fillRect(0, 0, w, h); write(c, 'FLOE', w / 2, h * 0.17, 32, '#FFF4E6'); write(c, 'MARKET', w / 2, h * 0.35, 25, '#FFF4E6'); emoji(c, '🐠', w / 2, h * 0.7, 58); },
  ];
  designs.forEach((d, i) => {
    const { m } = picture(0.46, 0.6, 128, (c, w, h) => { d(c, w, h); c.strokeStyle = '#FFFFFF'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); });
    m.position.set((i - 1) * 0.6, FY + 0.47, 0); m.rotation.z = [0.05, -0.04, 0.07][i];
    g.add(m);
  });
  return { g };
}

/** A promoter in a bright parka down the customers' path, waving a flyer at everyone coming up it. */
function flyers(): Ad {
  const g = spot(3.6, 0, 15.4, Math.atan2(2.9, 2.6));
  const p = new Person(0x2EC4B6); g.add(p);
  part(p.arms[1], G.box, 0xFFFFFF, 0, -0.36, 0.05, 0.2, 0.02, 0.28);
  part(p.arms[0], G.box, 0xF4F1E8, 0, -0.36, 0.05, 0.2, 0.08, 0.28);
  p.arms[0].rotation.x = -0.5;
  // a few dropped on the snow
  for (const [x, z, r] of [[0.6, 0.3, 0.4], [-0.5, 0.5, 1.2], [0.2, -0.6, 2.3], [-0.7, -0.3, 0.9]]) {
    part(g, G.box, 0xFFFFFF, x, 0.01, z, 0.2, 0.01, 0.28).rotation.y = r;
  }
  return { g, upd: (_dt, t) => { p.arms[1].rotation.x = -1.5 + Math.sin(t * 6) * 0.35; } };
}

/** A big retro radio on a crate in the dock's far corner, playing the market's jingle. */
function radio(): Ad {
  const g = spot(6.4, FY, -5.4);
  part(g, G.box, 0x9C6644, 0, 0.2, 0, 0.55, 0.4, 0.45);
  const set = new Group(); set.position.y = 0.4; g.add(set);
  part(set, G.box, 0xC0392B, 0, 0.18, 0, 0.62, 0.36, 0.26);
  const { m: front } = picture(0.56, 0.3, 128, (c, w, h) => {
    c.fillStyle = '#E9D9C0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#5B3424'; c.beginPath(); c.arc(h / 2, h / 2, h * 0.38, 0, 7); c.fill();
    c.fillStyle = '#8A5A3B'; for (let i = 0; i < 5; i++) c.fillRect(h * 0.2, h * 0.28 + i * h * 0.1, h * 0.6, 2);
    c.fillStyle = '#23384A'; rr(c, w * 0.52, h * 0.25, w * 0.4, h * 0.22, 4); c.fill();
    c.fillStyle = '#FFD24A'; c.fillRect(w * 0.62, h * 0.27, 3, h * 0.18);
    c.fillStyle = '#5B3424'; for (const x of [0.6, 0.82]) { c.beginPath(); c.arc(w * x, h * 0.72, h * 0.12, 0, 7); c.fill(); }
  });
  front.position.set(0, 0.18, 0.131); set.add(front);
  part(set, G.box, 0x2B1A14, 0, 0.4, 0, 0.36, 0.04, 0.04);
  part(set, G.cyl, 0xB8C4CC, 0.24, 0.6, 0, 0.012, 0.5, 0.012).rotation.z = -0.4;
  const notes = new Floaters(g, 0, 1.0, 0.1, '🎵', 0.6);
  return { g, upd: (dt, t) => { notes.update(dt); set.scale.y = 1 + Math.max(0, Math.sin(t * 13)) * 0.05; } };
}

/** A giant phone on a stand on the west side of the dock, showing the market's post, which keeps getting likes. */
function socialPhone(): Ad {
  const g = spot(-6.9, FY, -1.5);
  part(g, G.box, 0x23384A, 0, 0.03, 0, 0.5, 0.06, 0.32);
  part(g, G.cyl, 0x23384A, 0, 0.3, 0, 0.04, 0.55, 0.04);
  part(g, G.box, 0x1B2430, 0, 1.12, 0, 0.64, 1.12, 0.06);
  let likes = 128;
  const { m: screen, t: post } = picture(0.56, 1.0, 128, () => {}, true);
  const draw = () => {
    const { ctx: c, canvas: { width: w, height: h } } = post;
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#5B8DEF'; c.beginPath(); c.arc(18, 20, 11, 0, 7); c.fill();
    c.fillStyle = '#23384A'; c.font = `800 14px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('floe.market', 34, 20);
    const sky = c.createLinearGradient(0, 38, 0, 160); sky.addColorStop(0, '#9ED8F0'); sky.addColorStop(1, '#3A9BC8');
    c.fillStyle = sky; c.fillRect(0, 38, w, 122);
    emoji(c, '🐟', w / 2, 100, 66);
    emoji(c, '💗', 18, 178, 18);
    c.fillStyle = '#23384A'; c.font = `800 14px ${FONT}`; c.textAlign = 'left'; c.fillText(likes.toLocaleString('en-US') + ' likes', 32, 178);
    c.fillStyle = '#C9D3DA'; c.fillRect(10, 198, w - 30, 6); c.fillRect(10, 211, w - 56, 6);
    post.tex.needsUpdate = true;
  };
  draw();
  screen.position.set(0, 1.12, 0.031); g.add(screen);
  const hearts = new Floaters(g, 0.15, 1.6, 0.1, '💗', 0.5);
  let t0 = 0;
  return {
    g, upd: (dt, t) => {
      hearts.update(dt);
      if (t - t0 > 0.9) { t0 = t; likes += 7 + Math.floor((t * 13) % 9); draw(); }
    },
  };
}

/** The billboard: the market's ad on a big board across the road. */
function billboard(): Ad {
  const g = spot(13.4, 0, 8.8);
  const { m: art } = picture(2.7, 1.35, 512, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#8FD3F4'); sky.addColorStop(1, '#3A9BC8');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1E6F9F'; c.fillRect(0, h * 0.78, w, h * 0.22);
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(w * 0.22, h * 0.8, w * 0.16, h * 0.06, 0, 0, 7); c.fill();
    c.save(); c.translate(w * 0.22, h * 0.48); c.rotate(-0.35); emoji(c, '🐟', 0, 0, 140); c.restore();
    c.lineJoin = 'round'; c.lineWidth = 10; c.strokeStyle = '#23384A'; c.font = `800 66px ${FONT}`; c.textAlign = 'center';
    c.strokeText('Floe Market', w * 0.66, h * 0.36); write(c, 'Floe Market', w * 0.66, h * 0.36, 66, '#FFFFFF');
    write(c, 'Fresh off the ice!', w * 0.66, h * 0.62, 34, '#FFD24A');
  });
  art.position.set(0, 2.05, 0.04); g.add(art);
  part(g, G.box, 0xF4F1E8, 0, 2.05, 0, 2.85, 1.5, 0.06);
  for (const s of [-1, 1]) {
    part(g, G.cyl, 0x6B4A35, s * 1.15, 0.7, -0.08, 0.06, 1.4, 0.06);
    const lamp = part(g, G.box, 0x23384A, s * 0.7, 2.85, 0.22, 0.2, 0.06, 0.12); lamp.rotation.x = 0.5;
  }
  return { g };
}

/** A food blogger photographing the counter from out in the snow, flash and all. */
function blogger(): Ad {
  const g = spot(-0.9, 0, 11.2, Math.atan2(3.9, -3.25));
  const p = new Person(0x9B5DE5); g.add(p);
  p.arms.forEach(a => { a.rotation.x = -1.55; });
  part(p, G.box, 0x1B2430, 0, 1.06, 0.36, 0.28, 0.18, 0.12);
  part(p, G.cyl, 0x2C3A47, 0.04, 1.05, 0.45, 0.06, 0.1, 0.06).rotation.x = Math.PI / 2;
  const flash = new Sprite(new SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  flash.position.set(0.04, 1.08, 0.55); flash.scale.setScalar(0.9); flash.visible = false; g.add(flash);
  return { g, upd: (_dt, t) => { flash.visible = t % 2.6 < 0.12; } };
}

/** A newspaper box by the crossing to her house, with the market on the front page. */
function newspaper(): Ad {
  const g = spot(11.3, 0, 4.6);
  for (const x of [-0.2, 0.2]) for (const z of [-0.15, 0.15]) part(g, G.box, 0x2C3A47, x, 0.08, z, 0.05, 0.16, 0.05);
  part(g, G.box, 0x2F6FD0, 0, 0.58, 0, 0.56, 0.84, 0.46);
  part(g, G.box, 0xF4F1E8, 0, 1.03, 0.02, 0.42, 0.06, 0.32);
  const { m: page } = picture(0.42, 0.5, 128, (c, w, h) => {
    c.fillStyle = '#F4F1E8'; c.fillRect(0, 0, w, h);
    write(c, 'The Floe Times', w / 2, 14, 15, '#1B2430', 'Georgia,serif');
    c.fillStyle = '#1B2430'; c.fillRect(6, 26, w - 12, 2);
    write(c, 'BEST FISH', w / 2, 44, 20, '#1B2430'); write(c, 'IN TOWN!', w / 2, 64, 20, '#1B2430');
    c.fillStyle = '#7FB8D6'; c.fillRect(8, 78, w * 0.55, 56); emoji(c, '🐟', 8 + w * 0.275, 106, 38);
    c.fillStyle = '#B8BEC4'; for (let i = 0; i < 6; i++) c.fillRect(w * 0.62, 80 + i * 9, w * 0.32, 4);
    for (let i = 0; i < 2; i++) c.fillRect(8, 140 + i * 8, w - 16, 4);
  });
  page.position.set(0, 0.66, 0.231); g.add(page);
  part(g, G.box, 0x23384A, 0, 0.3, 0.232, 0.3, 0.05, 0.01);
  return { g };
}

/** A big TV out in the snow playing the market's commercial: a slideshow of fish, prices and happy customers. */
function tvAd(): Ad {
  const g = spot(-3.8, 0, 14.6);
  for (const s of [-1, 1]) {
    part(g, G.box, 0x2C3A47, s * 0.7, 0.55, 0, 0.08, 1.1, 0.08);
    part(g, G.box, 0x2C3A47, s * 0.7, 0.03, 0, 0.12, 0.06, 0.5);
  }
  part(g, G.box, 0x1B2430, 0, 1.6, 0, 2.0, 1.18, 0.1);
  const { m: screen, t: tv } = picture(1.86, 1.04, 320, () => {}, true);
  screen.position.set(0, 1.6, 0.051); g.add(screen);
  const SLIDE = 2.4;
  const slides: ((c: CanvasRenderingContext2D, w: number, h: number, k: number) => void)[] = [
    (c, w, h, k) => {
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#8FD3F4'); sky.addColorStop(1, '#2E86C1');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1E6F9F'; c.fillRect(0, h * 0.72, w, h * 0.28);
      emoji(c, '🐟', w * (0.15 + 0.7 * k), h * 0.62 - Math.sin(k * Math.PI) * h * 0.4, 64);
      write(c, 'FRESH FISH!', w / 2, h * 0.86, 30, '#FFFFFF');
    },
    (c, w, h, k) => {
      c.fillStyle = '#FFD24A'; c.fillRect(0, 0, w, h);
      write(c, 'ONLY', w * 0.36, h * 0.3, 30, '#23384A');
      write(c, '$' + C1.price, w * 0.36, h * 0.6, 70 + Math.sin(k * 12) * 4, '#C0392B');
      emoji(c, '🐟', w * 0.74, h * 0.5, 80);
    },
    (c, w, h, k) => {
      c.fillStyle = '#FFB3C1'; c.fillRect(0, 0, w, h);
      emoji(c, '😋', w * 0.3, h * 0.5, 80 + Math.sin(k * 10) * 6);
      write(c, 'So good!', w * 0.68, h * 0.38, 32, '#8E2B2B');
      write(c, '★★★★★', w * 0.68, h * 0.62, 28, '#F2A81D');
    },
    (c, w, h) => {
      c.fillStyle = '#23384A'; c.fillRect(0, 0, w, h);
      emoji(c, '🐟', w / 2, h * 0.3, 44);
      write(c, 'Floe Market', w / 2, h * 0.58, 40, '#FFFFFF');
      write(c, 'On the dock, open now', w / 2, h * 0.8, 18, '#8FB3C9');
    },
  ];
  let next = 0;
  return {
    g, upd: (_dt, t) => {
      if (t < next) return;
      next = t + 1 / 8;
      const { ctx: c, canvas: { width: w, height: h } } = tv;
      const n = Math.floor(t / SLIDE), k = (t % SLIDE) / SLIDE;
      slides[n % slides.length](c, w, h, k);
      c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, 8, 8, 34, 20, 5); c.fill(); write(c, 'AD', 25, 19, 13, '#FFFFFF');
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, h - 5, w, 5);
      c.fillStyle = '#FFD24A'; c.fillRect(0, h - 5, w * k, 5);
      tv.tex.needsUpdate = true;
    },
  };
}

/** In the order of the market's campaigns (MOD.marketing.levels). */
export const marketAds: Ad[] = [posters(), flyers(), radio(), socialPhone(), billboard(), blogger(), newspaper(), tvAd()];

// ======================= the restaurant (stage 2) =======================
/** The west aisle, between the wall and the path diners take to their seats. */
const WEST = HALL_BOX.x0 + 1.4;
/** The way to face from (x, z) to film the chef at the bar's east end. */
const filming = (x: number, z: number) => Math.atan2(2.4 - x, 9.0 - z);

/** A chalk A-frame menu board out in the front garden, by the path to the gate. */
function menuBoard(): Ad {
  const g = spot(-1.7, 0.02, 17.2);
  for (const s of [-1, 1]) {
    const b = part(g, G.box, 0x8A5A3B, 0, 0.52, s * 0.14, 0.72, 1.04, 0.04); b.rotation.x = -s * 0.2;
  }
  const { m: chalk } = picture(0.6, 0.86, 128, (c, w, h) => {
    c.fillStyle = '#2D3B36'; c.fillRect(0, 0, w, h);
    write(c, 'MENU', w / 2, 20, 22, '#F4F1E8');
    c.fillStyle = '#F4F1E8'; c.fillRect(w * 0.25, 34, w * 0.5, 2);
    [['🍣', 'Nigiri'], ['🍙', 'Onigiri'], ['🍤', 'Tempura'], ['🍵', 'Green tea']].forEach(([icon, name], i) => {
      emoji(c, icon, 20, 56 + i * 32, 20);
      c.fillStyle = '#F4F1E8'; c.font = `700 15px ${FONT}`; c.textAlign = 'left'; c.fillText(name, 36, 57 + i * 32);
    });
  });
  chalk.position.set(0, 0.54, 0.185); chalk.rotation.x = -0.2; g.add(chalk);
  return { g };
}

/** Big red paper lanterns with the restaurant's name, hung from the front eaves either side of the gate; they glow at dusk. */
function lanternSigns(): Ad {
  const g = spot(0, 0, HALL_BOX.z1 + 1.0, 0);
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#D63A2A'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1B2430'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12);
    for (const x of [w * 0.25, w * 0.75]) write(c, '鮨', x, h / 2 + 4, 70, '#1B2430', 'serif');
  }).tex;
  const paper = new MeshLambertMaterial({ map: tex, emissive: 0xFFFFFF, emissiveMap: tex, emissiveIntensity: 0.12 });
  glowMats.push(paper);
  const lanterns: Group[] = [];
  for (const x of [-8.0, -5.4, 5.4, 8.0]) {
    const l = new Group(); l.position.set(x, 2.75, 0); l.rotation.y = CAM_YAW; g.add(l);
    part(l, G.sphere, paper, 0, 0, 0, 0.3, 0.42, 0.3).castShadow = false;
    for (const s of [-1, 1]) part(l, G.cyl, 0x1B2430, 0, s * 0.4, 0, 0.17, 0.06, 0.17);
    part(l, G.box, 0x1B2430, 0, 0.75, 0, 0.015, 0.7, 0.015);
    lanterns.push(l);
  }
  return { g, upd: (_dt, t) => lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.3 + i) * 0.05; }) };
}

/** A phone on a ring light in the east aisle, filming the chefs for the restaurant's feed. */
function ringLight(): Ad {
  const g = spot(8.9, FY, 10.4, filming(8.9, 10.4));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = part(g, G.cyl, 0x2C3A47, Math.sin(a) * 0.18, 0.3, Math.cos(a) * 0.18, 0.015, 0.64, 0.015);
    leg.rotation.set(-Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
  }
  part(g, G.cyl, 0x2C3A47, 0, 0.95, 0, 0.02, 1.0, 0.02);
  const ring = new Mesh(new TorusGeometry(0.26, 0.035, 8, 28), new MeshBasicMaterial({ color: 0xFFF8EC }));
  ring.position.y = 1.5; g.add(ring);
  part(g, G.box, 0x1B2430, 0, 1.5, 0, 0.13, 0.24, 0.015);
  const hearts = new Floaters(g, 0, 1.85, 0, '💗', 0.45);
  return { g, upd: dt => hearts.update(dt) };
}

/** A food critic at a table of their own in the west aisle: scribbling notes, and now and then holding up five stars. */
function critic(): Ad {
  const g = spot(WEST, FY, 11.2, 0);
  part(g, G.cyl, 0x5B3424, 0.15, 0.36, 0, 0.05, 0.72, 0.05);
  part(g, G.cyl, 0x7A4A30, 0.15, 0.74, 0, 0.38, 0.05, 0.38);
  part(g, G.cyl, 0xFFFFFF, 0.25, 0.78, 0.12, 0.13, 0.02, 0.13);
  part(g, G.box, 0xFF8A5C, 0.22, 0.81, 0.12, 0.08, 0.03, 0.05);
  part(g, G.box, 0xD8394B, 0.3, 0.81, 0.13, 0.08, 0.03, 0.05);
  part(g, G.box, 0xF4F1E8, 0.12, 0.78, -0.16, 0.16, 0.02, 0.22);
  part(g, G.box, 0x5B3424, -0.5, 0.25, 0, 0.36, 0.5, 0.36);
  part(g, G.box, 0x5B3424, -0.7, 0.75, 0, 0.06, 0.6, 0.36);
  const p = new Person(SUITS[1], 'fancy');
  p.position.set(-0.52, 0.25, 0); p.rotation.y = Math.PI / 2; g.add(p);
  p.legs.forEach(l => { l.rotation.x = -1.45; });
  const monocle = new Mesh(new TorusGeometry(0.04, 0.008, 6, 14), new MeshBasicMaterial({ color: 0xF2C14E }));
  monocle.position.set(0.07, 1.06, 0.255); p.add(monocle);
  // the score card, held up over their head
  const card = new Sprite(new SpriteMaterial({ map: canvasTex(96, 54, (c, w, h) => {
    c.fillStyle = '#FFFFFF'; rr(c, 2, 2, w - 4, h - 4, 8); c.fill(); write(c, '★★★★★', w / 2, h / 2 + 2, 18, '#F2A81D');
  }).tex }));
  card.scale.set(0.4, 0.22, 1); card.position.set(-0.32, 1.42, 0.12); card.visible = false; p.add(card);
  return {
    g, upd: (_dt, t) => {
      const show = t % 5 > 3.6;
      card.visible = show;
      p.arms[0].rotation.x = show ? -2.7 : -1.0;
      p.arms[1].rotation.x = -1.15 + Math.sin(t * 14) * 0.08;
    },
  };
}

/** A magazine rack by the entrance, with the restaurant on the covers. */
function magazines(): Ad {
  const g = spot(-4.9, FY, 14.9);
  for (const s of [-1, 1]) part(g, G.box, 0x7A4A30, s * 0.46, 0.62, 0, 0.04, 1.24, 0.34);
  for (const y of [0.32, 0.8]) { const b = part(g, G.box, 0x7A4A30, 0, y, 0.02, 0.9, 0.03, 0.3); b.rotation.x = 0.25; }
  const covers: [string, string, string, string][] = [
    ['SUSHI', '#FFFFFF', '#C0392B', '🍣'], ['GOURMET', '#F2C14E', '#23384A', '🍱'],
    ['TRAVEL', '#2EC4B6', '#FFFFFF', '🏯'], ['CHEFS', '#1B2430', '#F2C14E', '🔪'],
  ];
  covers.forEach(([title, bg, ink, icon], i) => {
    const { m } = picture(0.36, 0.46, 96, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      write(c, title, w / 2, 16, 18, ink);
      emoji(c, icon, w / 2, h * 0.56, 52);
      c.fillStyle = ink; c.fillRect(10, h - 16, w - 20, 4);
    });
    m.position.set((i % 2 ? 1 : -1) * 0.21, i < 2 ? 1.08 : 0.6, 0.06); m.rotation.x = -0.25;
    g.add(m);
  });
  return { g };
}

/** A TV camera on a tripod by the kitchen line, filming the chefs for a cooking show, with a studio light and an ON AIR sign. */
function cookingShow(): Ad {
  const g = spot(6.7, FY, 4.3, filming(6.7, 4.3));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = part(g, G.cyl, 0x2C3A47, Math.sin(a) * 0.22, 0.55, Math.cos(a) * 0.22, 0.02, 1.15, 0.02);
    leg.rotation.set(-Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38);
  }
  const head = new Group(); head.position.y = 1.2; g.add(head);
  part(head, G.box, 0x3C4C58, 0, 0.12, 0, 0.3, 0.3, 0.55);
  part(head, G.cyl, 0x1B2430, 0, 0.12, 0.36, 0.11, 0.2, 0.11).rotation.x = Math.PI / 2;
  part(head, G.box, 0x1B2430, -0.2, 0.22, -0.1, 0.1, 0.14, 0.18);
  const on = new MeshBasicMaterial({ color: 0xFF3B30 }), off = new MeshBasicMaterial({ color: 0x5A1A16 });
  const tally = part(head, G.sphere, on, 0.1, 0.3, 0.2, 0.035, 0.035, 0.035);
  part(g, G.cyl, 0x2C3A47, -0.75, 0.8, -0.5, 0.02, 1.6, 0.02);
  part(g, G.box, 0xFFF8EC, -0.75, 1.65, -0.42, 0.5, 0.42, 0.06).material = new MeshBasicMaterial({ color: 0xFFF8EC });
  const { m: sign, t: signTex } = picture(0.5, 0.18, 128, () => {}, true);
  const drawSign = (lit: boolean) => {
    const { ctx: c, canvas: { width: w, height: h } } = signTex;
    c.fillStyle = lit ? '#E0392B' : '#4A1A16'; c.fillRect(0, 0, w, h);
    write(c, 'ON AIR', w / 2, h / 2 + 2, 30, lit ? '#FFFFFF' : '#8A5A50');
    signTex.tex.needsUpdate = true;
  };
  drawSign(true);
  sign.position.set(-0.75, 2.05, -0.42); sign.rotation.y = CAM_YAW - g.rotation.y; g.add(sign);
  let lit = true;
  return {
    g, upd: (_dt, t) => {
      const now = t % 1.2 < 0.8;
      if (now !== lit) { lit = now; tally.material = now ? on : off; drawSign(now); }
      head.rotation.y = Math.sin(t * 0.5) * 0.12;
    },
  };
}

/** The gourmet guide: its red book on a pedestal by the register, and its gold stars turning above. */
function gourmetGuide(): Ad {
  const g = spot(9.2, FY, 14.6);
  part(g, G.box, 0xF4F1E8, 0, 0.47, 0, 0.46, 0.94, 0.46);
  part(g, G.box, 0xF2C14E, 0, 0.96, 0, 0.5, 0.04, 0.5);
  const book = part(g, G.box, 0xC0392B, 0, 1.03, 0, 0.32, 0.07, 0.42); book.rotation.x = -0.2;
  const gold = new MeshLambertMaterial({ color: 0xF2C14E, emissive: 0x6A4A00, emissiveIntensity: 0.6 });
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.055 : 0.13;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }); geo.center();
  const stars = [-0.3, 0, 0.3].map(x => part(g, geo, gold, x, 1.5, 0));
  return {
    g, upd: (_dt, t) => stars.forEach((st, i) => { st.rotation.y = t * 2 + i; st.position.y = 1.5 + Math.sin(t * 2 + i) * 0.05; }),
  };
}

/** Flags from all over the world, strung across the dining room. */
function worldFlags(): Ad {
  const g = spot(0, FY, 13.0, 0);
  const W = 64, H = 42;
  const flags: Draw[] = [
    c => { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H); c.fillStyle = '#C0392B'; c.beginPath(); c.arc(W / 2, H / 2, 11, 0, 7); c.fill(); },
    c => { ['#1F4E9C', '#FFFFFF', '#D63A2A'].forEach((f, i) => { c.fillStyle = f; c.fillRect(i * W / 3, 0, W / 3 + 1, H); }); },
    c => { ['#2F8F46', '#FFFFFF', '#D63A2A'].forEach((f, i) => { c.fillStyle = f; c.fillRect(i * W / 3, 0, W / 3 + 1, H); }); },
    c => { ['#1B1B1B', '#D63A2A', '#F2C14E'].forEach((f, i) => { c.fillStyle = f; c.fillRect(0, i * H / 3, W, H / 3 + 1); }); },
    c => {
      c.fillStyle = '#2F8F46'; c.fillRect(0, 0, W, H); c.fillStyle = '#F2C14E';
      c.beginPath(); c.moveTo(W / 2, 4); c.lineTo(W - 6, H / 2); c.lineTo(W / 2, H - 4); c.lineTo(6, H / 2); c.fill();
      c.fillStyle = '#1F4E9C'; c.beginPath(); c.arc(W / 2, H / 2, 9, 0, 7); c.fill();
    },
    c => {
      for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#C0392B'; c.fillRect(0, i * H / 7, W, H / 7 + 1); }
      c.fillStyle = '#1F3A7A'; c.fillRect(0, 0, W * 0.42, H * 0.57);
    },
    c => { c.fillStyle = '#D63A2A'; c.fillRect(0, 0, W, H); c.fillStyle = '#FFFFFF'; c.fillRect(W / 4, 0, W / 2, H); c.fillStyle = '#D63A2A'; c.fillRect(W / 2 - 6, H / 2 - 8, 12, 16); },
    c => { c.fillStyle = '#1F5FA8'; c.fillRect(0, 0, W, H); c.fillStyle = '#F2C14E'; c.fillRect(W * 0.3, 0, 9, H); c.fillRect(0, H / 2 - 4, W, 9); },
  ];
  const atlas = canvasTex(W * 4, H * 2, c => flags.forEach((f, i) => {
    c.save(); c.translate((i % 4) * W, Math.floor(i / 4) * H); c.beginPath(); c.rect(0, 0, W, H); c.clip(); f(c, W, H); c.restore();
  })).tex;
  // each flag design is a little plane whose texture coordinates pick its cell of the atlas
  const cells = flags.map((_, i) => {
    const p = new PlaneGeometry(0.32, 0.21), uv = p.attributes.uv;
    const u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 2;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) / 4, v0 + uv.getY(j) / 2);
    return p;
  });
  const X = HALL_BOX.x1 - 0.3, y = (x: number) => 3.2 - 0.5 * (1 - (x / X) ** 2);
  const parts: Part[] = [];
  let i = 0;
  for (let x = -X + 0.3; x < X - 0.2; x += 0.44, i++) parts.push({ geo: cells[(i * 3) % cells.length], at: [x, y(x) - 0.12, 0] });
  g.add(new Mesh(bake(parts), new MeshLambertMaterial({ map: atlas, side: DoubleSide })));
  const string = new CatmullRomCurve3([-X, -X / 2, 0, X / 2, X].map(x => V(x, y(x), 0)));
  g.add(mesh(new TubeGeometry(string, 40, 0.012, 4), 0xF4F1E8));
  return { g };
}

/** In the order of the restaurant's campaigns (MOD.promo.levels). */
export const restaurantAds: Ad[] = [menuBoard(), lanternSigns(), ringLight(), critic(), magazines(), cookingShow(), gourmetGuide(), worldFlags()];

let time = 0;
/** Animates the campaigns that are up. */
export function updAds(dt: number) {
  time += dt;
  for (const a of [...marketAds, ...restaurantAds]) if (a.upd && a.g.visible && a.g.parent?.visible) a.upd(dt, time);
}
