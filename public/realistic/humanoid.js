/**
 * Articulated 3D humanoid avatar builder and pose/locomotion animator for all 9 AI agents.
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  blackMetal,
  chromeMetal,
  emissiveMat,
  fabricMat,
  hairMat,
  leatherMat,
  matteMat,
  plasticDark,
  skinMat
} from './materials.js';

function shortestAngleDiff(current, target) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createHumanoid(style, accent, name, id, cache) {
  const root = new THREE.Group();
  const bodyScale = new THREE.Group();
  const hScale = style.height || 1.0;
  const build = style.build || 1.0;
  bodyScale.scale.set(1, hScale, 1);
  root.add(bodyScale);

  const mSuit = fabricMat(cache, style.suit);
  const mShirt = fabricMat(cache, style.shirt);
  const mPants = fabricMat(cache, style.pants || '#1f2937');
  const mShoes = leatherMat(cache, style.shoes || '#111827');
  const mSkin = skinMat(cache, style.skin);
  const mHair = hairMat(cache, style.hair);
  const mDark = blackMetal(cache);
  const mChrome = chromeMetal(cache);
  const mVisor = emissiveMat(cache, '#38bdf8', 1.7);

  // Selection ring on floor
  const ringGeo = new THREE.RingGeometry(0.42, 0.54, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.8,
    roughness: 0.3,
    side: THREE.DoubleSide
  });
  const selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.025;
  selectionRing.visible = false;
  root.add(selectionRing);

  // Invisible raycast pick proxy (visible=false on material keeps raycast active!)
  const proxyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.8, 12);
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const proxy = new THREE.Mesh(proxyGeo, proxyMat);
  proxy.position.y = 0.9;
  proxy.userData.pickId = id;
  root.add(proxy);

  // Hips pivot
  const hips = new THREE.Group();
  hips.position.y = 0.80;
  bodyScale.add(hips);

  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.145 * build, 0.06, 6, 12), mPants);
  pelvis.scale.set(1, 1, 0.68);
  pelvis.castShadow = true;
  hips.add(pelvis);

  // Legs
  const buildLeg = (sideX) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(sideX, -0.02, 0);
    hips.add(hipPivot);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.22, 6, 12), mPants);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.36;
    hipPivot.add(kneePivot);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 6, 12), mPants);
    shin.position.y = -0.18;
    shin.castShadow = true;
    kneePivot.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.085, 0.23), mShoes);
    shoe.position.set(0, -0.375, 0.045);
    shoe.castShadow = true;
    kneePivot.add(shoe);

    return { hipPivot, kneePivot };
  };

  const leftLeg = buildLeg(-0.105 * build);
  const rightLeg = buildLeg(0.105 * build);

  // Torso pivot
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.06;
  hips.add(torsoPivot);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.165, 0.30, 8, 16), mSuit);
  torso.scale.set(build, 1, 0.65);
  torso.position.y = 0.23;
  torso.castShadow = true;
  torsoPivot.add(torso);

  // Shirt V-front
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.04), mShirt);
  shirt.position.set(0, 0.31, 0.102);
  shirt.castShadow = true;
  torsoPivot.add(shirt);

  if (style.tie) {
    const tieMat = fabricMat(cache, style.tie);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.18, 0.02), tieMat);
    tie.position.set(0, 0.29, 0.122);
    torsoPivot.add(tie);
  }

  // Arms
  const buildArm = (sideX) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sideX, 0.41, 0);
    torsoPivot.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.18, 6, 12), mSuit);
    upperArm.position.y = -0.125;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.25;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.17, 6, 12), mSuit);
    forearm.position.y = -0.115;
    forearm.castShadow = true;
    elbow.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), mSkin);
    hand.position.y = -0.24;
    hand.castShadow = true;
    elbow.add(hand);

    return { shoulder, elbow, hand };
  };

  const leftArm = buildArm(-0.225 * build);
  const rightArm = buildArm(0.225 * build);

  // Neck & Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.11, 12), mSkin);
  neck.position.y = 0.50;
  neck.castShadow = true;
  torsoPivot.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.65;
  torsoPivot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 16), mSkin);
  head.scale.set(0.9, 1.05, 0.95);
  head.castShadow = true;
  headGroup.add(head);

  // Face features (+Z forward)
  const eyeWhiteGeo = new THREE.SphereGeometry(0.017, 8, 8);
  const pupilGeo = new THREE.SphereGeometry(0.009, 8, 8);
  const mWhite = matteMat(cache, '#f8fafc', 0.3, 0);
  const mPupil = matteMat(cache, '#0f172a', 0.2, 0.1);
  const browGeo = new THREE.BoxGeometry(0.036, 0.009, 0.014);

  for (const sx of [-0.04, 0.04]) {
    const ew = new THREE.Mesh(eyeWhiteGeo, mWhite);
    ew.position.set(sx, 0.016, 0.104);
    headGroup.add(ew);

    const ep = new THREE.Mesh(pupilGeo, mPupil);
    ep.position.set(sx, 0.016, 0.116);
    headGroup.add(ep);

    const brow = new THREE.Mesh(browGeo, mHair);
    brow.position.set(sx, 0.042, 0.105);
    headGroup.add(brow);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), mSkin);
  nose.position.set(0, -0.005, 0.116);
  headGroup.add(nose);

  // Hair styles
  const hairStyle = style.hairStyle || 'short';
  if (hairStyle === 'buzz') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.123, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.54), mHair);
    cap.scale.set(0.91, 1.05, 0.96);
    cap.castShadow = true;
    headGroup.add(cap);
  } else if (hairStyle === 'short') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.129, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), mHair);
    cap.scale.set(0.94, 1.08, 0.99);
    cap.position.y = 0.008;
    cap.castShadow = true;
    headGroup.add(cap);
  } else if (hairStyle === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mHair);
    cap.scale.set(0.95, 1.08, 1.0);
    cap.castShadow = true;
    headGroup.add(cap);

    const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.24, 0.1), mHair);
    backHair.position.set(0, -0.08, -0.075);
    backHair.castShadow = true;
    headGroup.add(backHair);
  } else if (hairStyle === 'bun') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.128, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), mHair);
    cap.scale.set(0.94, 1.07, 0.98);
    cap.castShadow = true;
    headGroup.add(cap);

    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), mHair);
    bun.position.set(0, 0.1, -0.095);
    bun.castShadow = true;
    headGroup.add(bun);
  } else if (hairStyle === 'ponytail') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.128, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), mHair);
    cap.scale.set(0.94, 1.07, 0.98);
    cap.castShadow = true;
    headGroup.add(cap);

    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.16, 6, 10), mHair);
    tail.position.set(0, -0.04, -0.125);
    tail.rotation.x = 0.35;
    tail.castShadow = true;
    headGroup.add(tail);
  } else if (hairStyle === 'bob') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.132, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), mHair);
    cap.scale.set(0.98, 1.08, 1.02);
    cap.castShadow = true;
    headGroup.add(cap);

    const bobBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.11), mHair);
    bobBack.position.set(0, -0.045, -0.065);
    bobBack.castShadow = true;
    headGroup.add(bobBack);
  }

  // Optional accessories
  if (style.glasses) {
    const rimGeo = new THREE.TorusGeometry(0.026, 0.004, 8, 16);
    for (const sx of [-0.04, 0.04]) {
      const rim = new THREE.Mesh(rimGeo, mDark);
      rim.position.set(sx, 0.016, 0.118);
      headGroup.add(rim);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.005), mDark);
    bridge.position.set(0, 0.018, 0.12);
    headGroup.add(bridge);
  }

  if (style.beard) {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.108, 14, 12), mHair);
    beard.scale.set(0.86, 0.62, 0.88);
    beard.position.set(0, -0.055, 0.025);
    headGroup.add(beard);
  }

  if (style.earrings) {
    const mGold = emissiveMat(cache, '#fbbf24', 0.45);
    const earGeo = new THREE.SphereGeometry(0.014, 8, 8);
    for (const sx of [-0.112, 0.112]) {
      const ear = new THREE.Mesh(earGeo, mGold);
      ear.position.set(sx, -0.025, 0.01);
      headGroup.add(ear);
    }
  }

  if (style.visor) {
    const visorGeo = new THREE.CylinderGeometry(0.118, 0.118, 0.042, 16, 1, true, -0.7, 1.4);
    const visor = new THREE.Mesh(visorGeo, mVisor);
    visor.position.set(0, 0.018, 0.005);
    headGroup.add(visor);
  }

  // --- Activity Props (hidden by default) ---
  const props = {};

  // Headset on head
  const headset = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 8, 18, Math.PI), plasticDark(cache));
  band.rotation.y = Math.PI / 2;
  band.position.y = 0.03;
  headset.add(band);
  for (const sx of [-0.125, 0.125]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 12), plasticDark(cache));
    cup.rotation.z = Math.PI / 2;
    cup.position.set(sx, 0.0, 0);
    headset.add(cup);
  }
  const mic = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.09), mVisor);
  mic.position.set(0.1, -0.04, 0.06);
  headset.add(mic);
  headset.visible = false;
  headGroup.add(headset);
  props.headset = headset;

  // Hand props attached to rightArm.hand
  const rightHandProps = new THREE.Group();
  rightHandProps.position.y = -0.24;
  rightArm.elbow.add(rightHandProps);

  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.24), emissiveMat(cache, '#38bdf8', 0.9));
  tablet.position.set(0, -0.03, 0.1);
  tablet.visible = false;
  rightHandProps.add(tablet);
  props.tablet = tablet;

  const paddle = new THREE.Group();
  const paddleHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8), mDark);
  paddleHandle.rotation.x = Math.PI / 2;
  paddleHandle.position.set(0, 0, 0.08);
  const paddleHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.02, 16),
    matteMat(cache, '#ef4444', 0.4, 0.1)
  );
  paddleHead.rotation.x = Math.PI / 2;
  paddleHead.position.set(0, 0, 0.21);
  paddle.add(paddleHandle, paddleHead);
  paddle.visible = false;
  rightHandProps.add(paddle);
  props.paddle = paddle;

  const coffee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.036, 0.095, 12),
    matteMat(cache, '#f8fafc', 0.25, 0.05)
  );
  coffee.position.set(0, -0.02, 0.05);
  coffee.visible = false;
  rightHandProps.add(coffee);
  props.coffee = coffee;

  const drink = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.032, 0.12, 12),
    emissiveMat(cache, '#f472b6', 0.85)
  );
  drink.position.set(0, -0.02, 0.05);
  drink.visible = false;
  rightHandProps.add(drink);
  props.drink = drink;

  // Barbell attached to torsoPivot for gym-lift
  const barbell = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 12), mChrome);
  bar.rotation.z = Math.PI / 2;
  const plateMat = matteMat(cache, '#facc15', 0.35, 0.2);
  const plateL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), plateMat);
  plateL.rotation.z = Math.PI / 2;
  plateL.position.x = -0.48;
  const plateR = plateL.clone();
  plateR.position.x = 0.48;
  barbell.add(bar, plateL, plateR);
  barbell.position.set(0, 0.62, 0.16);
  barbell.visible = false;
  torsoPivot.add(barbell);
  props.barbell = barbell;

  // Name Tag (CSS2D)
  const tagEl = document.createElement('div');
  tagEl.className = 'actor-tag';
  tagEl.style.setProperty('--accent', accent);
  const dotSpan = document.createElement('span');
  dotSpan.className = 'dot';
  const nameEl = document.createElement('b');
  nameEl.className = 'name';
  nameEl.textContent = name;
  const actEl = document.createElement('small');
  actEl.className = 'activity';
  actEl.textContent = 'On Campus';
  tagEl.append(dotSpan, nameEl, actEl);

  const tagObj = new CSS2DObject(tagEl);
  tagObj.position.set(0, 1.9, 0);
  root.add(tagObj);

  // Speech Bubble (CSS2D)
  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'speech-bubble';
  bubbleEl.style.setProperty('--accent', accent);
  bubbleEl.style.display = 'none';
  const bubbleObj = new CSS2DObject(bubbleEl);
  bubbleObj.position.set(0, 2.22, 0);
  root.add(bubbleObj);

  return {
    root,
    bodyScale,
    hips,
    torsoPivot,
    headGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    selectionRing,
    proxy,
    props,
    tagEl,
    tagObj,
    actEl,
    lastActivityText: 'On Campus',
    bubbleEl,
    bubbleObj,
    lastBubbleText: '',
    facingYaw: Math.PI
  };
}

export function animateHumanoid(h, actor, ctx) {
  const { t, dt, reducedMotion, activityLabel, sportsClock, nearbyTarget } = ctx;
  const blend = Math.min(1, Math.max(0.12, dt * 12));
  const act = actor.activity;
  const walking = actor.walking;
  const isSwim = act === 'swim' && !walking;
  const isSeated = !walking && (actor.slotKey?.startsWith('computer:') || act === 'lounge');

  // Hide all props, then enable as needed
  h.props.headset.visible = false;
  h.props.tablet.visible = false;
  h.props.paddle.visible = false;
  h.props.coffee.visible = false;
  h.props.drink.visible = false;
  h.props.barbell.visible = false;

  // Position & facing
  let posX = actor.x;
  let posZ = actor.y;
  let posY = 0;

  if (isSwim) {
    const phase = reducedMotion ? 0 : Math.sin(t * 1.1 + (actor.id.charCodeAt(0) % 5));
    posZ = -8.5 + phase * 2.5;
    const swimDir = reducedMotion ? 0 : Math.cos(t * 1.1 + (actor.id.charCodeAt(0) % 5)) >= 0 ? 0 : Math.PI;
    h.facingYaw = swimDir;
  } else if (walking) {
    const dx = actor.targetX - actor.x;
    const dy = actor.targetY - actor.y;
    if (Math.hypot(dx, dy) > 0.01) {
      const targetYaw = Math.atan2(dx, dy);
      h.facingYaw += shortestAngleDiff(h.facingYaw, targetYaw) * blend;
    }
  } else if (actor.slotKey?.startsWith('computer:')) {
    h.facingYaw += shortestAngleDiff(h.facingYaw, Math.PI) * blend;
  } else if (act === 'lounge') {
    h.facingYaw += shortestAngleDiff(h.facingYaw, 0) * blend;
  } else if (nearbyTarget) {
    const dx = nearbyTarget.x - actor.x;
    const dy = nearbyTarget.y - actor.y;
    if (Math.hypot(dx, dy) > 0.05) {
      const targetYaw = Math.atan2(dx, dy);
      h.facingYaw += shortestAngleDiff(h.facingYaw, targetYaw) * blend;
    }
  }

  // Target joint angles
  let rootRotX = 0;
  let hipsY = 0.8;
  let hipsRotY = 0;
  let torsoRotX = 0;
  let torsoRotZ = 0;

  let lHipX = 0;
  let lKneeX = 0;
  let rHipX = 0;
  let rKneeX = 0;

  let lArmX = 0;
  let lArmZ = 0.08;
  let lElbowX = -0.15;
  let rArmX = 0;
  let rArmZ = -0.08;
  let rElbowX = -0.15;

  if (isSwim) {
    posY = 0.06;
    hipsY = 0.05;
    rootRotX = -1.42;
    const p = reducedMotion ? 0.5 : actor.actionPhase;
    lArmX = -1.8 + Math.sin(p) * 1.2;
    rArmX = -1.8 - Math.sin(p) * 1.2;
    lHipX = Math.sin(p * 2) * 0.3;
    rHipX = -Math.sin(p * 2) * 0.3;
  } else if (walking) {
    const wp = reducedMotion ? 0 : actor.walkPhase;
    const s = Math.sin(wp);
    lHipX = 0.6 * s;
    rHipX = -0.6 * s;
    lKneeX = Math.max(0, -s) * 0.9;
    rKneeX = Math.max(0, s) * 0.9;
    lArmX = -0.5 * s;
    rArmX = 0.5 * s;
    lElbowX = -0.25;
    rElbowX = -0.25;
    hipsY = 0.8 + (reducedMotion ? 0 : Math.abs(s) * 0.05);
    torsoRotX = 0.06;
  } else if (isSeated) {
    hipsY = 0.46;
    lHipX = -1.45;
    rHipX = -1.45;
    lKneeX = 1.45;
    rKneeX = 1.45;

    if (act === 'lounge') {
      torsoRotX = -0.12;
      lArmX = -0.35;
      rArmX = -0.35;
      lElbowX = -0.6;
      rElbowX = -0.6;
    } else {
      torsoRotX = 0.08;
      const typeJitter = act === 'working' && !reducedMotion ? Math.sin(actor.actionPhase * 1.4) * 0.08 : 0;
      lArmX = -0.9;
      rArmX = -0.9;
      lElbowX = -0.7 + typeJitter;
      rElbowX = -0.7 - typeJitter;
      h.props.headset.visible = true;
    }
  } else if (act === 'gym-run') {
    posY = 0.18;
    const p = reducedMotion ? 0 : actor.actionPhase;
    const s = Math.sin(p);
    hipsY = 0.8 + Math.abs(s) * 0.06;
    lHipX = 0.72 * s;
    rHipX = -0.72 * s;
    lKneeX = Math.max(0, -s) * 1.05;
    rKneeX = Math.max(0, s) * 1.05;
    lArmX = -0.7 * s;
    rArmX = 0.7 * s;
    lElbowX = -1.1;
    rElbowX = -1.1;
    torsoRotX = 0.14;
  } else if (act === 'gym-lift') {
    h.props.barbell.visible = true;
    const lift = reducedMotion ? 0.5 : Math.abs(Math.sin(actor.actionPhase));
    lArmX = -2.4 - lift * 0.55;
    rArmX = -2.4 - lift * 0.55;
    lElbowX = -0.35 + lift * 0.2;
    rElbowX = -0.35 + lift * 0.2;
    h.props.barbell.position.y = 0.56 + lift * 0.28;
  } else if (act === 'dance') {
    const p = reducedMotion ? 0 : t * 7;
    hipsY = 0.8 + Math.abs(Math.sin(p)) * 0.07;
    hipsRotY = Math.sin(p * 0.5) * 0.35;
    torsoRotZ = Math.sin(p * 0.5) * 0.12;
    lArmX = -1.6 + Math.sin(p) * 0.65;
    rArmX = -1.6 - Math.sin(p) * 0.65;
    lArmZ = 0.35;
    rArmZ = -0.35;
    lElbowX = -0.45;
    rElbowX = -0.45;
  } else if (act === 'pickleball' || act === 'pingpong') {
    h.props.paddle.visible = true;
    const swing = reducedMotion ? 0 : Math.sin(sportsClock * 3.5);
    torsoRotX = 0.12;
    hipsRotY = swing * 0.25;
    rArmX = -0.85 + swing * 0.65;
    rElbowX = -0.65;
    lArmX = -0.4;
    lElbowX = -0.5;
  } else if (act === 'basketball') {
    const shoot = reducedMotion ? 0.3 : Math.max(0, Math.sin(sportsClock * 2.2));
    hipsY = 0.8 + shoot * 0.14;
    lArmX = -1.2 - shoot * 1.1;
    rArmX = -1.2 - shoot * 1.1;
    lElbowX = -0.5;
    rElbowX = -0.5;
  } else if (act === 'soccer') {
    const kick = reducedMotion ? 0 : Math.sin(sportsClock * 3.2);
    rHipX = kick * 0.65;
    rKneeX = Math.max(0, -kick) * 0.6;
    lArmX = -0.35;
    rArmX = 0.35;
  } else if (act === 'coffee' || act === 'bar') {
    if (act === 'coffee') h.props.coffee.visible = true;
    else h.props.drink.visible = true;
    const sip = reducedMotion ? 0.2 : Math.max(0, Math.sin(t * 1.6));
    rArmX = -0.75 - sip * 0.55;
    rElbowX = -0.95 - sip * 0.35;
  } else {
    // meeting / briefing / colleague-talk / lobby / server-ops / default
    if (act === 'meeting' || act === 'server-ops' || act === 'colleague-talk') {
      h.props.tablet.visible = true;
    }
    if (act === 'meeting' || act === 'colleague-talk') {
      h.props.headset.visible = true;
    }
    const breath = reducedMotion ? 0 : Math.sin(t * 2.1 + actor.actionPhase);
    torsoRotX = breath * 0.02;
    rArmX = -0.45 + breath * 0.15;
    rElbowX = -0.65;
    lArmX = -0.15;
    lElbowX = -0.25;
  }

  h.root.position.set(posX, posY, posZ);
  h.bodyScale.rotation.x = lerp(h.bodyScale.rotation.x, rootRotX, blend);
  h.bodyScale.rotation.y = isSwim ? h.facingYaw : h.facingYaw;

  h.hips.position.y = lerp(h.hips.position.y, hipsY, blend);
  h.hips.rotation.y = lerp(h.hips.rotation.y, hipsRotY, blend);
  h.torsoPivot.rotation.x = lerp(h.torsoPivot.rotation.x, torsoRotX, blend);
  h.torsoPivot.rotation.z = lerp(h.torsoPivot.rotation.z, torsoRotZ, blend);

  h.leftLeg.hipPivot.rotation.x = lerp(h.leftLeg.hipPivot.rotation.x, lHipX, blend);
  h.leftLeg.kneePivot.rotation.x = lerp(h.leftLeg.kneePivot.rotation.x, lKneeX, blend);
  h.rightLeg.hipPivot.rotation.x = lerp(h.rightLeg.hipPivot.rotation.x, rHipX, blend);
  h.rightLeg.kneePivot.rotation.x = lerp(h.rightLeg.kneePivot.rotation.x, rKneeX, blend);

  h.leftArm.shoulder.rotation.x = lerp(h.leftArm.shoulder.rotation.x, lArmX, blend);
  h.leftArm.shoulder.rotation.z = lerp(h.leftArm.shoulder.rotation.z, lArmZ, blend);
  h.leftArm.elbow.rotation.x = lerp(h.leftArm.elbow.rotation.x, lElbowX, blend);
  h.rightArm.shoulder.rotation.x = lerp(h.rightArm.shoulder.rotation.x, rArmX, blend);
  h.rightArm.shoulder.rotation.z = lerp(h.rightArm.shoulder.rotation.z, rArmZ, blend);
  h.rightArm.elbow.rotation.x = lerp(h.rightArm.elbow.rotation.x, rElbowX, blend);

  if (h.lastActivityText !== activityLabel) {
    h.lastActivityText = activityLabel;
    h.actEl.textContent = activityLabel;
  }
}

