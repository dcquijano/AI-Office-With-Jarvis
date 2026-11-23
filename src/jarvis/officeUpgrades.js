import { DEPARTMENTS } from './catalog.js';

/**
 * Upgradable CEO Executive Office modules, HUD UI themes, and 1-by-1 departmental campus rooms.
 */

export const UI_THEMES = Object.freeze([
  { id: 'stark-cyan', name: 'Stark Cyan HUD', accent: '#38bdf8' },
  { id: 'executive-gold', name: 'Executive Gold', accent: '#fbbf24' },
  { id: 'cyber-violet', name: 'Cyber Violet', accent: '#a78bfa' },
  { id: 'emerald-ops', name: 'Emerald Matrix', accent: '#34d399' }
]);

export const UPGRADE_MODULES = Object.freeze({
  deskTier: {
    key: 'deskTier',
    label: 'CEO Command Desk',
    tiers: [
      { tier: 1, name: 'Mahogany Triple-Monitor Desk', summary: 'Classic mahogany desk with 3 executive displays.' },
      { tier: 2, name: 'Wraparound Quad-Screen Array', summary: 'Curved executive workstation with 4 live monitors.' },
      { tier: 3, name: 'Stark Glass Panoramic Command Desk', summary: '5-screen holographic glass desk with gold LED underglow.' }
    ]
  },
  brainLinkTier: {
    key: 'brainLinkTier',
    label: 'J.A.R.V.I.S. Neural Link',
    tiers: [
      { tier: 1, name: 'Direct Neural Conduit', summary: 'Golden link connecting J.A.R.V.I.S. Brain to CEO desk.' },
      { tier: 2, name: 'Dual Synaptic Data Bridge', summary: 'High-bandwidth dual link with live pulsing telemetry.' },
      { tier: 3, name: 'In-Office Holo-Projector Table', summary: 'Dedicated 3D holographic brain projection inside the CEO Office.' }
    ]
  },
  decorTier: {
    key: 'decorTier',
    label: 'CEO Suite Interior & Lounge',
    tiers: [
      { tier: 1, name: 'Executive Essentials', summary: 'Trophy pedestal, visitor seat, and corner palm.' },
      { tier: 2, name: 'Velvet Lounge & Coffee Table', summary: 'Adds an executive lounge sofa and glass table inside the suite.' },
      { tier: 3, name: 'Private Espresso Bar & Gold Art', summary: 'Adds an in-suite espresso bar, illuminated art wall, and twin palms.' }
    ]
  }
});

