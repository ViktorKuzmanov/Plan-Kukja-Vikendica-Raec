// Scene, camera, controls and the user interface.
// What is ON the plot is described in site-config.js — start there.

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { SITE } from './site-config.js';
import { BUILDERS } from './objects.js';
import { TEXT } from './i18n.js';

const STORE_LAYOUT = 'kukja-layout-v1';
const STORE_LANG = 'kukja-lang';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
};
const $ = (s) => document.querySelector(s);
const rad = THREE.MathUtils.degToRad;

// ── renderer, scene, light ───────────────────────────────────────────────────
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY = 0xbcd6ea;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 180, 520);

const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 1200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.minDistance = 4;
controls.maxDistance = 260;

scene.add(new THREE.HemisphereLight(0xeaf3ff, 0xb5a585, 1.7));
const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
sun.position.set(55, 70, -35); // lights the sides you see from the entrance
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 250 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.05;
scene.add(sun);

// ── ground: surrounding land + the drone photo ───────────────────────────────
{
  const far = new THREE.Mesh(new THREE.CircleGeometry(700, 48), new THREE.MeshStandardMaterial({ color: 0x8f9466, roughness: 1 }));
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.08;
  far.receiveShadow = true;
  scene.add(far);

  const g = SITE.ground;
  const w = g.imageWidthPx * g.metresPerPixel;
  const h = g.imageHeightPx * g.metresPerPixel;
  const tex = new THREE.TextureLoader().load(g.image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // soft edges so the photo blends into the surrounding land
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, 256, 256);
  c.filter = 'blur(10px)';
  c.fillStyle = '#fff';
  c.fillRect(18, 18, 220, 220);
  const alpha = new THREE.CanvasTexture(cv);

  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, alphaMap: alpha, transparent: true, roughness: 1 }),
  );
  photo.rotation.x = -Math.PI / 2;
  photo.receiveShadow = true;
  scene.add(photo);
}

// ── plot boundary ────────────────────────────────────────────────────────────
const boundary = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(SITE.boundary.map(([x, z]) => new THREE.Vector3(x, 0.15, z))),
  new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1.2, gapSize: 0.8 }),
);
boundary.computeLineDistances();
scene.add(boundary);

// ── objects from the config ──────────────────────────────────────────────────
const saved = JSON.parse(store.get(STORE_LAYOUT) || '{}');
const entries = [];
const labelsEl = $('#labels');

for (const cfg of SITE.objects) {
  const build = BUILDERS[cfg.type];
  if (!build) { console.warn(`Unknown object type "${cfg.type}" for "${cfg.id}"`); continue; }
  const group = build(cfg);
  const entry = { cfg, group, x: cfg.position[0], z: cfg.position[1], rot: cfg.rotation || 0 };
  if (saved[cfg.id]) Object.assign(entry, saved[cfg.id]);
  group.traverse((o) => { o.userData.entry = entry; });
  const el = document.createElement('div');
  el.className = 'label' + (cfg.status === 'planned' ? ' planned' : '');
  labelsEl.appendChild(el);
  entry.label = el;
  place(entry);
  scene.add(group);
  entries.push(entry);
}

function place(e) {
  e.group.position.set(e.x, 0, e.z);
  e.group.rotation.y = rad(e.rot);
}
const byId = (id) => entries.find((e) => e.cfg.id === id);

// ── language ─────────────────────────────────────────────────────────────────
let lang = store.get(STORE_LANG) || ((navigator.language || '').startsWith('mk') ? 'mk' : 'en');
function setLang(l) {
  lang = l;
  store.set(STORE_LANG, l);
  document.documentElement.lang = l;
  document.title = SITE.title[l];
  $('#title').textContent = SITE.title[l];
  document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = TEXT[l][n.dataset.i18n]; });
  document.querySelectorAll('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === l));
  for (const e of entries) {
    e.label.textContent = e.cfg.name[l];
    if (e.cfg.status === 'planned') {
      const s = document.createElement('small');
      s.textContent = TEXT[l].plannedTag.toLowerCase();
      e.label.appendChild(s);
    }
  }
  refreshSelection();
}
document.querySelectorAll('#lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

// ── camera views ─────────────────────────────────────────────────────────────
let fly = null;
function goTo(pos, target, instant = false) {
  if (instant) {
    camera.position.set(...pos);
    controls.target.set(...target);
    controls.update();
    return;
  }
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target), k: 0 };
}
function view(name, instant) {
  const house = byId('house') || entries[0];
  const hx = house ? house.x : 0, hz = house ? house.z : 0;
  // directions of the house's own "front" (terrace side) and "right" side
  const a = rad(house ? house.rot : 0);
  const south = [Math.sin(a), Math.cos(a)];
  const east = [Math.cos(a), -Math.sin(a)];
  const gate = byId('gate');
  const views = {
    overview: [[hx + 55, 48, hz - 38], [hx - 8, 0, hz + 6]],
    top: [[0, 135, 0.01], [0, 0, 0]],
    entrance: gate ? [[gate.x + 2.5, 4.5, gate.z - 6], [hx, 1.5, hz]] : [[hx + 30, 4, hz - 30], [hx, 1.5, hz]],
    terrace: [[hx + south[0] * 20 - east[0] * 9, 5, hz + south[1] * 20 - east[1] * 9], [hx - east[0] * 2, 1.5, hz - east[1] * 2]],
  };
  goTo(...views[name], instant);
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => view(b.dataset.view)));

