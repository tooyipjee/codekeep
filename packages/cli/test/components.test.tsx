import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { HUD } from '../src/components/HUD.js';
import { StructurePicker } from '../src/components/StructurePicker.js';
import { ErrorBoundary } from '../src/components/ErrorBoundary.js';
import type { Resources, PlacedStructure } from '@codekeep/shared';

const baseResources: Resources = { gold: 100, wood: 50, stone: 30 };

describe('HUD component', () => {
  it('renders resources in non-compact mode', () => {
    const { lastFrame } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message=""
      />,
    );
    const frame = lastFrame();
    expect(frame).toContain('100');
    expect(frame).toContain('50');
    expect(frame).toContain('30');
    expect(frame).toContain('CodeKeep');
  });

  it('renders message text', () => {
    const { lastFrame } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message="Test message"
      />,
    );
    expect(lastFrame()).toContain('Test message');
  });

  it('always reserves space even with no message or structure', () => {
    const { lastFrame: noStruct } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message=""
        structureAtCursor={null}
      />,
    );
    const { lastFrame: withStruct } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message="test"
        structureAtCursor={{
          id: 'wall-1-1', kind: 'wall', level: 1,
          pos: { x: 1, y: 1 }, placedAtUnixMs: Date.now(),
        }}
      />,
    );
    const linesNoStruct = noStruct().split('\n').length;
    const linesWithStruct = withStruct().split('\n').length;
    expect(linesNoStruct).toBe(linesWithStruct);
  });

  it('shows structure info when hovering over structure', () => {
    const structure: PlacedStructure = {
      id: 'wall-5-5',
      kind: 'wall',
      level: 1,
      pos: { x: 5, y: 5 },
      placedAtUnixMs: Date.now(),
    };
    const { lastFrame } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message=""
        structureAtCursor={structure}
      />,
    );
    expect(lastFrame()).toContain('Stone Wall');
    expect(lastFrame()).toContain('Lv.1');
    expect(lastFrame()).toContain('Lv.2');
  });

  it('shows MAX for level 3 structures', () => {
    const structure: PlacedStructure = {
      id: 'wall-5-5',
      kind: 'wall',
      level: 3,
      pos: { x: 5, y: 5 },
      placedAtUnixMs: Date.now(),
    };
    const { lastFrame } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message=""
        structureAtCursor={structure}
      />,
    );
    expect(lastFrame()).toContain('MAX');
  });

  it('renders compact mode', () => {
    const { lastFrame } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message=""
        compact
      />,
    );
    const frame = lastFrame();
    expect(frame).toContain('100');
    expect(frame).toContain('WL');
  });

  it('shows fragment count when present', () => {
    const { lastFrame } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message=""
        fragmentCount={3}
      />,
    );
    expect(lastFrame()).toContain('3 on ground');
  });

  it('highlights error messages starting with !', () => {
    const { lastFrame } = render(
      <HUD
        resources={baseResources}
        selectedStructure="wall"
        message="!Not enough resources"
      />,
    );
    expect(lastFrame()).toContain('!Not enough resources');
  });
});

describe('StructurePicker component', () => {
  it('renders all structure types', () => {
    const { lastFrame } = render(
      <StructurePicker selected="wall" />,
    );
    const frame = lastFrame();
    expect(frame).toContain('Stone Wall');
    expect(frame).toContain('Bear Trap');
    expect(frame).toContain('Treasury');
    expect(frame).toContain('Ward');
    expect(frame).toContain('Watchtower');
    expect(frame).toContain('Archer Tower');
  });

  it('highlights selected structure', () => {
    const { lastFrame } = render(
      <StructurePicker selected="archerTower" />,
    );
    expect(lastFrame()).toContain('▸');
  });

  it('shows cost for selected structure', () => {
    const { lastFrame } = render(
      <StructurePicker selected="wall" />,
    );
    expect(lastFrame()).toContain('12');
  });
});

describe('ErrorBoundary component', () => {
  it('renders children when no error', () => {
    const { lastFrame } = render(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>,
    );
    expect(lastFrame()).toContain('All good');
  });

  it('renders error message when child throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test crash');
    };
    const { lastFrame } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(lastFrame()).toContain('Test crash');
    expect(lastFrame()).toContain('Something went wrong');
  });
});
