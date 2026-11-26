/**
 * Error severity grading & incident tracking (inspired by GENERAL009/Agent-Office).
 *
 * Levels: 0 info · 1 minor · 2 moderate · 3 major · 4 critical
 * - The same line (numbers/ids/timestamps removed) seen 5 times within 2 minutes is raised one level
 *   and grouped into one entry with a counter.
 * - A problem that has not repeated for 2 minutes steps down one level every 20 seconds until it is gone.
 * Pure ES module (no DOM) so it runs in the browser and under `node --test`.
 */

export const SEVERITY = Object.freeze([
  { level: 0, id: 'info', label: 'Info', color: '#64748B' },
  { level: 1, id: 'minor', label: 'Minor', color: '#EAB308' },
  { level: 2, id: 'moderate', label: 'Moderate', color: '#F97316' },
  { level: 3, id: 'major', label: 'Major', color: '#DC2626' },
  { level: 4, id: 'critical', label: 'Critical', color: '#7F1D1D' }
]);

export const REPEAT_WINDOW_MS = 2 * 60 * 1000;
export const REPEAT_ESCALATE_COUNT = 5;
export const QUIET_BEFORE_DECAY_MS = 2 * 60 * 1000;
export const DECAY_STEP_MS = 20 * 1000;

const NOT_AN_ERROR = /\b0 (errors?|failures?|vulnerabilit(y|ies))\b|no errors?( found)?|without errors|error_handler|errors?: ?0\b/i;

const RULES = [
  {
    level: 4,
    re: /\b(FATAL|PANIC|CRITICAL)\b|OOMKilled|segfault|segmentation fault|password authentication failed|role "?[\w-]+"? does not exist|ECONNREFUSED[^\n]*(5432|3306|27017|6379|database|postgres|mysql|mongo|redis)|(database|postgres|mysql|mongo|redis)[^\n]*ECONNREFUSED|restarting \(?[3-9]\d*|crash-?loop/i
  },
  {
    level: 3,
    re: /Traceback|unhandled|uncaught|\b\w+(Error|Exception):|\bunhealthy\b|exit(ed)? (with )?(code|status) [1-9]|non-zero exit|Pipeline halted|Scheduler stalled/i
  },
  {
    level: 2,
    re: /\bERROR\b|\bexception\b|\bfailed\b|\bfailure\b|\bHTTP 5\d\d\b|\bstatus 5\d\d\b|\s5\d\d\s(Internal|Bad Gateway|Service Unavailable|Gateway Timeout)|Connection error/i
  },
  {
    level: 1,
    re: /\bWARN(ING)?\b|deprecated|retrying|\btimeout\b|timed out|\bHTTP 4(0[0-35-9]|[1-9]\d)\b|\bstatus 4(0[0-35-9]|[1-9]\d)\b/i
  }
];

export function severityInfo(level) {
  return SEVERITY[Math.max(0, Math.min(4, Number(level) || 0))];
}

/**
 * Grade a single log line.
 * @param {string} text
 * @param {'error'|'warn'|'info'|undefined} hint optional level reported by the source
 * @returns {number} 0..4
 */
export function gradeLine(text, hint) {
  const line = String(text ?? '');
  let level = 0;
  if (!NOT_AN_ERROR.test(line)) {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        level = rule.level;
        break;
      }
    }
  }
  if (hint === 'error') level = Math.max(level, 2);
  else if (hint === 'warn' || hint === 'warning') level = Math.max(level, 1);
  return level;
}

export function normalizeLine(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\d{4}-\d{2}-\d{2}[t ]?[\d:.]*z?/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\b/g, ' ')
    .replace(/0x[0-9a-f]+/g, '#')
    .replace(/\b[0-9a-f]{8,}\b/g, '#')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

export class IncidentTracker {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.items = new Map();
    this.seq = 0;
  }

  /**
   * Report a line for an agent. Returns the incident entry, or null for info lines.
   */
  report(agentId, text, { hint, source = 'log' } = {}) {
    const graded = gradeLine(text, hint);
    if (graded === 0) return null;
    const now = this.now();
    const key = `${agentId}|${normalizeLine(text)}`;
    let item = this.items.get(key);

    if (!item) {
      this.seq += 1;
      item = {
        id: `inc-${this.seq}`,
        key,
        agentId,
        text: String(text),
        source,
        baseLevel: graded,
        peakLevel: graded,
        level: graded,
        count: 1,
        escalated: false,
        firstSeen: now,
        lastSeen: now,
        hits: [now]
      };
      this.items.set(key, item);
      return item;
    }

    item.count += 1;
    item.text = String(text);
    item.lastSeen = now;
    item.hits = item.hits.filter((ts) => now - ts <= REPEAT_WINDOW_MS);
    item.hits.push(now);

    let target = Math.max(graded, item.baseLevel);
    if (item.escalated || item.hits.length >= REPEAT_ESCALATE_COUNT) {
      item.escalated = true;
      target = Math.min(4, target + 1);
    }
    item.peakLevel = Math.max(target, item.level);
    item.level = item.peakLevel;
    return item;
  }

  /** Apply time-based recovery. Returns true when anything changed. */
  tick() {
    const now = this.now();
    let changed = false;
    for (const [key, item] of this.items) {
      const quiet = now - item.lastSeen;
      let level = item.peakLevel;
      if (quiet > QUIET_BEFORE_DECAY_MS) {
        const steps = Math.floor((quiet - QUIET_BEFORE_DECAY_MS) / DECAY_STEP_MS) + 1;
        level = item.peakLevel - steps;
      }
      if (level <= 0) {
        this.items.delete(key);
        changed = true;
      } else if (level !== item.level) {
        item.level = level;
        changed = true;
      }
    }
    return changed;
  }

  resolve(agentId) {
    let removed = 0;
    for (const [key, item] of this.items) {
      if (item.agentId === agentId) {
        this.items.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear() {
    this.items.clear();
  }

  agentLevel(agentId) {
    let level = 0;
    for (const item of this.items.values()) {
      if (item.agentId === agentId && item.level > level) level = item.level;
    }
    return level;
  }

  worstFor(agentId) {
    return this.list().find((item) => item.agentId === agentId) || null;
  }

  list() {
    return [...this.items.values()].sort((a, b) => b.level - a.level || b.lastSeen - a.lastSeen);
  }

  counts() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const item of this.items.values()) counts[item.level] += 1;
    return counts;
  }
}