export const BUILDABLE_ROOMS = Object.freeze([
  {
    id: 'ceo',
    name: 'CEO Executive Suite',
    department: 'executive',
    category: 'executive',
    defaultTier: 1,
    summary: 'Private corner suite connected directly to the J.A.R.V.I.S. AI Brain Core.'
  },
  {
    id: 'conferenceRoom',
    name: 'Executive Boardroom',
    department: 'executive',
    category: 'infrastructure',
    defaultTier: 1,
    summary: 'Glass conference room with 6-seat table, display wall, and presentation holo-table.'
  },
  {
    id: 'vulcan',
    name: 'Systems & Backend (Vulcan)',
    department: 'engineering',
    category: 'roles',
    defaultTier: 1,
    summary: 'Backend Systems Engineering lab for APIs, databases, and server architecture.'
  },
  {
    id: 'nova',
    name: 'Web & Frontend (Nova)',
    department: 'engineering',
    category: 'roles',
    defaultTier: 1,
    summary: 'Frontend Web Studio for interactive interfaces, 3D canvas, and client state.'
  },
  {
    id: 'iris',
    name: 'UI / UX Design Studio (Iris)',
    department: 'design-qa',
    category: 'roles',
    defaultTier: 1,
    summary: 'Creative UX wing with live color swatch boards and component design systems.'
  },
  {
    id: 'vera',
    name: 'QA Testing Lab (Vera)',
    department: 'design-qa',
    category: 'roles',
    defaultTier: 1,
    summary: 'Quality Assurance lab for automated test plans, edge cases, and verification.'
  },
  {
    id: 'serverRoom',
    name: 'Server & Compute Vault',
    department: 'infrastructure',
    category: 'infrastructure',
    defaultTier: 1,
    summary: 'Dedicated GPU/inference server racks, telemetry LEDs, and cryo-cooling hub.'
  },
  {
    id: 'aegis',
    name: 'Cybersecurity Vault (Aegis)',
    department: 'infrastructure',
    category: 'roles',
    defaultTier: 1,
    summary: 'Security Operations bay for threat modeling, SSRF/XSS audits, and hardening.'
  },
  {
    id: 'orion',
    name: 'DevOps & Cloud Hub (Orion)',
    department: 'infrastructure',
    category: 'roles',
    defaultTier: 1,
    summary: 'Cloud deployment control room for CI/CD pipelines, containers, and telemetry.'
  },
  {
    id: 'lobbyRoom',
    name: 'Reception & Welcome Lobby',
    department: 'strategy',
    category: 'infrastructure',
    defaultTier: 1,
    summary: 'Front-of-house reception counter, visitor lounge seating, and indoor palms.'
  },
  {
    id: 'athena',
    name: 'Strategy & Product (Athena)',
    department: 'strategy',
    category: 'roles',
    defaultTier: 1,
    summary: 'Executive planning suite with roadmap Kanban walls and milestone tracking.'
  },
  {
    id: 'sage',
    name: 'Research Library (Sage)',
    department: 'strategy',
    category: 'roles',
    defaultTier: 1,
    summary: 'Knowledge synthesis wing stocked with research shelves and benchmark terminals.'
  },
  {
    id: 'pickleballCourt',
    name: 'Pickleball Court',
    department: 'wellness',
    category: 'sports',
    defaultTier: 1,
    summary: 'Regulation doubles court with 3D net and rallying ball.'
  },
  {
    id: 'swimmingPool',
    name: 'Olympic Swimming Pool',
    department: 'wellness',
    category: 'sports',
    defaultTier: 1,
    summary: '3-lane tiled lap pool with water shimmer and splash animations.'
  },
  {
    id: 'gymRoom',
    name: 'Fitness Gym & Weights',
    department: 'wellness',
    category: 'sports',
    defaultTier: 1,
    summary: 'Twin treadmills, Olympic squat & bench rack, and yoga stretching mat.'
  },
  {
    id: 'basketballCourt',
    name: 'Basketball Half-Court',
    department: 'wellness',
    category: 'sports',
    defaultTier: 1,
    summary: 'Hardwood half-court with painted key, 3D hoop, and shooting arc.'
  },
  {
    id: 'soccerPitch',
    name: 'Futsal / Soccer Pitch',
    department: 'wellness',
    category: 'sports',
    defaultTier: 1,
    summary: 'Striped turf futsal pitch with 3D goalposts and animated passing.'
  },
  {
    id: 'barLounge',
    name: 'Coffee, Drinks Bar & Dance',
    department: 'wellness',
    category: 'sports',
    defaultTier: 1,
    summary: 'Espresso cafe, cold drinks bar, ping-pong garden, and LED dance floor.'
  }
]);

const VALID_THEME_IDS = new Set(UI_THEMES.map((t) => t.id));
const ROOM_BY_ID = new Map(BUILDABLE_ROOMS.map((r) => [r.id, r]));
const VALID_DEPARTMENT_IDS = new Set(DEPARTMENTS.map((d) => d.id));

function buildRoomsMap(fillTier = null) {
  const rooms = {};
  for (const room of BUILDABLE_ROOMS) {
    rooms[room.id] = fillTier === null ? room.defaultTier : fillTier;
  }
  return rooms;
}

/**
 * Create default CEO office & departmental room upgrade state.
 */
export function createDefaultUpgrades() {
  return {
    deskTier: 1,
    brainLinkTier: 1,
    decorTier: 1,
    uiTheme: 'stark-cyan',
    rooms: buildRoomsMap(null)
  };
}

