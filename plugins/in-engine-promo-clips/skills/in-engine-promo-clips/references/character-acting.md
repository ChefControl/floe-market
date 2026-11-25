# Making a game character act

All of this goes in the clip's script and is attached to the character for the clip only. `assets/cartoon-kit.js`
implements it for three.js; the numbers below assume a head about 0.4 units across. Scale everything by your
character's head size.

## Find the face first

Before adding anything, find where the head's centre, the eyes and the mouth are in the character's own space (read
the character code, or log the bounding box of the head mesh). Attach new parts to the same node the head moves with
(the body or head bone), so they breathe, lean and shake with it.

## Brows: most of the emotion

- Two dark boxes, ~0.085 × 0.02 × 0.016, just above each eye, slightly sunk into the face.
- Angle (around the face's forward axis, mirrored per side): −0.14 rad (happy, outer ends down) → 0 (neutral) →
  +0.7 rad (furious V, inner ends down).
- They drop ~0.024 and thicken ~30% as anger rises.
- Draw them after anything translucent on the face (see the red rise) or they turn pink: give them a transparent
  material with opacity 1 and a higher render order.

## Mouth: driven by the voice

- Compute the voice's loudness per video frame (RMS of each 1/30 s, scaled so speech peaks near 1). The sound script
  writes this array next to the timeline (`mix_example.mjs` does).
- Open mouth: a dark red flattened ellipse; width 0.024 + 0.024·mood + 0.012·open, height 0.008 + open·(0.022 +
  0.03·mood). Above a threshold (~0.06) it's open, below it's closed.
- Teeth: a thin white bar at the top of the open mouth once mood > 0.5 (gritted, yelling).
- Closed: a small arc. A smile while mood is ~0, a frown that deepens with mood.
- On a scream force it wide open whatever the level says.
- Lean the upper body toward the camera when yelling (≈ 0.16 rad × open × mood).

## Mood: one curve everything reads

A function of time over the beats: 0 (happy) → 0.1 (answering) → 0.3 (listening, unimpressed) → 0.55 (second call)
→ 0.9 (the fast part) → 1 (the scream). Brows, mouth, red, steam and shake all read the same curve, so they never
disagree.

## The anger kit

- **Red rise:** a sphere slightly bigger than the head (+6%), with a shader that is red below a height and invisible
  above it; animate the height from below the chin to above the crown, opacity up to ~0.75. Eyes, brows and mouth
  stay readable on top of it.
- **Ear steam:** soft round sprite puffs from both ears, shooting out sideways and up, growing ×3 and fading over
  ~0.6 s, ~10 per second rising to 45 per second at the scream. Generate the puff texture on a canvas (radial white
  gradient).
- **Shake:** a small position and yaw jitter above mood 0.3, growing with mood.
- **Hat lift:** if they wear a hat, lift it a few centimetres on the scream, like a kettle lid.

## Held props

- A phone to the ear: raise the arm until the hand is at ear height beside the head (check that it isn't inside the
  head), then put the phone at a point just outside the ear, not at the hand. Turn it ~55° from facing the cheek
  toward the camera so the viewer sees it's a phone. Scale it up 1.5–2× from real size and give the case a colour.
- A ladle or tool between the hand and a target: place it at the hand, point it at the target, and set its length
  to the distance (+ a little), so it never comes out the far side.
- When the hand isn't using the prop (stirring while on the phone), blend between poses with a weight (0–1) eased
  over ~0.18 s.

## A character who is seen from behind

For a calm ending shot from behind (sitting on a dock, fishing), the face doesn't matter. Make the pose sell it: legs
bent over the edge swinging slowly, arms forward on a rod, a slight breathe.
