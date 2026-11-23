/**
 * Upgradable CEO Executive Office modules and HUD UI themes.
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

const VALID_THEME_IDS = new Set(UI_THEMES.map((t) => t.id));

/**
 * Create default CEO office upgrade state.
 */
export function createDefaultUpgrades() {
  return {
    deskTier: 1,
    brainLinkTier: 1,
    decorTier: 1,
    uiTheme: 'stark-cyan'
  };
}

/**
 * Validate and apply partial/full CEO office upgrade changes.
 * @param {object} current
 * @param {object} patch
 */
export function applyUpgradePatch(current, patch) {
  const next = { ...current };

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
 * Serialize upgrade state along with computed officeLevel and catalog metadata.
 * @param {object} state
 */
export function serializeUpgrades(state) {
  return {
    ...state,
    officeLevel: state.deskTier + state.brainLinkTier + state.decorTier,
    maxLevel: 9,
    themes: UI_THEMES,
    modules: UPGRADE_MODULES
  };
}
