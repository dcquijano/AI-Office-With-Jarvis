/**
 * Shared geometry/material caches, procedural PBR textures, live workstation screen
 * renderers, and world-to-Three.js coordinate helpers.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mixColor } from './sky.js';

export const mixHex = mixColor;

const SEVERITY_SCREEN_COLORS = ['#94a3b8', '#EAB308', '#F97316', '#ef4444', '#f87171'];

export function V(x, y, z = 0) {
  return new THREE.Vector3(x, z, y);
}

export function createAssetCache() {
  return {
    mats: new Map(),
    geos: new Map(),
    textures: new Map(),
    screens: {}
  };
}

export function getMat(cache, key, factory) {
  if (!cache.mats.has(key)) {
    cache.mats.set(key, factory());
  }
  return cache.mats.get(key);
}

export function boxGeo(cache, w, h, d) {
  const key = `box:${w}:${h}:${d}`;
  if (!cache.geos.has(key)) {
    cache.geos.set(key, new THREE.BoxGeometry(w, h, d));
  }
  return cache.geos.get(key);
}

export function roundedBoxGeo(cache, w, h, d, r = 0.03, seg = 2) {
  const key = `rbox:${w}:${h}:${d}:${r}:${seg}`;
  if (!cache.geos.has(key)) {
    cache.geos.set(key, new RoundedBoxGeometry(w, h, d, seg, r));
  }
  return cache.geos.get(key);
}

export function cylGeo(cache, rTop, rBot, h, seg = 24) {
  const key = `cyl:${rTop}:${rBot}:${h}:${seg}`;
  if (!cache.geos.has(key)) {
    cache.geos.set(key, new THREE.CylinderGeometry(rTop, rBot, h, seg));
  }
  return cache.geos.get(key);
}

export function addBox(parent, cache, w, d, h, mat, x, y, z0, opts = {}) {
  const { rounded = 0, cast = true, receive = true, staticMesh = true } = opts;
  const geo = rounded > 0 ? roundedBoxGeo(cache, w, h, d, rounded) : boxGeo(cache, w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, z0 + h * 0.5, y);
  mesh.castShadow = cast && h >= 0.22;
  mesh.receiveShadow = receive;
  if (staticMesh) {
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
  }
  parent.add(mesh);
  return mesh;
}

export function addCyl(parent, cache, rTop, rBot, h, mat, x, y, z0, seg = 24, opts = {}) {
  const { cast = true, receive = true, staticMesh = true } = opts;
  const geo = cylGeo(cache, rTop, rBot, h, seg);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, z0 + h * 0.5, y);
  mesh.castShadow = cast && h >= 0.22;
  mesh.receiveShadow = receive;
  if (staticMesh) {
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
  }
  parent.add(mesh);
  return mesh;
}

function configureTexture(tex, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

export function woodTexture(cache, base = '#7c4f2b', repeatX = 1, repeatY = 1) {
  const key = `tex:wood:${base}:${repeatX}:${repeatY}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 2) {
    const shade = (Math.sin(y * 0.22) * 0.5 + Math.sin(y * 0.07) * 0.5) * 18;
    ctx.fillStyle = shade > 0 ? `rgba(255,220,180,${shade / 260})` : `rgba(20,10,4,${-shade / 220})`;
    ctx.fillRect(0, y, 256, 2);
  }
  for (let i = 0; i < 420; i += 1) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(x, y, 18 + (i % 24), 1);
  }

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX, repeatY, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function carpetTexture(cache, color = '#1e293b', repeatX = 2, repeatY = 2) {
  const key = `tex:carpet:${color}:${repeatX}:${repeatY}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i += 1) {
    const x = (i * 53) % 128;
    const y = (i * 97) % 128;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX, repeatY, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function floorTileTexture(cache, repeatX = 14, repeatY = 9) {
  const key = `tex:tile:${repeatX}:${repeatY}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#18243b';
  ctx.fillRect(0, 0, 256, 256);

  const cells = 2;
  const step = 256 / cells;
  for (let gx = 0; gx < cells; gx += 1) {
    for (let gy = 0; gy < cells; gy += 1) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#1b2842' : '#162238';
      ctx.fillRect(gx * step + 2, gy * step + 2, step - 4, step - 4);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.04)';
      ctx.fillRect(gx * step + 4, gy * step + 4, step - 8, 6);
    }
  }
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= cells; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(256, i * step);
    ctx.stroke();
  }

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX, repeatY, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function oakFloorTexture(cache, tone = '#b98a5e', repeatX = 2, repeatY = 2) {
  const key = `tex:oak:${tone}:${repeatX}:${repeatY}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(512, 512);
  const plankH = 32;
  for (let row = 0; row < 512 / plankH; row += 1) {
    const offset = (row * 173) % 512;
    const rowShade = ((row * 37) % 7) / 7;
    const base = mixColor(tone, row % 2 === 0 ? '#d9b48a' : '#8f6440', 0.12 + rowShade * 0.18);
    ctx.fillStyle = base;
    ctx.fillRect(0, row * plankH, 512, plankH);
    // grain
    for (let g = 0; g < 26; g += 1) {
      const gy = row * plankH + ((g * 13 + row * 7) % plankH);
      ctx.fillStyle = g % 3 === 0 ? 'rgba(70,40,15,0.10)' : 'rgba(255,235,205,0.07)';
      ctx.fillRect(0, gy, 512, 1);
    }
    // plank seams (staggered)
    ctx.fillStyle = 'rgba(40,22,8,0.45)';
    ctx.fillRect(0, row * plankH + plankH - 1, 512, 1);
    for (let x = -offset; x < 512; x += 256) {
      ctx.fillRect(x + 256, row * plankH, 1, plankH);
    }
  }
  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX, repeatY, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function concreteTileTexture(cache, repeatX = 11, repeatY = 7) {
  const key = `tex:concrete:${repeatX}:${repeatY}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#cfccc6';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i += 1) {
    const x = (i * 71) % 256;
    const y = (i * 151) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(60,55,50,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = 'rgba(90, 86, 80, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 254);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();
  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX, repeatY, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function oakMat(cache, tone = '#b98a5e') {
  return getMat(cache, `mat:oak:${tone}`, () =>
    new THREE.MeshStandardMaterial({
      map: oakFloorTexture(cache, tone),
      roughness: 0.48,
      metalness: 0.02
    })
  );
}

export function grassTexture(cache, repeatX = 2, repeatY = 3) {
  const key = `tex:grass:${repeatX}:${repeatY}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#166534';
  ctx.fillRect(0, 64, 128, 64);
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect((i * 41) % 128, (i * 83) % 128, 2, 3);
  }

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX, repeatY, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function courtWoodTexture(cache, repeatX = 2, repeatY = 3) {
  const key = `tex:courtwood:${repeatX}:${repeatY}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#b86827';
  ctx.fillRect(0, 0, 256, 256);
  const plankH = 16;
  for (let y = 0; y < 256; y += plankH) {
    ctx.fillStyle = (y / plankH) % 2 === 0 ? 'rgba(255,210,150,0.07)' : 'rgba(40,15,0,0.08)';
    ctx.fillRect(0, y, 256, plankH - 1);
    ctx.fillStyle = 'rgba(30, 12, 0, 0.25)';
    ctx.fillRect(0, y + plankH - 1, 256, 1);
  }

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX, repeatY, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function fabricTexture(cache, color = '#334155') {
  const key = `tex:fabric:${color}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(64, 64);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 2) {
    for (let x = 0; x < 64; x += 2) {
      ctx.fillStyle = (x + y) % 4 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX: 2, repeatY: 2, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function noiseNormalMap(cache) {
  const key = 'tex:waterNormal';
  if (cache.textures.has(key)) return cache.textures.get(key);

  const size = 128;
  const { c, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const h =
        Math.sin(u * 3 + v * 2) * 0.35 +
        Math.cos(u * 5 - v * 4) * 0.25 +
        Math.sin(u * 9 + v * 7) * 0.15;
      heights[y * size + x] = h;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      const dx = (heights[y * size + xp] - heights[y * size + xm]) * 1.4;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * 1.4;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      img.data[idx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      img.data[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX: 3, repeatY: 4, srgb: false });
  cache.textures.set(key, tex);
  return tex;
}

export function rackGrilleTexture(cache) {
  const key = 'tex:rackGrille';
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(128, 256);
  ctx.fillStyle = '#090f1d';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 14) {
    ctx.fillStyle = '#111b30';
    ctx.fillRect(10, y, 108, 10);
    for (let x = 14; x < 112; x += 6) {
      ctx.fillStyle = '#040812';
      ctx.fillRect(x, y + 2, 3, 6);
    }
  }

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX: 1, repeatY: 1, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function logoTexture(cache, text = 'J.A.R.V.I.S.') {
  const key = `tex:logo:${text}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(512, 160);
  const grad = ctx.createLinearGradient(0, 0, 512, 160);
  grad.addColorStop(0, '#071426');
  grad.addColorStop(1, '#0e2444');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 48px Inter, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 72);
  ctx.fillStyle = '#34d399';
  ctx.font = '600 18px Inter, Segoe UI, sans-serif';
  ctx.fillText('MULTI-AGENT AI COMMAND CAMPUS', 256, 122);

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX: 1, repeatY: 1, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function chartTexture(cache, accent = '#a78bfa') {
  const key = `tex:chart:${accent}`;
  if (cache.textures.has(key)) return cache.textures.get(key);

  const { c, ctx } = makeCanvas(256, 160);
  ctx.fillStyle = '#091224';
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 24; y < 140; y += 24) ctx.fillRect(16, y, 224, 1);

  const bars = [48, 82, 65, 108, 92, 118];
  bars.forEach((h, i) => {
    ctx.fillStyle = i % 2 === 0 ? accent : '#38bdf8';
    ctx.fillRect(24 + i * 35, 136 - h, 22, h);
  });

  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3;
  ctx.beginPath();
  bars.forEach((h, i) => {
    const px = 35 + i * 35;
    const py = 132 - h * 0.92;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  const tex = configureTexture(new THREE.CanvasTexture(c), { repeatX: 1, repeatY: 1, srgb: true });
  cache.textures.set(key, tex);
  return tex;
}

export function makeScreen(accent = '#38bdf8') {
  const { c, ctx } = makeCanvas(256, 160);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const screen = { canvas: c, ctx, texture, accent, lastDraw: -1 };
  drawScreen(screen, 0, false);
  return screen;
}

export function drawScreen(screen, t, working, feed = null) {
  const { ctx, texture, accent } = screen;
  const level = feed?.level ?? 0;
  const panic = Boolean(feed?.panic);

  if (feed?.lines?.length) {
    // Real terminal feed: agent's latest log lines, coloured by severity
    const blink = panic && Math.floor(t * 2) % 2 === 0;
    ctx.fillStyle = panic ? (blink ? '#3b0a0a' : '#1f0606') : '#05090f';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = panic ? '#dc2626' : level >= 1 ? SEVERITY_SCREEN_COLORS[level] : '#0f1b33';
    ctx.fillRect(0, 0, 256, 18);
    ctx.fillStyle = panic || level >= 1 ? '#0b0b0b' : accent;
    ctx.font = '700 11px Consolas, "Cascadia Code", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(feed.title || 'terminal').slice(0, 26), 7, 9.5);
    ctx.fillStyle = working ? '#34d399' : panic ? '#fecaca' : '#64748b';
    ctx.fillText(panic ? 'ALERT' : working ? 'RUNNING' : 'IDLE', 196, 9.5);

    ctx.font = '500 10px Consolas, "Cascadia Code", monospace';
    const lines = feed.lines.slice(-10);
    lines.forEach((line, i) => {
      const lv = line.level || 0;
      ctx.fillStyle = lv >= 1 ? SEVERITY_SCREEN_COLORS[lv] : i === lines.length - 1 ? '#e2e8f0' : '#9fb3c8';
      ctx.fillText(String(line.text || '').slice(0, 41), 6, 28 + i * 13);
    });
    if (working && Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(6, 28 + Math.min(lines.length, 9) * 13 + 2, 6, 9);
    }
    if (panic) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 252, 156);
    }
    texture.needsUpdate = true;
    return;
  }

  ctx.fillStyle = '#070e1c';
  ctx.fillRect(0, 0, 256, 160);

  // Top IDE header bar
  ctx.fillStyle = '#0f1b33';
  ctx.fillRect(0, 0, 256, 20);
  ctx.fillStyle = '#f87171';
  ctx.fillRect(8, 7, 6, 6);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(18, 7, 6, 6);
  ctx.fillStyle = '#34d399';
  ctx.fillRect(28, 7, 6, 6);
  ctx.fillStyle = working ? '#34d399' : accent;
  ctx.fillRect(188, 6, 56, 8);

  // Sidebar
  ctx.fillStyle = '#0b1529';
  ctx.fillRect(0, 20, 44, 140);
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = i === 1 ? accent : 'rgba(148,163,184,0.3)';
    ctx.fillRect(8, 28 + i * 16, 26, 6);
  }

  // Scrolling code lines
  const scrollOffset = working ? Math.floor(t * 4) % 8 : 0;
  const widths = [110, 82, 134, 68, 120, 96, 142, 74];
  for (let i = 0; i < 8; i += 1) {
    const idx = (i + scrollOffset) % widths.length;
    const indent = (idx % 3) * 10;
    const y = 30 + i * 15;
    ctx.fillStyle = idx % 3 === 0 ? accent : idx % 3 === 1 ? '#38bdf8' : '#34d399';
    ctx.fillRect(54 + indent, y, Math.min(118 - indent, widths[idx] * 0.72), 6);
  }

  // Mini telemetry graph on right
  ctx.fillStyle = '#0c1830';
  ctx.fillRect(178, 28, 70, 120);
  for (let b = 0; b < 4; b += 1) {
    const bh = 22 + ((Math.sin(t * (working ? 5 : 1.2) + b * 1.4) + 1) * 0.5) * 58;
    ctx.fillStyle = b % 2 === 0 ? accent : '#38bdf8';
    ctx.fillRect(186 + b * 15, 138 - bh, 9, bh);
  }

  texture.needsUpdate = true;
}

// --- Material Presets ---

export function woodMat(cache, base = '#7c4f2b') {
  return getMat(cache, `mat:wood:${base}`, () =>
    new THREE.MeshStandardMaterial({
      map: woodTexture(cache, base),
      roughness: 0.55,
      metalness: 0.05
    })
  );
}

export function chromeMetal(cache) {
  return getMat(cache, 'mat:chrome', () =>
    new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 1.0,
      roughness: 0.25
    })
  );
}

export function blackMetal(cache) {
  return getMat(cache, 'mat:blackMetal', () =>
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.6,
      roughness: 0.45
    })
  );
}

export function plasticDark(cache) {
  return getMat(cache, 'mat:plasticDark', () =>
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.1,
      roughness: 0.52
    })
  );
}

export function leatherMat(cache, color = '#1e293b') {
  return getMat(cache, `mat:leather:${color}`, () =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.08
    })
  );
}

export function fabricMat(cache, color = '#334155') {
  return getMat(cache, `mat:fabric:${color}`, () =>
    new THREE.MeshStandardMaterial({
      map: fabricTexture(cache, color),
      roughness: 0.85,
      metalness: 0.02
    })
  );
}

export function glassMat(cache, opacity = 0.18, color = '#bfe3ff') {
  return getMat(cache, `mat:glass:${opacity}:${color}`, () =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.05,
      metalness: 0.0,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
}

export function emissiveMat(cache, color = '#38bdf8', intensity = 1.6, uniqueKey = null) {
  const key = uniqueKey ? `mat:emissive:${uniqueKey}` : `mat:emissive:${color}:${intensity}`;
  return getMat(cache, key, () =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.3,
      metalness: 0.1
    })
  );
}

export function skinMat(cache, hex) {
  return getMat(cache, `mat:skin:${hex}`, () =>
    new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.6,
      metalness: 0.02
    })
  );
}

export function hairMat(cache, hex) {
  return getMat(cache, `mat:hair:${hex}`, () =>
    new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.45,
      metalness: 0.08
    })
  );
}

export function screenMat(screen) {
  return new THREE.MeshStandardMaterial({
    map: screen.texture,
    emissive: '#ffffff',
    emissiveMap: screen.texture,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.1
  });
}

export function matteMat(cache, color, roughness = 0.72, metalness = 0.05) {
  return getMat(cache, `mat:matte:${color}:${roughness}:${metalness}`, () =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    })
  );
}

