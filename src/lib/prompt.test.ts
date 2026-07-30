import { describe, expect, it } from 'vitest';
import { buildRedesignPrompt } from './prompt';

describe('buildRedesignPrompt', () => {
  it('contains preservation and hallucination-prevention constraints', () => {
    const prompt = buildRedesignPrompt({
      url: 'https://example.com',
      pageTitle: 'Example',
      instructions: 'Make it premium.'
    });

    expect(prompt).toContain('Use the provided screenshot as the source of truth.');
    expect(prompt).toContain('Preserve the original website text');
    expect(prompt).toContain('Do not invent new copy');
    expect(prompt).toContain('not a poster');
    expect(prompt).toContain('Make it premium.');
    expect(prompt).toContain('primary visual art direction');
    expect(prompt).toContain('clearly visible through the page palette');
  });
});
