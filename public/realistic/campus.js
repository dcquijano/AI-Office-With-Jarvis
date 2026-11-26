/**
 * Procedural 3D campus builder: architecture, department zones, workstations,
 * J.A.R.V.I.S. AI Core, server vault, boardroom, lobby, and wellness sports wing.
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { DEPARTMENT_ZONES, INFRA_ROOMS, STATIONS } from '../officeLayout.js';
import {
  V,
  addBox,
  addCyl,
  blackMetal,
  carpetTexture,
  chartTexture,
  chromeMetal,
  courtWoodTexture,
  drawScreen,
  emissiveMat,
  floorTileTexture,
  getMat,
  glassMat,
  grassTexture,
  leatherMat,
  logoTexture,
  makeScreen,
  matteMat,
  mixHex,
  noiseNormalMap,
  oakMat,
  concreteTileTexture,
  plasticDark,
  rackGrilleTexture,
  screenMat,
  woodMat
} from './materials.js';

function createLabel(text, accent, isDept = false) {
  const el = document.createElement('div');
  el.className = `scene-label ${isDept ? 'dept-label' : 'room-label'}`;
  el.style.setProperty('--accent', accent);
  el.textContent = text;
  const obj = new CSS2DObject(el);
  return { obj, el };
}

function addPlaneFloor(parent, cache, x1, y1, x2, y2, z, mat, receiveShadow = true) {
  const w = Math.abs(x2 - x1);
  const d = Math.abs(y2 - y1);
  const cx = (x1 + x2) * 0.5;
  const cy = (y1 + y2) * 0.5;
  const geo = new THREE.PlaneGeometry(w, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(cx, z, cy);
  mesh.receiveShadow = receiveShadow;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  parent.add(mesh);
  return mesh;
}

function addFloorOutline(parent, x1, y1, x2, y2, z, mat, thickness = 0.045) {
  const w = x2 - x1;
  const d = y2 - y1;
  const cx = (x1 + x2) * 0.5;
  const cy = (y1 + y2) * 0.5;
  const group = new THREE.Group();
  const h = 0.02;

  const mk = (bw, bd, px, py) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), mat);
    m.position.set(px, z + h * 0.5, py);
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    group.add(m);
  };

  mk(w, thickness, cx, y1);
  mk(w, thickness, cx, y2);
  mk(thickness, d, x1, cy);
  mk(thickness, d, x2, cy);
  parent.add(group);
  return group;
}

function addBlueprintPlot(parent, pickables, cache, x1, y1, x2, y2, label, roomId) {
  const w = x2 - x1;
  const d = y2 - y1;
  const cx = (x1 + x2) * 0.5;
  const cy = (y1 + y2) * 0.5;

  const plotMat = getMat(cache, 'mat:blueprintPlane', () =>
    new THREE.MeshStandardMaterial({
      color: '#0b2545',
      emissive: '#0284c7',
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.42,
      roughness: 0.7
    })
  );
  addPlaneFloor(parent, cache, x1, y1, x2, y2, 0.015, plotMat, true);

  // Blueprint wireframe box
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 0.94, 0.9, d * 0.94));
  const lineMat = getMat(cache, 'mat:blueprintLine', () =>
    new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65 })
  );
  const wire = new THREE.LineSegments(edges, lineMat);
  wire.position.set(cx, 0.46, cy);
  wire.matrixAutoUpdate = false;
  wire.updateMatrix();
  parent.add(wire);

  // Pick proxy
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.6, d),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  proxy.position.set(cx, 0.3, cy);
  proxy.userData.pickId = `room:${roomId}`;
  parent.add(proxy);
  pickables.push(proxy);

  const { obj } = createLabel(label, '#7dd3fc', false);
  obj.position.copy(V(cx, cy, 0.45));
  parent.add(obj);
}

function addGlassPartition(parent, cache, x1, y1, x2, y2, h = 1.45) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return;
  const cx = (x1 + x2) * 0.5;
  const cy = (y1 + y2) * 0.5;
  const angle = -Math.atan2(dy, dx);

  const group = new THREE.Group();
  group.position.set(cx, 0, cy);
  group.rotation.y = angle;

  const mGlass = glassMat(cache, 0.14, '#dbeafe');
  const mFrame = matteMat(cache, '#111827', 0.4, 0.6);

  const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, h - 0.08), mGlass);
  pane.position.y = h * 0.5;
  group.add(pane);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.045), mFrame);
  topRail.position.y = h;
  group.add(topRail);

  const botRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.045), mFrame);
  botRail.position.y = 0.02;
  group.add(botRail);

  for (const px of [-len * 0.5, len * 0.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05), mFrame);
    post.position.set(px, h * 0.5, 0);
    post.castShadow = true;
    group.add(post);
  }

  parent.add(group);
}

function addPottedPlant(parent, cache, x, y, scale = 1.0) {
  const mPot = matteMat(cache, '#9a3412', 0.72, 0.05);
  const mSoil = matteMat(cache, '#291a10', 0.95, 0);
  const mLeaf = matteMat(cache, '#16a34a', 0.62, 0.04);
  const mLeafHi = matteMat(cache, '#22c55e', 0.6, 0.04);

  addCyl(parent, cache, 0.18 * scale, 0.13 * scale, 0.28 * scale, mPot, x, y, 0, 12);
  addCyl(parent, cache, 0.16 * scale, 0.16 * scale, 0.03 * scale, mSoil, x, y, 0.26 * scale, 12, { cast: false });

  const b1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 * scale, 1), mLeaf);
  b1.position.copy(V(x, y, 0.48 * scale));
  b1.castShadow = true;
  b1.matrixAutoUpdate = false;
  b1.updateMatrix();
  parent.add(b1);

  const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 * scale, 1), mLeafHi);
  b2.position.copy(V(x + 0.08 * scale, y - 0.05 * scale, 0.68 * scale));
  b2.castShadow = true;
  b2.matrixAutoUpdate = false;
  b2.updateMatrix();
  parent.add(b2);
}

function addOutdoorTree(parent, cache, x, y, scale = 1.0) {
  const mTrunk = matteMat(cache, '#5c3a21', 0.88, 0);
  const mLeaf1 = matteMat(cache, '#14532d', 0.75, 0);
  const mLeaf2 = matteMat(cache, '#15803d', 0.72, 0);
  addCyl(parent, cache, 0.14 * scale, 0.2 * scale, 1.3 * scale, mTrunk, x, y, -0.56, 8);

  const f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85 * scale, 1), mLeaf1);
  f1.position.copy(V(x, y, 0.95 * scale));
  f1.castShadow = true;
  f1.matrixAutoUpdate = false;
  f1.updateMatrix();
  parent.add(f1);

  const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 * scale, 1), mLeaf2);
  f2.position.copy(V(x + 0.2 * scale, y - 0.12 * scale, 1.45 * scale));
  f2.castShadow = true;
  f2.matrixAutoUpdate = false;
  f2.updateMatrix();
  parent.add(f2);
}

function addErgonomicChair(parent, cache, cx, cy, accent) {
  const mDark = blackMetal(cache);
  const mChrome = chromeMetal(cache);
  const mLeather = leatherMat(cache, '#141414');
  const mAccent = matteMat(cache, accent, 0.55, 0.1);

  // 5-star caster base
  for (let i = 0; i < 5; i += 1) {
    const a = (i * Math.PI * 2) / 5;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.28), mChrome);
    arm.position.set(cx + Math.sin(a) * 0.14, 0.055, cy + Math.cos(a) * 0.14);
    arm.rotation.y = a;
    arm.matrixAutoUpdate = false;
    arm.updateMatrix();
    parent.add(arm);

    addCyl(parent, cache, 0.03, 0.03, 0.04, mDark, cx + Math.sin(a) * 0.26, cy + Math.cos(a) * 0.26, 0, 8, { cast: false });
  }

  // Gas cylinder & seat
  addCyl(parent, cache, 0.035, 0.04, 0.34, mChrome, cx, cy, 0.06, 10);
  addBox(parent, cache, 0.52, 0.48, 0.09, mLeather, cx, cy, 0.38, { rounded: 0.03 });
  // Armrests
  addBox(parent, cache, 0.055, 0.34, 0.22, mDark, cx - 0.28, cy, 0.42, { rounded: 0.015 });
  addBox(parent, cache, 0.055, 0.34, 0.22, mDark, cx + 0.28, cy, 0.42, { rounded: 0.015 });
  // Backrest (toward +y so occupant faces -y desk)
  addBox(parent, cache, 0.46, 0.08, 0.54, mLeather, cx, cy + 0.24, 0.45, { rounded: 0.03 });
  // Accent headrest
  addBox(parent, cache, 0.34, 0.09, 0.14, mAccent, cx, cy + 0.24, 0.99, { rounded: 0.03 });
}

function addMonitor(parent, cache, cx, cy, z0, w, h, screen, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(cx, z0, cy);
  g.rotation.y = rotY;

  const mBezel = plasticDark(cache);
  const mMetal = blackMetal(cache);
  const mScr = screenMat(screen);

  // Base + neck
  const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.025, 0.18), mMetal);
  base.position.set(0, 0.012, -0.02);
  g.add(base);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), mMetal);
  neck.position.set(0, 0.08, -0.04);
  neck.castShadow = true;
  g.add(neck);

  // Casing + screen panel facing +y (toward chair)
  const casing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.04), mBezel);
  casing.position.set(0, 0.13 + h * 0.5, 0);
  casing.castShadow = true;
  g.add(casing);

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mScr);
  panel.position.set(0, 0.13 + h * 0.5, 0.023);
  g.add(panel);

  parent.add(g);
}

function buildWorkstation(parent, pickables, cache, agent, st, upgrades, getRoomTier, dyn) {
  const isCeo = agent.id === 'ceo';
  const deskTier = isCeo ? upgrades.deskTier || 1 : 1;
  const roomTier = getRoomTier(agent.id);
  const deskW = isCeo ? (deskTier >= 2 ? 2.65 : 2.25) : roomTier >= 2 ? 2.2 : 1.98;
  const deskD = isCeo ? (deskTier >= 2 ? 1.2 : 1.08) : 1.02;

  addErgonomicChair(parent, cache, st.chairX, st.chairY, agent.accent);

  const mMetal = blackMetal(cache);
  const mDeskTop =
    isCeo && deskTier === 3
      ? glassMat(cache, 0.42, '#1e3a5f')
      : isCeo
        ? woodMat(cache, '#5b3a24')
        : matteMat(cache, '#f2f1ed', 0.38, 0.02);

  // Severity alarm beacon on the desk corner (hidden until the agent panics)
  const alarmMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 2.6,
    roughness: 0.3
  });
  const alarm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.16, 14), alarmMat);
  alarm.position.copy(V(st.deskX - deskW * 0.42, st.deskY - deskD * 0.3, 0.82));
  alarm.visible = false;
  parent.add(alarm);
  dyn.alarms.set(agent.id, { mesh: alarm, mat: alarmMat, x: st.deskX, y: st.deskY });

  // Desk legs + modesty panel
  addBox(parent, cache, 0.09, deskD * 0.84, 0.68, mMetal, st.deskX - deskW * 0.44, st.deskY, 0);
  addBox(parent, cache, 0.09, deskD * 0.84, 0.68, mMetal, st.deskX + deskW * 0.44, st.deskY, 0);
  addBox(parent, cache, deskW * 0.85, 0.04, 0.36, mMetal, st.deskX, st.deskY - deskD * 0.38, 0.28);

  // Main tabletop
  addBox(parent, cache, deskW, deskD, 0.07, mDeskTop, st.deskX, st.deskY, 0.67, { rounded: 0.025 });

  // Accent LED front/underglow trim
  const trimMat = emissiveMat(cache, isCeo && deskTier === 3 ? '#fbbf24' : agent.accent, 0.9);
  addBox(
    parent,
    cache,
    deskW + 0.02,
    0.03,
    0.04,
    trimMat,
    st.deskX,
    st.deskY + deskD * 0.5,
    deskTier === 3 ? 0.05 : 0.66,
    { cast: false }
  );

  // CEO return wing for tier >= 2
  if (isCeo && deskTier >= 2) {
    addBox(parent, cache, 0.48, 0.95, 0.07, mDeskTop, st.deskX - 1.12, st.deskY + 0.45, 0.67, { rounded: 0.02 });
    addBox(parent, cache, 0.1, 0.1, 0.67, mMetal, st.deskX - 1.28, st.deskY + 0.78, 0);
  }

  // ATX PC Tower
  const pcX = st.deskX + deskW * 0.45 + 0.24;
  addBox(parent, cache, 0.32, 0.64, 0.6, plasticDark(cache), pcX, st.deskY - 0.15, 0, { rounded: 0.02 });
  addBox(parent, cache, 0.2, 0.02, 0.36, emissiveMat(cache, agent.accent, 1.3), pcX, st.deskY + 0.175, 0.14, {
    cast: false
  });

  // Monitors using persistent screen texture per agent
  if (!cache.screens[agent.id]) {
    cache.screens[agent.id] = makeScreen(agent.accent);
  }
  const scr = cache.screens[agent.id];
  addMonitor(parent, cache, st.deskX - 0.46, st.deskY - 0.18, 0.74, 0.64, 0.4, scr, 0.15);
  addMonitor(parent, cache, st.deskX + 0.46, st.deskY - 0.18, 0.74, 0.64, 0.4, scr, -0.15);
  if (isCeo || roomTier >= 2) {
    addMonitor(parent, cache, st.deskX, st.deskY - 0.24, 0.74, 0.56, 0.42, scr, 0);
  }
  if (isCeo && deskTier >= 2) {
    addMonitor(parent, cache, st.deskX - 0.98, st.deskY - 0.04, 0.74, 0.44, 0.34, scr, 0.42);
  }
  if (isCeo && deskTier >= 3) {
    addMonitor(parent, cache, st.deskX + 0.98, st.deskY - 0.04, 0.74, 0.44, 0.34, scr, -0.42);
  }

  // Keyboard + backlight, mouse, mug with torus handle, desk lamp
  addBox(parent, cache, 0.62, 0.2, 0.025, plasticDark(cache), st.deskX - 0.1, st.deskY + 0.22, 0.74, {
    cast: false
  });
  addBox(parent, cache, 0.56, 0.14, 0.01, emissiveMat(cache, '#38bdf8', 0.8), st.deskX - 0.1, st.deskY + 0.22, 0.765, {
    cast: false
  });
  addBox(parent, cache, 0.22, 0.24, 0.01, plasticDark(cache), st.deskX + 0.38, st.deskY + 0.22, 0.74, {
    cast: false
  });
  addBox(parent, cache, 0.09, 0.14, 0.03, matteMat(cache, '#cbd5e1', 0.35), st.deskX + 0.38, st.deskY + 0.22, 0.75, {
    rounded: 0.01,
    cast: false
  });

  // Coffee mug + torus handle
  const mMug = matteMat(cache, '#f8fafc', 0.25);
  addCyl(parent, cache, 0.055, 0.05, 0.12, mMug, st.deskX - 0.68, st.deskY + 0.26, 0.74, 12, { cast: false });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12), mMug);
  handle.position.copy(V(st.deskX - 0.735, st.deskY + 0.26, 0.8));
  handle.matrixAutoUpdate = false;
  handle.updateMatrix();
  parent.add(handle);

  // Desk lamp
  addCyl(parent, cache, 0.07, 0.08, 0.03, mMetal, st.deskX + 0.78, st.deskY + 0.16, 0.74, 12, { cast: false });
  addCyl(parent, cache, 0.015, 0.015, 0.32, mMetal, st.deskX + 0.78, st.deskY + 0.16, 0.77, 8, { cast: false });
  addBox(parent, cache, 0.14, 0.08, 0.05, emissiveMat(cache, '#fde68a', 0.6, 'deskLampBulb'), st.deskX + 0.75, st.deskY + 0.2, 1.07, {
    cast: false
  });

  // Raycast pick proxy over desk
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(deskW + 0.4, 1.5, deskD + 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  proxy.position.copy(V(st.deskX, st.deskY + 0.2, 0.75));
  proxy.userData.pickId = agent.id;
  parent.add(proxy);
  pickables.push(proxy);
}

function buildRoomProps(parent, cache, agentId, st, upgrades, getRoomTier, dyn) {
  const { box } = st;
  const roomTier = getRoomTier(agentId);
  const leftX = box.x1 + 0.55;
  const rightX = box.x2 - 0.55;
  const backY = box.y1 + 0.65;
  const frontY = box.y2 - 0.65;

  addPottedPlant(parent, cache, leftX, backY, 0.95);

  if (agentId === 'ceo') {
    const decorTier = upgrades.decorTier || 1;
    const brainTier = upgrades.brainLinkTier || 1;

    // Trophy pedestal + visitor seat
    addBox(parent, cache, 0.44, 0.44, 0.88, woodMat(cache, '#5c2a0e'), rightX - 0.1, frontY - 0.1, 0, { rounded: 0.02 });
    addCyl(parent, cache, 0.12, 0.08, 0.34, emissiveMat(cache, '#fbbf24', 0.75), rightX - 0.1, frontY - 0.1, 0.88, 12);
    addBox(parent, cache, 0.5, 0.5, 0.4, leatherMat(cache, '#92400e'), leftX + 0.1, frontY - 0.1, 0, { rounded: 0.04 });

    if (decorTier >= 2) {
      addBox(parent, cache, 1.5, 0.58, 0.36, matteMat(cache, '#6d28d9', 0.8), st.x, frontY - 0.05, 0, { rounded: 0.05 });
      addBox(parent, cache, 1.5, 0.16, 0.36, matteMat(cache, '#5b21b6', 0.8), st.x, frontY + 0.16, 0.36, { rounded: 0.04 });
      addBox(parent, cache, 0.8, 0.36, 0.24, glassMat(cache, 0.45, '#7dd3fc'), st.x, frontY - 0.6, 0, { rounded: 0.02 });
    }

    if (decorTier >= 3) {
      addBox(parent, cache, 0.52, 0.95, 0.78, woodMat(cache, '#451a03'), rightX - 0.05, st.y - 0.4, 0, { rounded: 0.02 });
      addBox(parent, cache, 0.34, 0.34, 0.34, chromeMetal(cache), rightX - 0.05, st.y - 0.4, 0.78, { rounded: 0.02 });
      addBox(parent, cache, 0.06, 1.25, 0.82, emissiveMat(cache, '#fbbf24', 1.1), box.x1 + 0.18, st.y, 0.55);
      addPottedPlant(parent, cache, rightX, backY, 1.05);
    }

    if (brainTier >= 3) {
      addCyl(parent, cache, 0.36, 0.4, 0.48, matteMat(cache, '#1e3a8a', 0.35, 0.5), leftX + 0.15, st.y + 0.25, 0, 18);
      const holo = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.24, 0),
        emissiveMat(cache, '#38bdf8', 2.0)
      );
      holo.position.copy(V(leftX + 0.15, st.y + 0.25, 0.88));
      parent.add(holo);
      dyn.holo = { mesh: holo, baseZ: 0.88 };
    }
    return;
  }

  if (roomTier >= 2) {
    addBox(parent, cache, 1.25, 0.52, 0.36, leatherMat(cache, '#334155'), rightX - 0.4, frontY - 0.15, 0, { rounded: 0.05 });
  }

  if (agentId === 'sage') {
    addBox(parent, cache, 0.46, 1.6, 1.5, woodMat(cache, '#6b3412'), rightX - 0.1, st.y, 0, { rounded: 0.02 });
    // Instanced books on shelf
    const colors = ['#34d399', '#38bdf8', '#fbbf24', '#f472b6', '#a78bfa'];
    const bookGeo = new THREE.BoxGeometry(0.26, 0.2, 0.08);
    const bookMat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
    const inst = new THREE.InstancedMesh(bookGeo, bookMat, 12);
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < 12; i += 1) {
      const shelfZ = i < 6 ? 0.58 : 1.05;
      const offsetY = ((i % 6) - 2.5) * 0.21;
      dummy.position.set(rightX - 0.1, shelfZ, st.y + offsetY);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      c.set(colors[i % colors.length]);
      inst.setColorAt(i, c);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    parent.add(inst);
  } else if (agentId === 'vulcan' || agentId === 'aegis' || agentId === 'orion') {
    const mGrille = getMat(cache, 'mat:rackGrille', () =>
      new THREE.MeshStandardMaterial({
        map: rackGrilleTexture(cache),
        roughness: 0.42,
        metalness: 0.55
      })
    );
    addBox(parent, cache, 0.64, 0.64, 1.55, mGrille, rightX - 0.1, backY + 0.2, 0, { rounded: 0.02 });
    addBox(parent, cache, 0.54, 0.03, 0.08, emissiveMat(cache, '#38bdf8', 1.6), rightX - 0.1, backY + 0.53, 1.15, { cast: false });
    addBox(parent, cache, 0.54, 0.03, 0.06, emissiveMat(cache, '#34d399', 1.5), rightX - 0.1, backY + 0.53, 0.78, { cast: false });
  } else if (agentId === 'athena' || agentId === 'vera') {
    addBox(parent, cache, 0.1, 1.5, 1.0, matteMat(cache, '#f8fafc', 0.25), leftX - 0.15, st.y + 0.2, 0.38, { rounded: 0.015 });
    addBox(parent, cache, 0.03, 0.24, 0.22, emissiveMat(cache, '#facc15', 0.7), leftX - 0.08, st.y - 0.08, 0.92, { cast: false });
    addBox(parent, cache, 0.03, 0.24, 0.22, emissiveMat(cache, '#34d399', 0.7), leftX - 0.08, st.y + 0.35, 0.82, { cast: false });
  } else if (agentId === 'iris') {
    addBox(parent, cache, 0.1, 1.4, 1.0, plasticDark(cache), rightX + 0.05, st.y, 0.38, { rounded: 0.02 });
    addBox(parent, cache, 0.03, 0.3, 0.28, emissiveMat(cache, '#f472b6', 1.1), rightX - 0.02, st.y - 0.25, 0.9, { cast: false });
    addBox(parent, cache, 0.03, 0.3, 0.28, emissiveMat(cache, '#38bdf8', 1.1), rightX - 0.02, st.y + 0.22, 0.9, { cast: false });
  } else {
    addCyl(parent, cache, 0.26, 0.28, 0.92, matteMat(cache, '#0891b2', 0.4, 0.3), rightX - 0.15, backY + 0.25, 0, 14);
    addCyl(parent, cache, 0.2, 0.2, 0.14, emissiveMat(cache, '#22d3ee', 1.4), rightX - 0.15, backY + 0.25, 0.92, 14, { cast: false });
  }
}

export function buildCampus({ team, upgrades, getRoomTier, cache }) {
  const group = new THREE.Group();
  const pickables = [];
  const dyn = {
    deptStrips: new Map(),
    officeOutlines: new Map(),
    conduits: new Map(),
    alarms: new Map(),
    lampMat: emissiveMat(cache, '#fde68a', 0.6, 'deskLampBulb'),
    serverLeds: [],
    danceTiles: [],
    balls: {},
    core: null,
    holo: null,
    water: null,
    disco: null,
    labels: []
  };

  const trackLabel = (obj) => {
    dyn.labels.push(obj);
    return obj;
  };

  // 1. Surroundings & Campus Base (daylight landscaping, polished concrete)
  const mGround = matteMat(cache, '#56803a', 0.96, 0.0);
  addPlaneFloor(group, cache, -130, -130, 130, 130, -0.56, mGround, true);
  const mPaving = matteMat(cache, '#a8a39a', 0.85, 0.02);
  addPlaneFloor(group, cache, -25.5, -17.0, 25.5, 17.0, -0.55, mPaving, true);

  const mSlab = matteMat(cache, '#bdb7ad', 0.8, 0.05);
  addBox(group, cache, 44.6, 28.4, 0.55, mSlab, 0, 0, -0.55, { cast: false, receive: true });

  const mFloor = getMat(cache, 'mat:campusFloor', () =>
    new THREE.MeshStandardMaterial({
      map: concreteTileTexture(cache),
      roughness: 0.5,
      metalness: 0.04
    })
  );
  addPlaneFloor(group, cache, -22.3, -14.2, 22.3, 14.2, 0.002, mFloor, true);

  // Deterministic perimeter trees (30)
  for (let i = 0; i < 30; i += 1) {
    const angle = (i / 30) * Math.PI * 2 + 0.17;
    const rx = 25.5 + ((i * 37) % 10);
    const ry = 17.0 + ((i * 53) % 8);
    const tx = Math.cos(angle) * rx;
    const ty = Math.sin(angle) * ry;
    const scale = 0.85 + ((i * 19) % 5) * 0.1;
    addOutdoorTree(group, cache, tx, ty, scale);
  }

  // 2. Exterior Dollhouse Walls (back y = -14.2, left x = -22.3)
  const mWall = matteMat(cache, '#eeebe5', 0.88, 0.02);
  const mMullion = matteMat(cache, '#1f2937', 0.45, 0.6);
  const mWinGlass = glassMat(cache, 0.24, '#a5d8ff');
  // Back wall lower sill + top beam + window bays
  addBox(group, cache, 44.6, 0.25, 0.9, mWall, 0, -14.2, 0);
  addBox(group, cache, 44.6, 0.25, 0.45, mWall, 0, -14.2, 2.75);
  for (let wx = -20; wx <= 20; wx += 4) {
    addBox(group, cache, 0.14, 0.28, 3.2, mMullion, wx, -14.2, 0);
  }
  const backWin = new THREE.Mesh(new THREE.PlaneGeometry(44.2, 1.85), mWinGlass);
  backWin.position.set(0, 1.82, -14.2);
  group.add(backWin);

  // Left wall
  addBox(group, cache, 0.25, 28.4, 0.9, mWall, -22.3, 0, 0);
  addBox(group, cache, 0.25, 28.4, 0.45, mWall, -22.3, 0, 2.75);
  for (let wy = -12; wy <= 12; wy += 4) {
    addBox(group, cache, 0.28, 0.14, 3.2, mMullion, -22.3, wy, 0);
  }
  const leftWin = new THREE.Mesh(new THREE.PlaneGeometry(28.0, 1.85), mWinGlass);
  leftWin.rotation.y = Math.PI / 2;
  leftWin.position.set(-22.3, 1.82, 0);
  group.add(leftWin);

  // 3. Walkways + LED strips
  const mWalk = matteMat(cache, '#c4bfb6', 0.6, 0.03);
  addPlaneFloor(group, cache, -7.8, -14.0, -6.7, 14.0, 0.005, mWalk, true);
  addPlaneFloor(group, cache, 9.2, -14.0, 10.2, 14.0, 0.005, mWalk, true);
  addPlaneFloor(group, cache, -21.8, -1.0, -7.8, 1.0, 0.005, mWalk, true);
  addBox(group, cache, 0.06, 28.0, 0.02, emissiveMat(cache, '#38bdf8', 0.5), 9.25, 0, 0.006, { cast: false });
  addBox(group, cache, 0.06, 28.0, 0.02, emissiveMat(cache, '#34d399', 0.5), 10.15, 0, 0.006, { cast: false });

  // 4. Department Zones (light carpet subtly tinted by department colour)
  for (const dept of DEPARTMENT_ZONES) {
    const mDept = getMat(cache, `mat:dept:${dept.id}`, () =>
      new THREE.MeshStandardMaterial({
        map: carpetTexture(cache, mixHex('#c9c4ba', dept.accent, 0.1), 4, 4),
        roughness: 0.9,
        metalness: 0.0
      })
    );
    addPlaneFloor(group, cache, dept.x1, dept.y1, dept.x2, dept.y2, 0.008, mDept, true);

    const stripMat = new THREE.MeshStandardMaterial({
      color: dept.accent,
      emissive: dept.accent,
      emissiveIntensity: 0.35,
      roughness: 0.3
    });
    dyn.deptStrips.set(dept.id, stripMat);
    addFloorOutline(group, dept.x1, dept.y1, dept.x2, dept.y2, 0.01, stripMat, 0.055);

    const cx = (dept.x1 + dept.x2) * 0.5;
    const { obj } = createLabel(dept.label, dept.accent, true);
    obj.position.copy(V(cx, dept.y1 - 0.35, 0.35));
    group.add(trackLabel(obj));
  }

  // 5. Specialist & CEO Office Suites
  for (const agent of team) {
    const st = STATIONS[agent.id];
    if (!st?.box) continue;
    const tier = getRoomTier(agent.id);
    if (tier === 0) {
      addBlueprintPlot(
        group,
        pickables,
        cache,
        st.box.x1,
        st.box.y1,
        st.box.x2,
        st.box.y2,
        `BUILD: ${agent.name.toUpperCase()}`,
        agent.id
      );
      continue;
    }

    const useWood = agent.id === 'ceo' || tier >= 2;
    const suiteFloorMat = useWood
      ? oakMat(cache, tier >= 3 ? '#9a6a42' : '#b98a5e')
      : oakMat(cache, '#c49a6c');
    addPlaneFloor(group, cache, st.box.x1, st.box.y1, st.box.x2, st.box.y2, 0.012, suiteFloorMat, true);

    const rugTone = mixHex(agent.accent, '#64748b', 0.62);
    const rugMat = getMat(cache, `mat:rug:${rugTone}`, () =>
      new THREE.MeshStandardMaterial({
        map: carpetTexture(cache, rugTone, 2, 2),
        roughness: 0.94
      })
    );
    addPlaneFloor(
      group,
      cache,
      st.box.x1 + 0.55,
      st.box.y1 + 0.65,
      st.box.x2 - 0.55,
      st.box.y2 - 0.65,
      0.016,
      rugMat,
      true
    );

    const outlineMat = new THREE.MeshStandardMaterial({
      color: agent.accent,
      emissive: agent.accent,
      emissiveIntensity: 0.35,
      roughness: 0.3
    });
    dyn.officeOutlines.set(agent.id, outlineMat);
    addFloorOutline(group, st.box.x1, st.box.y1, st.box.x2, st.box.y2, 0.014, outlineMat, 0.045);

    // Glass back + side partitions (front open)
    addGlassPartition(group, cache, st.box.x1 + 0.1, st.box.y1 + 0.06, st.box.x2 - 0.1, st.box.y1 + 0.06, 1.45);
    addGlassPartition(group, cache, st.box.x1 + 0.06, st.box.y1 + 0.1, st.box.x1 + 0.06, st.box.y2 - 0.4, 1.45);
    addGlassPartition(group, cache, st.box.x2 - 0.06, st.box.y1 + 0.1, st.box.x2 - 0.06, st.box.y2 - 0.4, 1.45);

    buildWorkstation(group, pickables, cache, agent, st, upgrades, getRoomTier, dyn);
    buildRoomProps(group, cache, agent.id, st, upgrades, getRoomTier, dyn);

    const { obj } = createLabel(st.label.toUpperCase(), agent.accent, false);
    obj.position.copy(V(st.x, st.box.y2 + 0.18, 0.25));
    group.add(trackLabel(obj));
  }

  // 6. J.A.R.V.I.S. AI Brain Core
  {
    const cx = STATIONS.jarvis.x;
    const cy = STATIONS.jarvis.y;
    const mDarkMetal = blackMetal(cache);
    const mCoreBlue = matteMat(cache, '#1d4ed8', 0.25, 0.6);
    const mCyan = emissiveMat(cache, '#38bdf8', 1.8);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.65, 48),
      emissiveMat(cache, '#38bdf8', 1.2)
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(V(cx, cy, 0.025));
    group.add(ring);

    addCyl(group, cache, 1.18, 1.28, 0.2, mDarkMetal, cx, cy, 0, 28);
    addCyl(group, cache, 0.85, 0.92, 0.18, mCoreBlue, cx, cy, 0.2, 28);
    addCyl(group, cache, 0.56, 0.62, 0.12, mCyan, cx, cy, 0.38, 28, { cast: false });

    for (const [ox, oy] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      addBox(group, cache, 0.36, 0.36, 0.3, mDarkMetal, cx + ox, cy + oy, 0, { rounded: 0.03 });
      addBox(group, cache, 0.4, 0.4, 0.08, mCyan, cx + ox, cy + oy, 0.3, { cast: false });
    }

    const octaMat = new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      emissive: '#38bdf8',
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.25
    });
    const octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.54, 0), octaMat);
    octa.position.copy(V(cx, cy, 1.45));
    octa.castShadow = true;
    group.add(octa);

    const torusMat = emissiveMat(cache, '#a78bfa', 1.5);
    const torus1 = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.028, 10, 36), torusMat);
    torus1.position.copy(V(cx, cy, 1.45));
    group.add(torus1);

    const torus2 = new THREE.Mesh(new THREE.TorusGeometry(1.04, 0.022, 10, 36), mCyan);
    torus2.position.copy(V(cx, cy, 1.45));
    torus2.rotation.x = Math.PI / 3;
    group.add(torus2);

    const coreLight = new THREE.PointLight('#38bdf8', 22, 12, 1.5);
    coreLight.position.copy(V(cx, cy, 1.8));
    group.add(coreLight);

    const proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 2.2, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    proxy.position.copy(V(cx, cy, 1.1));
    proxy.userData.pickId = 'jarvis';
    group.add(proxy);
    pickables.push(proxy);

    const { obj } = createLabel('J.A.R.V.I.S. AI BRAIN', '#7dd3fc', false);
    obj.position.copy(V(cx, cy, 2.55));
    group.add(trackLabel(obj));

    dyn.core = { octa, octaMat, torus1, torus2, light: coreLight, baseZ: 1.45 };
  }

  // 7. Neural Bridge & Data Conduits
  {
    const linkTier = upgrades.brainLinkTier || 1;
    const jPos = V(STATIONS.jarvis.x, STATIONS.jarvis.y, 0.32);
    const cPos = V(STATIONS.ceo.x, STATIONS.ceo.y, 0.32);
    const mid = V((STATIONS.jarvis.x + STATIONS.ceo.x) * 0.5, 0, 0.95);
    const curve = new THREE.QuadraticBezierCurve3(jPos, mid, cPos);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, linkTier >= 2 ? 0.055 : 0.04, 8, false),
      emissiveMat(cache, '#fbbf24', 1.4)
    );
    group.add(tube);

    if (linkTier >= 2) {
      const curve2 = new THREE.QuadraticBezierCurve3(
        V(STATIONS.jarvis.x, STATIONS.jarvis.y - 0.35, 0.28),
        V((STATIONS.jarvis.x + STATIONS.ceo.x) * 0.5, -0.35, 1.15),
        V(STATIONS.ceo.x, STATIONS.ceo.y - 0.35, 0.28)
      );
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve2, 24, 0.032, 8, false),
          emissiveMat(cache, '#38bdf8', 1.4)
        )
      );
    }

    for (const agent of team) {
      const st = STATIONS[agent.id];
      if (!st) continue;
      const conduitMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 0.25,
        roughness: 0.35
      });
      dyn.conduits.set(agent.id, conduitMat);
      const lineCurve = new THREE.LineCurve3(
        V(STATIONS.jarvis.x, STATIONS.jarvis.y, 0.025),
        V(st.deskX, st.deskY, 0.025)
      );
      const cMesh = new THREE.Mesh(new THREE.TubeGeometry(lineCurve, 4, 0.022, 6, false), conduitMat);
      group.add(cMesh);
    }
  }

  // 8. Infrastructure Rooms
  const serverTier = getRoomTier('serverRoom');
  const lobbyTier = getRoomTier('lobbyRoom');
  const confTier = getRoomTier('conferenceRoom');

  if (serverTier === 0) {
    addBlueprintPlot(
      group,
      pickables,
      cache,
      INFRA_ROOMS.serverRoom.x1,
      INFRA_ROOMS.serverRoom.y1,
      INFRA_ROOMS.serverRoom.x2,
      INFRA_ROOMS.serverRoom.y2,
      'BUILD: SERVER VAULT',
      'serverRoom'
    );
  } else {
    const r = INFRA_ROOMS.serverRoom;
    addPlaneFloor(group, cache, r.x1, r.y1, r.x2, r.y2, 0.012, matteMat(cache, '#a7abb2', 0.5, 0.2), true);
    addFloorOutline(group, r.x1, r.y1, r.x2, r.y2, 0.014, emissiveMat(cache, '#38bdf8', serverTier >= 2 ? 1.2 : 0.6));
    addPlaneFloor(
      group,
      cache,
      r.cx - 0.7,
      r.y1 + 0.6,
      r.cx + 0.7,
      r.y2 - 0.6,
      0.015,
      emissiveMat(cache, '#0284c7', 0.25),
      false
    );

    const rackCoords = [
      [r.cx - 1.5, r.cy - 2.6],
      [r.cx + 1.5, r.cy - 2.6],
      [r.cx - 1.5, r.cy],
      [r.cx + 1.5, r.cy],
      [r.cx - 1.5, r.cy + 2.6],
      [r.cx + 1.5, r.cy + 2.6]
    ];
    if (serverTier >= 2) {
      rackCoords.push([r.cx, r.cy - 2.6], [r.cx, r.cy + 2.6]);
    }
    const mGrille = getMat(cache, 'mat:rackGrille', () =>
      new THREE.MeshStandardMaterial({ map: rackGrilleTexture(cache), roughness: 0.4, metalness: 0.6 })
    );
    rackCoords.forEach(([rx, ry], idx) => {
      addBox(group, cache, 0.78, 0.78, 1.85, mGrille, rx, ry, 0, { rounded: 0.02 });
      const ledMat = new THREE.MeshStandardMaterial({
        color: idx % 2 === 0 ? '#38bdf8' : '#34d399',
        emissive: idx % 2 === 0 ? '#38bdf8' : '#34d399',
        emissiveIntensity: 1.6
      });
      dyn.serverLeds.push(ledMat);
      addBox(group, cache, 0.56, 0.03, 0.12, ledMat, rx, ry + 0.4, 1.38, { cast: false });
      addBox(group, cache, 0.56, 0.03, 0.08, emissiveMat(cache, '#facc15', 1.1), rx, ry + 0.4, 0.9, { cast: false });
    });
    if (serverTier >= 3) {
      addBox(group, cache, 0.85, 0.85, 2.05, matteMat(cache, '#0369a1', 0.3, 0.6), r.cx, r.cy, 0, { rounded: 0.02 });
      addBox(group, cache, 0.56, 0.56, 0.34, emissiveMat(cache, '#38bdf8', 1.8), r.cx, r.cy, 2.05);
    }
    const { obj } = createLabel(r.label, r.accent, false);
    obj.position.copy(V(r.cx, r.y2 + 0.15, 0.25));
    group.add(trackLabel(obj));
  }

  if (confTier === 0) {
    addBlueprintPlot(
      group,
      pickables,
      cache,
      INFRA_ROOMS.conferenceRoom.x1,
      INFRA_ROOMS.conferenceRoom.y1,
      INFRA_ROOMS.conferenceRoom.x2,
      INFRA_ROOMS.conferenceRoom.y2,
      'BUILD: BOARDROOM',
      'conferenceRoom'
    );
  } else {
    const r = INFRA_ROOMS.conferenceRoom;
    addPlaneFloor(group, cache, r.x1, r.y1, r.x2, r.y2, 0.012, matteMat(cache, '#5f6875', 0.9), true);
    addFloorOutline(group, r.x1, r.y1, r.x2, r.y2, 0.014, emissiveMat(cache, '#a78bfa', confTier >= 2 ? 1.1 : 0.5));
    addGlassPartition(group, cache, r.x1 + 0.1, r.y1 + 0.1, r.x2 - 0.1, r.y1 + 0.1, 1.45);

    addBox(group, cache, 0.8, 2.2, 0.46, blackMetal(cache), r.cx, r.cy, 0, { rounded: 0.04 });
    addBox(group, cache, 1.45, 3.3, 0.08, glassMat(cache, 0.5, '#38bdf8'), r.cx, r.cy, 0.46, { rounded: 0.03 });
    for (const cy of [r.cy - 1.2, r.cy, r.cy + 1.2]) {
      addBox(group, cache, 0.42, 0.42, 0.46, leatherMat(cache, '#334155'), r.cx - 1.1, cy, 0, { rounded: 0.04 });
      addBox(group, cache, 0.42, 0.42, 0.46, leatherMat(cache, '#334155'), r.cx + 1.1, cy, 0, { rounded: 0.04 });
    }
    const wallScreenMat = getMat(cache, 'mat:boardroomChart', () =>
      new THREE.MeshStandardMaterial({
        map: chartTexture(cache, '#a78bfa'),
        emissive: '#ffffff',
        emissiveMap: chartTexture(cache, '#a78bfa'),
        emissiveIntensity: 1.0,
        roughness: 0.3
      })
    );
    addBox(group, cache, 2.24, 0.08, 1.12, plasticDark(cache), r.cx, r.y1 + 0.25, 0.72);
    const chartMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 1.0), wallScreenMat);
    chartMesh.position.copy(V(r.cx, r.y1 + 0.3, 1.28));
    group.add(chartMesh);
    if (confTier >= 3) {
      addCyl(group, cache, 0.34, 0.34, 0.34, emissiveMat(cache, '#fbbf24', 1.4), r.cx, r.cy, 0.54, 16);
    }
    const { obj } = createLabel(r.label, r.accent, false);
    obj.position.copy(V(r.cx, r.y2 + 0.15, 0.25));
    group.add(trackLabel(obj));
  }

  if (lobbyTier === 0) {
    addBlueprintPlot(
      group,
      pickables,
      cache,
      INFRA_ROOMS.lobbyRoom.x1,
      INFRA_ROOMS.lobbyRoom.y1,
      INFRA_ROOMS.lobbyRoom.x2,
      INFRA_ROOMS.lobbyRoom.y2,
      'BUILD: LOBBY',
      'lobbyRoom'
    );
  } else {
    const r = INFRA_ROOMS.lobbyRoom;
    addPlaneFloor(group, cache, r.x1, r.y1, r.x2, r.y2, 0.012, matteMat(cache, '#d6d0c6', 0.35, 0.05), true);
    addFloorOutline(group, r.x1, r.y1, r.x2, r.y2, 0.014, emissiveMat(cache, '#34d399', lobbyTier >= 2 ? 1.1 : 0.55));

    // Curved reception desk
    const deskArc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.82, 24, 1, false, -Math.PI * 0.4, Math.PI * 0.8),
      woodMat(cache, '#6b3412')
    );
    deskArc.position.copy(V(r.cx, r.cy - 2.1, 0.41));
    deskArc.castShadow = true;
    deskArc.receiveShadow = true;
    group.add(deskArc);

    const topArc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.46, 1.46, 0.07, 24, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
      matteMat(cache, '#cbd5e1', 0.25, 0.2)
    );
    topArc.position.copy(V(r.cx, r.cy - 2.1, 0.85));
    group.add(topArc);

    // Logo screen on reception wall
    const mLogo = getMat(cache, 'mat:jarvisLogo', () =>
      new THREE.MeshStandardMaterial({
        map: logoTexture(cache, 'J.A.R.V.I.S.'),
        emissive: '#ffffff',
        emissiveMap: logoTexture(cache, 'J.A.R.V.I.S.'),
        emissiveIntensity: 1.0
      })
    );
    addBox(group, cache, 2.8, 0.1, 0.9, plasticDark(cache), r.cx, r.y1 + 0.35, 1.1);
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 0.8), mLogo);
    logoMesh.position.copy(V(r.cx, r.y1 + 0.41, 1.55));
    group.add(logoMesh);

    // Visitor sofas
    addBox(group, cache, 2.2, 0.8, 0.42, leatherMat(cache, '#059669'), r.cx - 0.9, r.cy + 2.1, 0, { rounded: 0.05 });
    addBox(group, cache, 1.5, 0.8, 0.42, leatherMat(cache, '#0284c7'), r.cx + 1.6, r.cy + 2.1, 0, { rounded: 0.05 });
    if (lobbyTier >= 2) {
      addBox(group, cache, 0.14, 2.6, 1.2, matteMat(cache, '#16a34a', 0.75), r.x1 + 0.3, r.cy, 0.55);
    }
    if (lobbyTier >= 3) {
      addPottedPlant(group, cache, r.x1 + 0.7, r.y1 + 0.8, 1.25);
      addPottedPlant(group, cache, r.x2 - 0.7, r.y2 - 0.8, 1.25);
    }
    const { obj } = createLabel(r.label, r.accent, false);
    obj.position.copy(V(r.cx, r.y2 + 0.15, 0.25));
    group.add(trackLabel(obj));
  }

  // 9. Wellness, Sports & Lounge Department
  const pbTier = getRoomTier('pickleballCourt');
  const gymTier = getRoomTier('gymRoom');
  const bballTier = getRoomTier('basketballCourt');
  const barTier = getRoomTier('barLounge');
  const swimTier = getRoomTier('swimmingPool');
  const soccerTier = getRoomTier('soccerPitch');

  // Pickleball
  if (pbTier === 0) {
    addBlueprintPlot(group, pickables, cache, 11.1, -12.6, 15.9, -7.2, 'BUILD: PICKLEBALL', 'pickleballCourt');
  } else {
    addPlaneFloor(group, cache, 11.1, -12.6, 15.9, -7.2, 0.012, matteMat(cache, '#16a34a', 0.75), true);
    addPlaneFloor(group, cache, 11.5, -11.9, 15.5, -7.9, 0.015, matteMat(cache, '#2563eb', 0.65), true);
    const mLine = matteMat(cache, '#f8fafc', 0.4);
    addBox(group, cache, 0.05, 4.0, 0.01, mLine, 12.9, -9.9, 0.016, { cast: false });
    addBox(group, cache, 0.05, 4.0, 0.01, mLine, 14.1, -9.9, 0.016, { cast: false });
    addCyl(group, cache, 0.05, 0.05, 0.85, mLine, 13.5, -11.95, 0, 10);
    addCyl(group, cache, 0.05, 0.05, 0.85, mLine, 13.5, -7.85, 0, 10);
    const pbNet = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 0.65),
      glassMat(cache, 0.4, '#f8fafc')
    );
    pbNet.rotation.y = Math.PI / 2;
    pbNet.position.copy(V(13.5, -9.9, 0.48));
    group.add(pbNet);

    const pbBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), matteMat(cache, '#fde047', 0.35));
    pbBall.castShadow = true;
    pbBall.visible = false;
    group.add(pbBall);
    dyn.balls.pickleball = pbBall;

    const { obj } = createLabel('PICKLEBALL', '#86efac', false);
    obj.position.copy(V(13.5, -7.0, 0.25));
    group.add(trackLabel(obj));
  }

  // Gym
  if (gymTier === 0) {
    addBlueprintPlot(group, pickables, cache, 11.1, -5.8, 15.9, -0.8, 'BUILD: GYM', 'gymRoom');
  } else {
    addPlaneFloor(group, cache, 11.1, -5.8, 15.9, -0.8, 0.012, matteMat(cache, '#222b3a', 0.85), true);
    addPlaneFloor(group, cache, 11.5, -2.5, 13.4, -1.4, 0.016, matteMat(cache, '#7e22ce', 0.8), true);
    for (const tx of [12.0, 13.3]) {
      addBox(group, cache, 0.78, 1.35, 0.16, blackMetal(cache), tx, -4.8, 0, { rounded: 0.02 });
      addBox(group, cache, 0.68, 0.14, 0.88, chromeMetal(cache), tx, -5.35, 0.16);
      addBox(group, cache, 0.58, 0.2, 0.16, emissiveMat(cache, '#38bdf8', 1.1), tx, -5.35, 0.98);
    }
    // Weights bench
    addCyl(group, cache, 0.06, 0.06, 1.25, chromeMetal(cache), 14.4, -4.55, 0, 10);
    addCyl(group, cache, 0.06, 0.06, 1.25, chromeMetal(cache), 15.4, -4.55, 0, 10);
    addBox(group, cache, 0.48, 0.95, 0.34, leatherMat(cache, '#dc2626'), 14.9, -4.0, 0, { rounded: 0.04 });
    addCyl(group, cache, 0.03, 0.03, 1.4, chromeMetal(cache), 14.9, -4.55, 1.05, 10);

    const { obj } = createLabel('FITNESS GYM', '#fde047', false);
    obj.position.copy(V(13.5, -0.6, 0.25));
    group.add(trackLabel(obj));
  }

  // Basketball
  if (bballTier === 0) {
    addBlueprintPlot(group, pickables, cache, 11.1, 0.6, 15.9, 6.2, 'BUILD: BASKETBALL', 'basketballCourt');
  } else {
    const mCourt = getMat(cache, 'mat:bballCourt', () =>
      new THREE.MeshStandardMaterial({ map: courtWoodTexture(cache), roughness: 0.4, metalness: 0.05 })
    );
    addPlaneFloor(group, cache, 11.1, 0.6, 15.9, 6.2, 0.012, mCourt, true);
    addPlaneFloor(group, cache, 14.0, 2.3, 15.8, 4.5, 0.015, matteMat(cache, '#9a3412', 0.55), true);
    addBox(group, cache, 0.05, 5.6, 0.01, matteMat(cache, '#ffffff', 0.4), 13.3, 3.4, 0.016, { cast: false });

    // Hoop
    addCyl(group, cache, 0.08, 0.09, 2.35, blackMetal(cache), 15.5, 3.4, 0, 12);
    addBox(group, cache, 0.08, 1.15, 0.78, glassMat(cache, 0.45, '#e0f2fe'), 15.25, 3.4, 1.85);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 20), matteMat(cache, '#f97316', 0.35));
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(V(14.98, 3.4, 2.02));
    group.add(rim);
    const net = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.13, 0.35, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true })
    );
    net.position.copy(V(14.98, 3.4, 1.84));
    group.add(net);

    const bball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), matteMat(cache, '#ea580c', 0.55));
    bball.castShadow = true;
    bball.visible = false;
    group.add(bball);
    dyn.balls.basketball = bball;

    const { obj } = createLabel('BASKETBALL', '#fdba74', false);
    obj.position.copy(V(13.5, 6.4, 0.25));
    group.add(trackLabel(obj));
  }

  // Swimming Pool
  if (swimTier === 0) {
    addBlueprintPlot(group, pickables, cache, 16.7, -12.6, 21.5, -4.4, 'BUILD: SWIM POOL', 'swimmingPool');
  } else {
    addPlaneFloor(group, cache, 16.7, -12.6, 21.5, -4.4, 0.012, matteMat(cache, '#cbd5e1', 0.6), true);
    const waterNormal = noiseNormalMap(cache);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: '#1e88c9',
      roughness: 0.05,
      metalness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
      normalMap: waterNormal,
      normalScale: new THREE.Vector2(0.35, 0.35)
    });
    addPlaneFloor(group, cache, 17.2, -12.1, 21.0, -4.9, 0.025, waterMat, true);
    dyn.water = waterNormal;

    // Instanced lane floats
    const floatGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const floatMat = new THREE.MeshStandardMaterial({ roughness: 0.35 });
    const floats = new THREE.InstancedMesh(floatGeo, floatMat, 24);
    const dummy = new THREE.Object3D();
    const fc = new THREE.Color();
    let idx = 0;
    for (const [lx, col] of [[18.4, '#facc15'], [19.8, '#f87171']]) {
      for (let j = 0; j < 12; j += 1) {
        const ly = -11.8 + j * 0.6;
        dummy.position.set(lx, 0.05, ly);
        dummy.updateMatrix();
        floats.setMatrixAt(idx, dummy.matrix);
        fc.set(j % 2 === 0 ? col : '#f8fafc');
        floats.setColorAt(idx, fc);
        idx += 1;
      }
    }
    floats.instanceMatrix.needsUpdate = true;
    if (floats.instanceColor) floats.instanceColor.needsUpdate = true;
    group.add(floats);

    // Pool ladder rails
    addCyl(group, cache, 0.025, 0.025, 0.55, chromeMetal(cache), 17.3, -5.2, 0, 8);
    addCyl(group, cache, 0.025, 0.025, 0.55, chromeMetal(cache), 17.3, -5.6, 0, 8);

    const { obj } = createLabel('SWIMMING POOL', '#7dd3fc', false);
    obj.position.copy(V(19.1, -4.2, 0.25));
    group.add(trackLabel(obj));
  }

  // Soccer Pitch
  if (soccerTier === 0) {
    addBlueprintPlot(group, pickables, cache, 16.7, -3.0, 21.5, 3.0, 'BUILD: SOCCER', 'soccerPitch');
  } else {
    const mGrass = getMat(cache, 'mat:grassPitch', () =>
      new THREE.MeshStandardMaterial({ map: grassTexture(cache), roughness: 0.85 })
    );
    addPlaneFloor(group, cache, 16.7, -3.0, 21.5, 3.0, 0.012, mGrass, true);
    const mLine = matteMat(cache, '#ffffff', 0.4);
    addBox(group, cache, 0.05, 6.0, 0.01, mLine, 19.0, 0, 0.015, { cast: false });
    addCyl(group, cache, 0.06, 0.06, 1.15, mLine, 21.3, -1.0, 0, 10);
    addCyl(group, cache, 0.06, 0.06, 1.15, mLine, 21.3, 1.0, 0, 10);
    addBox(group, cache, 0.1, 2.1, 0.1, mLine, 21.3, 0, 1.1);
    const goalNet = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 1.05, 2.0),
      new THREE.MeshBasicMaterial({ color: '#e2e8f0', wireframe: true })
    );
    goalNet.position.copy(V(21.55, 0, 0.55));
    group.add(goalNet);

    const sBall = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), matteMat(cache, '#f8fafc', 0.4));
    sBall.castShadow = true;
    sBall.visible = false;
    group.add(sBall);
    dyn.balls.soccer = sBall;

    const { obj } = createLabel('SOCCER PITCH', '#86efac', false);
    obj.position.copy(V(19.1, 3.2, 0.25));
    group.add(trackLabel(obj));
  }

  // Bar, Cafe, Ping-Pong & Dance Lounge
  if (barTier === 0) {
    addBlueprintPlot(group, pickables, cache, 11.1, 7.6, 15.9, 12.6, 'BUILD: COFFEE CAFE', 'barLounge');
    addBlueprintPlot(group, pickables, cache, 16.7, 4.4, 21.5, 12.6, 'BUILD: BAR & DANCE', 'barLounge');
  } else {
    addPlaneFloor(group, cache, 11.1, 7.6, 15.9, 12.6, 0.012, oakMat(cache, '#8a5a3a'), true);
    addPlaneFloor(group, cache, 16.7, 4.4, 21.5, 7.2, 0.012, matteMat(cache, '#143f32', 0.75), true);
    addPlaneFloor(group, cache, 16.7, 8.6, 21.5, 12.6, 0.012, matteMat(cache, '#1a1033', 0.5), true);

    // Ping-pong table
    addBox(group, cache, 0.9, 0.6, 0.55, blackMetal(cache), 18.8, 5.8, 0);
    addBox(group, cache, 1.5, 0.95, 0.1, matteMat(cache, '#15803d', 0.45), 18.8, 5.8, 0.55, { rounded: 0.02 });
    addBox(group, cache, 0.04, 0.95, 0.18, glassMat(cache, 0.55, '#f8fafc'), 18.8, 5.8, 0.65);

    const ppBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), matteMat(cache, '#ffffff', 0.25));
    ppBall.visible = false;
    group.add(ppBall);
    dyn.balls.pingpong = ppBall;

    // Coffee cafe counter & chrome espresso machine
    addBox(group, cache, 1.7, 0.7, 0.75, woodMat(cache, '#78350f'), 12.3, 9.4, 0, { rounded: 0.02 });
    addBox(group, cache, 0.42, 0.34, 0.4, chromeMetal(cache), 12.0, 9.4, 0.75, { rounded: 0.02 });
    addBox(group, cache, 0.2, 0.2, 0.2, matteMat(cache, '#f59e0b', 0.35), 12.65, 9.4, 0.75);
    addBox(group, cache, 0.55, 0.55, 1.2, matteMat(cache, '#0ea5e9', 0.35), 11.15, 9.4, 0, { rounded: 0.02 });
    addBox(group, cache, 0.42, 0.04, 0.75, glassMat(cache, 0.45, '#bae6fd'), 11.15, 9.68, 0.25);

    // Lounge sofa
    addBox(group, cache, 1.65, 0.75, 0.38, leatherMat(cache, '#6366f1'), 14.7, 9.6, 0, { rounded: 0.06 });
    addBox(group, cache, 1.65, 0.2, 0.38, leatherMat(cache, '#4f46e5'), 14.7, 9.88, 0.38, { rounded: 0.05 });

    // Drinks bar + bottles + stools
    addBox(group, cache, 1.4, 0.72, 0.78, matteMat(cache, '#312e81', 0.4, 0.25), 17.5, 9.4, 0, { rounded: 0.03 });
    addBox(group, cache, 1.42, 0.05, 0.1, emissiveMat(cache, '#22d3ee', 1.3), 17.5, 9.76, 0.65, { cast: false });
    const bottleSpecs = [
      [-0.42, 0, 0.28, '#f472b6'],
      [-0.12, 0.08, 0.22, '#facc15'],
      [0.22, -0.04, 0.26, '#34d399'],
      [0.48, 0.05, 0.2, '#38bdf8']
    ];
    for (const [bx, by, bh, bcol] of bottleSpecs) {
      addCyl(group, cache, 0.05, 0.06, bh, emissiveMat(cache, bcol, 0.9), 17.5 + bx, 9.4 + by, 0.78, 10, { cast: false });
    }
    for (const sx of [17.15, 17.85]) {
      addCyl(group, cache, 0.15, 0.15, 0.45, chromeMetal(cache), sx, 10.02, 0, 12);
    }

    // 9 Dance floor tiles
    const palette = ['#e879f9', '#38bdf8', '#a855f7', '#f472b6', '#facc15', '#34d399'];
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x1 = 18.6 + col * 0.85;
        const y1 = 9.4 + row * 0.85;
        const colHex = palette[(row * 3 + col) % palette.length];
        const tMat = new THREE.MeshStandardMaterial({
          color: colHex,
          emissive: colHex,
          emissiveIntensity: 1.0,
          roughness: 0.25
        });
        addPlaneFloor(group, cache, x1, y1, x1 + 0.78, y1 + 0.75, 0.018, tMat, false);
        dyn.danceTiles.push(tMat);
      }
    }

    // Faceted disco ball + magenta PointLight
    const disco = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28, 1),
      new THREE.MeshStandardMaterial({
        color: '#f5d0fe',
        emissive: '#e879f9',
        emissiveIntensity: 0.65,
        metalness: 1.0,
        roughness: 0.15,
        flatShading: true
      })
    );
    disco.position.copy(V(19.9, 9.9, 2.35));
    group.add(disco);
    dyn.disco = disco;

    const discoLight = new THREE.PointLight('#e879f9', 8, 7, 1.6);
    discoLight.position.copy(V(19.9, 9.9, 2.0));
    group.add(discoLight);

    addPottedPlant(group, cache, 20.8, 5.5, 1.15);

    const lblPP = createLabel('PING-PONG', '#6ee7b7', false).obj;
    lblPP.position.copy(V(19.1, 7.4, 0.25));
    group.add(trackLabel(lblPP));

    const lblCafe = createLabel('COFFEE & LOUNGE', '#fdba74', false).obj;
    lblCafe.position.copy(V(13.5, 12.8, 0.25));
    group.add(trackLabel(lblCafe));

    const lblBar = createLabel('BAR & DANCE', '#f0abfc', false).obj;
    lblBar.position.copy(V(19.1, 12.8, 0.25));
    group.add(trackLabel(lblBar));
  }

  return { group, pickables, dyn };
}

