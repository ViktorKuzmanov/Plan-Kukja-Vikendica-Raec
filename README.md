# Weekend house — 3D plan

An interactive 3D model of the plot (about 5 decares), the existing house and
small object, and the things planned for later (pool, parking, …). It runs in
any browser, on a phone too, and can be shared as a link.

## Run it on your computer

```bash
python3 -m http.server 5173
```

Then open <http://localhost:5173>. (Opening `index.html` by double-click does
not work — browsers need a local server for this kind of page.)

## How it is built

| What | Where | Notes |
|---|---|---|
| **Everything on the plot** | `src/site-config.js` | The file to edit. Positions, sizes, names, built/planned. |
| House and small object | `src/house.js` | Dimensions from the architect's plan, look from the photos. |
| Pool, parking, gate, tree, generic box/area | `src/objects.js` | One small function per object type. |
| Camera, switches, edit mode | `src/main.js` | |
| Button texts (MK / EN) | `src/i18n.js` | |
| Ground photo, floor plan | `assets/` | `drone.jpg` (handwritten labels removed), `plan.jpg` (cropped plan). |
| 3D engine | `vendor/` | Three.js 0.170, copied in — no install, no build step. |
| Original photos and plan | `data/` | Kept private: listed in `.gitignore`, not published. |

Technology: plain HTML + JavaScript modules + [Three.js](https://threejs.org).
There is nothing to compile, so GitHub Pages can serve the folder as it is.

## Changing things

**Move something:** switch on *Edit layout*, drag the object, rotate it with the
⟲ ⟳ buttons. This is saved only in your own browser. To make it permanent for
everyone, press *Copy layout* and put the numbers into `position` / `rotation`
in `src/site-config.js`.

**Add something:** add an entry to `objects` in `src/site-config.js`:

```js
{ id: 'gazebo', type: 'box', name: { mk: 'Летниковец', en: 'Gazebo' },
  status: 'planned', position: [0, 5], rotation: 0, size: [4, 2.6, 4], color: '#b08a5a' },
```

Available types:

| type | options |
|---|---|
| `pool` | `length`, `width`, `deck` |
| `parking` | `spots` (2.5 × 5 m each) |
| `area` | flat surface (road, paving, lawn): `length`, `width`, `color` |
| `box` | simple block for any building: `size: [w, h, d]`, `color` |
| `tree` | `height` |
| `gate` | `width`, `height` |
| `house`, `shed` | the existing buildings (edit `src/house.js` to change them) |

`status: 'built'` or `'planned'` decides the label colour and whether the
*Planned items* switch hides it. Units are metres and degrees; `x` is to the
right of the drone photo, `z` is down the photo, `(0, 0)` is its centre.

**Remove something:** delete its entry (or put `//` in front of the lines).

## What is measured and what is estimated

- **Measured (from the architect's plan):** house footprint 11.0 × 9.5 m with
  the living room reaching 12.0 m, terrace 6.0 × 3.5 m, window and door sizes
  and positions, small object 4.0 × 3.5 m standing 3 m from the house.
- **Estimated from photos:** wall height (3.0 m to the eaves), roof shape and
  pitch, colours, the small object's roof heights and its openings.
- **Estimated position:** where the house sits on the plot and how it is turned
  (from the labels on the drone photo and the view from the gate).
- **Estimated scale:** the drone photo is scaled so the traced plot outline
  equals 5000 m². One real measurement on site (for example gate → house
  corner) would let this be corrected: change `metresPerPixel` in the config.
- The ground is flat, and the photo was taken before the house was built.

## Publishing on GitHub Pages (later)

1. Create a repository on GitHub and push this folder to it.
2. In the repository: Settings → Pages → Source: *Deploy from a branch*,
   branch `main`, folder `/ (root)`.
3. After a minute the model is live at `https://<user>.github.io/<repository>/`.

Note that a GitHub Pages site is public: anyone with the link can see the drone
photo and the floor plan.
