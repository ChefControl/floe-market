// The world past the bay, for the low views out to sea (Mr. Fugu's meeting, offer.ts): the sea carries on out of the
// bay until the haze swallows it, with islands far out in it and a lighthouse on the biggest, so the horizon is far
// off and full rather than the edge of the map. At night (stage.ts setNight) a moon rises over the water, the stars
// come out and the lighthouse's lamp turns.
import {
  AdditiveBlending, BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh,
  MeshLambertMaterial, Points, PointsMaterial, Sprite, SpriteMaterial,
} from 'three';
import { quietly } from './kit';
import { BAY } from './layout';
import { canvasTex, scene } from './render';
import { rng } from './wardrobe';

/** How far out the open sea goes: past the fog's far end (render.ts), so it fades into the sky rather than stopping. */
const OUT = 160;
/** The bay's water at its far edge (world.ts' water gradient), which the open sea carries on in. */
const DEEP = 0x1E8FC0;

const g = quietly(() => new Group());
g.name = 'horizon';
scene.add(g);

quietly(() => {
  // ---------- the open sea ----------
  // two sheets round the bay's sea, just under it: north of it, and west of it, both out to the haze
  const sea = new MeshLambertMaterial({ color: DEEP });
  const sheet = (x0: number, x1: number, z0: number, z1: number) => {
    const m = new Mesh(flatPlane(x1 - x0, z1 - z0), sea);
    m.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2);
    m.receiveShadow = true;
    g.add(m);
  };
  sheet(BAY.x0, BAY.x1, BAY.z0 - OUT, BAY.z0);
  // (the bay's own sea, world.ts, runs to layout.ts' BAY: west of it, and north of it, the open sea takes over)
  sheet(BAY.x0 - OUT, BAY.x0, BAY.z0 - OUT, BAY.shore - 0.12);

  // ---------- islands, far out ----------
  // low hills of rock and pine, hazy blue-green with the distance (the fog does the rest)
  const ROCK = 0x3F5A58, PINE = 0x2F4A40;
  const islands: [number, number, number, number][] = [
    // x, z, width, height
    [-26, -62, 11, 2.0], [-14, -66, 6, 1.2], [-44, -58, 8, 1.6], [4, -68, 13, 2.6], [-60, -50, 9, 1.8],
  ];
  const r = rng(0xB1A5);
  for (const [x, z, w, h] of islands) {
    for (let i = 0; i < 4; i++) {
      const hill = new Mesh(new ConeGeometry(1, 1, 6, 1), new MeshLambertMaterial({ color: i % 2 ? PINE : ROCK }));
      const k = 1 - i * 0.2;
      hill.scale.set(w * 0.5 * k, h * (0.7 + r() * 0.5) * k, w * 0.28 * k);
      hill.position.set(x + (r() - 0.5) * w * 0.6, hill.scale.y / 2, z + (r() - 0.5) * 2);
      hill.rotation.y = r() * Math.PI;
      g.add(hill);
    }
  }
});

/** A flat plane `w` by `d`, facing up. */
function flatPlane(w: number, d: number) {
  const geo = new BufferGeometry();
  const x = w / 2, z = d / 2;
  geo.setAttribute('position', new Float32BufferAttribute([-x, 0, -z, -x, 0, z, x, 0, z, x, 0, -z], 3));
  geo.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  return geo;
}

