// A music bed: the game's own music for `#N` seconds (render-play --mute sfx,amb --sound-only), nothing nudged.
window.cine = { len: Number(location.hash.slice(1)) || 20, frame() {} };
