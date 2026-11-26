import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IncidentTracker,
  gradeLine,
  normalizeLine,
  DECAY_STEP_MS,
  QUIET_BEFORE_DECAY_MS
} from '../public/severity.js';
import { estimateLocation, mixColor, nextSunEvents, skyState, solarPosition } from '../public/realistic/sky.js';

test('gradeLine grades log lines by Agent-Office style severity rules', () => {
  assert.equal(gradeLine('GET /api/team 200 OK'), 0);
  assert.equal(gradeLine('GET /missing 404'), 0);
  assert.equal(gradeLine('Build finished with 0 errors'), 0);
  assert.equal(gradeLine('no errors found'), 0);
  assert.equal(gradeLine('WARN deprecated: react-dom.render is no longer supported'), 1);
  assert.equal(gradeLine('timeout: upstream API retrying (3/5)'), 1);
  assert.equal(gradeLine('ERROR TLS handshake failed: certificate expired'), 2);
  assert.equal(gradeLine('HTTP 503 from roadmap service'), 2);
  assert.equal(gradeLine("TypeError: Cannot read properties of undefined (reading 'id')"), 3);
  assert.equal(gradeLine('Traceback (most recent call last):'), 3);
  assert.equal(gradeLine('Pipeline halted: Scheduler stalled'), 3);
  assert.equal(gradeLine('FATAL: password authentication failed for user "app"'), 4);
  assert.equal(gradeLine('connect ECONNREFUSED 127.0.0.1:5432'), 4);
  assert.equal(gradeLine('Container api OOMKilled'), 4);
  assert.equal(gradeLine('plain message', 'warn'), 1);
  assert.equal(gradeLine('plain message', 'error'), 2);
});

test('normalizeLine strips numbers, ids and timestamps for grouping', () => {
  assert.equal(
    normalizeLine('2026-11-26T10:00:01Z FATAL conn 0xdeadbeef id=12345'),
    normalizeLine('2026-11-26T10:05:59Z FATAL conn 0xabc id=999')
  );
});

test('IncidentTracker groups repeats, escalates after 5 hits, and decays when quiet', () => {
  let now = 1_000_000;
  const tracker = new IncidentTracker({ now: () => now });

  assert.equal(tracker.report('vulcan', 'all good'), null);

  const first = tracker.report('vulcan', 'ERROR worker 1 failed');
  assert.equal(first.level, 2);
  for (let i = 2; i <= 4; i += 1) {
    now += 1000;
    tracker.report('vulcan', `ERROR worker ${i} failed`);
  }
  assert.equal(tracker.list().length, 1);
  assert.equal(tracker.agentLevel('vulcan'), 2);

  now += 1000;
  const fifth = tracker.report('vulcan', 'ERROR worker 5 failed');
  assert.equal(fifth.count, 5);
  assert.equal(fifth.level, 3, 'escalates one level after 5 repeats within 2 minutes');

  now += QUIET_BEFORE_DECAY_MS + 1;
  assert.equal(tracker.tick(), true);
  assert.equal(tracker.agentLevel('vulcan'), 2);
  now += DECAY_STEP_MS;
  tracker.tick();
  assert.equal(tracker.agentLevel('vulcan'), 1);
  now += DECAY_STEP_MS;
  tracker.tick();
  assert.equal(tracker.agentLevel('vulcan'), 0);
  assert.equal(tracker.list().length, 0);
});

test('IncidentTracker resolve, counts and worstFor', () => {
  const tracker = new IncidentTracker();
  tracker.report('orion', 'FATAL: password authentication failed for user "app"');
  tracker.report('orion', 'WARN disk 81% full');
  tracker.report('nova', 'ERROR build failed');
  assert.deepEqual(tracker.counts(), { 1: 1, 2: 1, 3: 0, 4: 1 });
  assert.equal(tracker.worstFor('orion').level, 4);
  assert.equal(tracker.resolve('orion'), 2);
  assert.equal(tracker.agentLevel('orion'), 0);
  assert.equal(tracker.agentLevel('nova'), 2);
});

test('solarPosition puts the sun overhead near the equator at equinox noon and below horizon at midnight', () => {
  const noon = solarPosition(new Date('2025-03-20T12:07:00Z'), 0, 0);
  assert.ok(noon.elevation > 85, `noon elevation ${noon.elevation}`);
  const midnight = solarPosition(new Date('2025-03-20T00:07:00Z'), 0, 0);
  assert.ok(midnight.elevation < -80, `midnight elevation ${midnight.elevation}`);

  const manilaMorning = solarPosition(new Date('2026-11-26T02:00:00Z'), 14.6, 121.0);
  assert.ok(manilaMorning.elevation > 30 && manilaMorning.elevation < 70);
  assert.ok(manilaMorning.azimuth > 90 && manilaMorning.azimuth < 200, 'morning sun in the east/south-east');
});

test('nextSunEvents finds sunrise and sunset within a day', () => {
  const { sunrise, sunset } = nextSunEvents(new Date('2026-11-26T02:00:00Z'), 14.6, 121.0);
  assert.ok(sunrise instanceof Date && sunset instanceof Date);
  // Manila sunset ~17:25 local (09:25Z), sunrise ~06:05 local (22:05Z previous UTC day)
  assert.ok(Math.abs(sunset.getUTCHours() + sunset.getUTCMinutes() / 60 - 9.4) < 0.5);
  assert.ok(sunrise > sunset);
});

test('estimateLocation and skyState produce sensible day/night palettes', () => {
  assert.equal(estimateLocation('Asia/Manila').label, 'Manila');
  const fallback = estimateLocation('Unknown/Zone', -480);
  assert.equal(fallback.lon, 120);
  assert.equal(mixColor('#000000', '#ffffff', 0.5), '#808080');

  const day = skyState(45);
  const night = skyState(-25);
  assert.ok(day.day > 0.99 && night.day < 0.01);
  assert.ok(day.sunIntensity > 2 && night.sunIntensity === 0);
  assert.ok(night.lampFactor > 0.99 && day.lampFactor < 0.01);
  assert.ok(night.starOpacity > 0.99 && day.starOpacity < 0.01);
  assert.equal(night.isNight, true);
});