/**
 * Validate and apply partial/full upgrade patches across CEO modules, UI theme, and rooms.
 * @param {object} current
 * @param {object} patch
 */
export function applyUpgradePatch(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { error: 'Upgrade payload must be a JSON object.' };
  }

  const next = {
    ...current,
    rooms: { ...buildRoomsMap(null), ...(current.rooms || {}) }
  };

  if (patch.preset !== undefined) {
    if (patch.preset === 'blueprint') {
      next.rooms = buildRoomsMap(0);
    } else if (patch.preset === 'starter') {
      next.rooms = buildRoomsMap(1);
    } else if (patch.preset === 'max') {
      next.rooms = buildRoomsMap(3);
      next.deskTier = 3;
      next.brainLinkTier = 3;
      next.decorTier = 3;
    } else {
      return { error: `Unknown preset "${String(patch.preset)}".` };
    }
  }

  if (patch.departmentPreset !== undefined) {
    const dp = patch.departmentPreset;
    if (!dp || typeof dp !== 'object' || !VALID_DEPARTMENT_IDS.has(dp.departmentId)) {
      return { error: `Unknown department "${String(dp?.departmentId)}".` };
    }
    if (!Number.isInteger(dp.tier) || dp.tier < 0 || dp.tier > 3) {
      return { error: 'Department preset tier must be an integer between 0 and 3.' };
    }
    for (const room of BUILDABLE_ROOMS) {
      if (room.department === dp.departmentId) {
        next.rooms[room.id] = dp.tier;
      }
    }
  }

  if (patch.rooms !== undefined) {
    if (!patch.rooms || typeof patch.rooms !== 'object' || Array.isArray(patch.rooms)) {
      return { error: 'Field "rooms" must be an object mapping room IDs to tiers (0-3).' };
    }
    for (const [roomId, tier] of Object.entries(patch.rooms)) {
      if (!ROOM_BY_ID.has(roomId)) {
        return { error: `Unknown room "${roomId}".` };
      }
      if (!Number.isInteger(tier) || tier < 0 || tier > 3) {
        return { error: `Room "${roomId}" tier must be an integer between 0 and 3.` };
      }
      next.rooms[roomId] = tier;
    }
  }

  for (const key of ['deskTier', 'brainLinkTier', 'decorTier']) {
    if (patch[key] !== undefined) {
      if (!Number.isInteger(patch[key]) || patch[key] < 1 || patch[key] > 3) {
        return { error: `Field "${key}" must be an integer between 1 and 3.` };
      }
      next[key] = patch[key];
    }
  }

  if (patch.uiTheme !== undefined) {
    if (typeof patch.uiTheme !== 'string' || !VALID_THEME_IDS.has(patch.uiTheme)) {
      return { error: `Unknown uiTheme "${String(patch.uiTheme)}".` };
    }
    next.uiTheme = patch.uiTheme;
  }

  return { value: next };
}

/**
 * Serialize upgrade state along with computed counts, room catalog, and department metadata.
 * @param {object} state
 */
export function serializeUpgrades(state) {
  const rooms = { ...buildRoomsMap(null), ...(state.rooms || {}) };
  const roomTiers = Object.values(rooms);
  const builtCount = roomTiers.filter((tier) => tier >= 1).length;
  const totalRoomLevels = roomTiers.reduce((sum, tier) => sum + tier, 0);

  return {
    ...state,
    rooms,
    builtCount,
    totalRooms: BUILDABLE_ROOMS.length,
    totalRoomLevels,
    maxRoomLevels: BUILDABLE_ROOMS.length * 3,
    officeLevel: state.deskTier + state.brainLinkTier + state.decorTier,
    maxLevel: 9,
    themes: UI_THEMES,
    modules: UPGRADE_MODULES,
    departments: DEPARTMENTS,
    roomCatalog: BUILDABLE_ROOMS
  };
}
