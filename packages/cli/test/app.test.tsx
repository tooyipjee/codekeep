import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { App } from '../src/app.js';

describe('App', () => {
  it('renders without crashing', () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('The Pale');
  });

  it('shows game title', () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('The Pale');
  });
});
