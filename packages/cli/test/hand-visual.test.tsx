import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { CardHand } from '../src/components/CardHand.js';
import type { CardInstance } from '@codekeep/shared';

function makeHand(count: number): CardInstance[] {
  const ids = ['strike', 'guard', 'bolster', 'spark', 'reinforce', 'barrage', 'mend', 'lookout', 'slash', 'rally'];
  return Array.from({ length: count }, (_, i) => ({
    instanceId: `card-${i + 1}`,
    defId: ids[i % ids.length],
  }));
}

describe('CardHand overflow', () => {
  for (const count of [5, 6, 7, 8, 9]) {
    it(`renders ${count} cards without exceeding 100 columns`, () => {
      const hand = makeHand(count);
      const { lastFrame } = render(
        <CardHand hand={hand} selectedIndex={0} resolve={3} />,
      );
      const frame = lastFrame()!;
      const lines = frame.split('\n');

      for (const line of lines) {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(100);
      }

      expect(frame).toContain('Strike');
    });

    it(`${count} cards: card names are visible`, () => {
      const hand = makeHand(count);
      const { lastFrame } = render(
        <CardHand hand={hand} selectedIndex={2} resolve={3} />,
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Strike');
      expect(frame).toContain('Guard');
      if (count <= 7) {
        expect(frame).toContain('Bolster');
      } else {
        expect(frame).toContain('Bolst');
      }
    });
  }

  it('10 cards still renders without crashing', () => {
    const hand = makeHand(10);
    const { lastFrame } = render(
      <CardHand hand={hand} selectedIndex={0} resolve={3} />,
    );
    const frame = lastFrame()!;
    expect(frame).toBeTruthy();
    expect(frame).toContain('Strike');
  });
});