// ---------- the lighthouse ----------
// on a rock of its own off the biggest island: white with red bands, and at night its lamp sweeps round (a glow that
// swells and fades)
const LIGHTHOUSE = { x: 12, z: -64, y: 0.9 };
const glowTex = canvasTex(64, 64, (c, w, h) => {
  const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,248,220,1)'); gr.addColorStop(0.25, 'rgba(255,224,150,.7)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
});
const lamp = quietly(() => new Sprite(new SpriteMaterial({ map: glowTex.tex, blending: AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 })));
quietly(() => {
  const rock = new Mesh(new ConeGeometry(2.4, 1.6, 7), new MeshLambertMaterial({ color: 0x3F5A58 }));
  rock.position.set(LIGHTHOUSE.x, 0.5, LIGHTHOUSE.z);
  g.add(rock);
  const tower = new Group();
  tower.position.set(LIGHTHOUSE.x, LIGHTHOUSE.y, LIGHTHOUSE.z);
  for (let i = 0; i < 4; i++) {
    const band = new Mesh(new CylinderGeometry(0.62 - i * 0.07, 0.68 - i * 0.07, 0.9, 8), new MeshLambertMaterial({ color: i % 2 ? 0xC0392B : 0xF4F1EA }));
    band.position.y = 0.45 + i * 0.9;
    tower.add(band);
  }
  const cap = new Mesh(new ConeGeometry(0.5, 0.6, 8), new MeshLambertMaterial({ color: 0x2B2F36 }));
  cap.position.y = 4.15;
  tower.add(cap);
  lamp.position.set(0, 3.75, 0);
  lamp.scale.setScalar(2.4);
  tower.add(lamp);
  g.add(tower);
});

// ---------- the night sky ----------
// a moon over the sea, out past the islands, where it hangs over Mr. Fugu's left shoulder as he talks (the meeting's
// close-up looks north out to sea over the chef's shoulder: the moon's a little left of that, and high enough to
// clear his hat), and stars over all of it
const moonTex = canvasTex(128, 128, (c, w, h) => {
  const halo = c.createRadialGradient(w / 2, h / 2, w * 0.16, w / 2, h / 2, w / 2);
  halo.addColorStop(0, 'rgba(255,244,214,.55)'); halo.addColorStop(1, 'rgba(255,244,214,0)');
  c.fillStyle = halo; c.fillRect(0, 0, w, h);
  c.fillStyle = '#FFF4D6'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.17, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(214,200,170,.6)';
  for (const [x, y, rr] of [[-0.05, -0.04, 0.04], [0.06, 0.03, 0.03], [-0.02, 0.07, 0.022]]) {
    c.beginPath(); c.arc(w * (0.5 + x), h * (0.5 + y), w * rr, 0, Math.PI * 2); c.fill();
  }
});
const moon = quietly(() => new Sprite(new SpriteMaterial({ map: moonTex.tex, transparent: true, depthWrite: false, fog: false, opacity: 0 })));
moon.position.set(-11.4, 28.5, -141);
moon.scale.setScalar(15);
g.add(moon);

const stars = quietly(() => {
  const r = rng(0x57A25), pos: number[] = [];
  for (let i = 0; i < 420; i++) {
    // over the sea and up the sky, thinning out near the horizon's haze
    const yaw = (r() - 0.5) * Math.PI * 1.6, up = Math.pow(r(), 0.7) * 1.2 + 0.03, R = 170;
    pos.push(Math.sin(yaw) * Math.cos(up) * R, Math.sin(up) * R, -Math.cos(yaw) * Math.cos(up) * R - 20);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return new Points(geo, new PointsMaterial({ color: 0xFFFFFF, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false, opacity: 0 }));
});
g.add(stars);

let clock = 0, nightAt = 0;
/** How far night has fallen (stage.ts' setNight, 0 to 1): the moon, the stars and the lighthouse's lamp with it. */
export function nightSky(k: number) {
  nightAt = k;
  (moon.material as SpriteMaterial).opacity = k;
  (stars.material as PointsMaterial).opacity = 0.85 * k;
}
/** Turns the lighthouse's lamp: call every frame. */
export function updHorizon(dt: number) {
  clock += dt;
  // a beam sweeping round once every six seconds: bright as it faces this way, faint the rest of the turn
  const turn = (clock / 6) % 1, face = Math.pow(Math.max(0, Math.cos(turn * Math.PI * 2)), 6);
  (lamp.material as SpriteMaterial).opacity = nightAt * (0.25 + 0.75 * face);
  lamp.scale.setScalar(2.4 + 3.5 * face);
}