// ── show / hide switches ─────────────────────────────────────────────────────
$('#t-roof').addEventListener('change', (ev) => {
  for (const e of entries) e.group.userData.setRoofVisible?.(ev.target.checked);
});
function applyVisibility() {
  const planned = $('#t-planned').checked;
  for (const e of entries) e.group.visible = planned || e.cfg.status !== 'planned';
  labelsEl.style.display = $('#t-labels').checked ? '' : 'none';
  boundary.visible = $('#t-boundary').checked;
}
for (const id of ['#t-planned', '#t-labels', '#t-boundary']) $(id).addEventListener('change', applyVisibility);
$('#collapse').addEventListener('click', () => $('#panel').classList.toggle('closed'));
if (innerWidth <= 640) $('#panel').classList.add('closed');

// ── edit layout: drag objects on the ground ──────────────────────────────────
let editing = false;
let selected = null;
let drag = null;
const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const selBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffc400);
selBox.visible = false;
scene.add(selBox);

function pointerRay(ev) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
}
function groundPoint(ev) {
  pointerRay(ev);
  return ray.ray.intersectPlane(groundPlane, new THREE.Vector3());
}
function refreshSelection() {
  $('#sel').hidden = !selected;
  selBox.visible = !!selected && editing;
  if (!selected) return;
  selBox.setFromObject(selected.group);
  $('#sel-name').textContent = selected.cfg.name[lang];
  $('#sel-pos').textContent = `x ${selected.x.toFixed(1)} m · z ${selected.z.toFixed(1)} m · ${Math.round(selected.rot)}°`;
}
function saveLayout() {
  const out = {};
  for (const e of entries) {
    const moved = e.x !== e.cfg.position[0] || e.z !== e.cfg.position[1] || e.rot !== (e.cfg.rotation || 0);
    if (moved) out[e.cfg.id] = { x: e.x, z: e.z, rot: e.rot };
  }
  store.set(STORE_LAYOUT, JSON.stringify(out));
}

$('#t-edit').addEventListener('change', (ev) => {
  editing = ev.target.checked;
  $('#edit-box').hidden = !editing;
  if (!editing) selected = null;
  refreshSelection();
});
canvas.addEventListener('pointerdown', (ev) => {
  if (!editing || ev.button !== 0) return;
  pointerRay(ev);
  const hit = ray.intersectObjects(entries.filter((e) => e.group.visible).map((e) => e.group), true)[0];
  selected = hit ? hit.object.userData.entry : null;
  if (selected) {
    const p = groundPoint(ev);
    if (p) {
      drag = { dx: selected.x - p.x, dz: selected.z - p.z };
      controls.enabled = false;
      canvas.setPointerCapture(ev.pointerId);
    }
  }
  refreshSelection();
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag || !selected) return;
  const p = groundPoint(ev);
  if (!p) return;
  selected.x = Math.round((p.x + drag.dx) * 10) / 10;
  selected.z = Math.round((p.z + drag.dz) * 10) / 10;
  place(selected);
  refreshSelection();
});
function endDrag() {
  if (!drag) return;
  drag = null;
  controls.enabled = true;
  saveLayout();
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function rotateSelected(deg) {
  if (!selected) return;
  selected.rot = (((selected.rot + deg) % 360) + 360) % 360;
  place(selected);
  refreshSelection();
  saveLayout();
}
$('#rot-l').addEventListener('click', () => rotateSelected(5));
$('#rot-r').addEventListener('click', () => rotateSelected(-5));

$('#copy').addEventListener('click', async () => {
  const text = entries.map((e) => `${e.cfg.id}: position: [${e.x.toFixed(1)}, ${e.z.toFixed(1)}], rotation: ${Math.round(e.rot * 10) / 10},`).join('\n');
  const ta = $('#export');
  ta.hidden = false;
  ta.value = text;
  try {
    await navigator.clipboard.writeText(text);
    $('#copy').textContent = TEXT[lang].copied;
    setTimeout(() => { $('#copy').textContent = TEXT[lang].copy; }, 1500);
  } catch {
    ta.select();
  }
});
$('#reset').addEventListener('click', () => {
  store.del(STORE_LAYOUT);
  for (const e of entries) {
    e.x = e.cfg.position[0];
    e.z = e.cfg.position[1];
    e.rot = e.cfg.rotation || 0;
    place(e);
  }
  refreshSelection();
});

// ── render loop ──────────────────────────────────────────────────────────────
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

const v = new THREE.Vector3();
function updateLabels() {
  const w = innerWidth, h = innerHeight;
  for (const e of entries) {
    v.set(e.x, e.group.userData.labelHeight || 2, e.z).project(camera);
    const show = e.group.visible && v.z < 1 && v.z > -1;
    e.label.style.display = show ? '' : 'none';
    if (show) {
      e.label.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
      e.label.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
    }
  }
}

function frame() {
  if (fly) {
    fly.k = Math.min(1, fly.k + 0.03);
    const t = fly.k * fly.k * (3 - 2 * fly.k);
    camera.position.lerpVectors(fly.p0, fly.p1, t);
    controls.target.lerpVectors(fly.t0, fly.t1, t);
    if (fly.k === 1) fly = null;
  }
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(frame);
}

resize();
setLang(lang);
applyVisibility();
view('overview', true);
frame();
window.__site = { scene, camera, controls, entries, view }; // handy in the browser console
