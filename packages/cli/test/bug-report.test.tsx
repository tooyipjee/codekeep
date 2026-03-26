import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { buildBugReportUrl, buildBugReportBody } from '../src/utils/bug-report.js';
import { BugReportView } from '../src/components/BugReportView.js';
import type { CombatState, RunState } from '@codekeep/shared';
import { DEFAULT_SETTINGS } from '../src/components/SettingsView.js';

describe('Bug Report', () => {
  it('generates a valid GitHub issue URL', () => {
    const url = buildBugReportUrl(
      {
        version: '1.0.8',
        screen: 'combat',
        run: { act: 2, gateHp: 15, gateMaxHp: 30, deck: [], seed: 'test123', fragments: 50, relics: [] } as unknown as RunState,
        combat: { turn: 3, phase: 'player', resolve: 2, maxResolve: 3, gateHp: 15, gateMaxHp: 30, gateBlock: 0, hand: [], drawPile: [], discardPile: [], columns: [{ enemies: [], emplacement: null }, { enemies: [], emplacement: null }, { enemies: [], emplacement: null }, { enemies: [], emplacement: null }, { enemies: [], emplacement: null }], seed: 'test123', events: [] } as unknown as CombatState,
        settings: DEFAULT_SETTINGS,
        termCols: 120,
        termRows: 40,
      },
      'Enemies disappear after playing a card',
    );
    expect(url).toContain('https://github.com/tooyipjee/codekeep/issues/new');
    expect(url).toContain('Bug');
    expect(url).toContain('Enemies+disappear');
    expect(url).toContain('labels=bug');
  });

  it('includes game state in report body', () => {
    const body = buildBugReportBody(
      {
        version: '1.0.8',
        screen: 'combat',
        run: { act: 2, gateHp: 15, gateMaxHp: 30, deck: [{ instanceId: 'card-1', defId: 'strike' }], seed: 'abc', fragments: 10, relics: ['shield_relic'], currentNodeId: 'n3' } as unknown as RunState,
        combat: null,
        settings: DEFAULT_SETTINGS,
        termCols: 100,
        termRows: 30,
      },
      'Test bug description',
    );
    expect(body).toContain('Test bug description');
    expect(body).toContain('Act**: 2');
    expect(body).toContain('Gate HP**: 15/30');
    expect(body).toContain('Deck size**: 1');
    expect(body).toContain('Seed**: `abc`');
    expect(body).toContain('shield_relic');
    expect(body).toContain('1.0.8');
    expect(body).toContain('100×30');
    expect(body).toContain('Not in combat');
  });

  it('renders input phase', () => {
    const { lastFrame } = render(
      <BugReportView phase="input" description="my bug" issueUrl={null} fallbackUrl={null} error={null} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('Report a Bug');
    expect(frame).toContain('my bug');
    expect(frame).toContain('Describe the bug');
  });

  it('renders done phase with issue URL (submitted)', () => {
    const { lastFrame } = render(
      <BugReportView phase="done" description="" issueUrl="https://github.com/tooyipjee/codekeep/issues/42" fallbackUrl={null} error={null} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('Bug report submitted');
    expect(frame).toContain('issues/42');
  });

  it('renders done phase with fallback URL when gh fails', () => {
    const { lastFrame } = render(
      <BugReportView phase="done" description="" issueUrl={null} fallbackUrl="https://github.com/tooyipjee/codekeep/issues/new?test" error="gh not authenticated" />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('gh not authenticated');
    expect(frame).toContain('github.com');
  });

  it('renders submitting phase', () => {
    const { lastFrame } = render(
      <BugReportView phase="submitting" description="test" issueUrl={null} fallbackUrl={null} error={null} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('Submitting');
  });
});
