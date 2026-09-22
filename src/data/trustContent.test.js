import { describe, expect, it } from 'vitest';
import {
  HEALTH_SECTIONS,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  TRUST_PUBLICATION_DATE,
} from './trustContent';

const textOf = (value) => JSON.stringify(value);

describe('Trust & Safety publication content', () => {
  it('publishes all 9 Privacy Policy sections and the approved camera and data-mode disclosures', () => {
    expect(TRUST_PUBLICATION_DATE).toBe('22 September 2026');
    expect(PRIVACY_SECTIONS).toHaveLength(9);
    expect(PRIVACY_SECTIONS.map((section) => section.title)).toEqual([
      'Who we are',
      'Camera usage: nothing is recorded or stored',
      'What information we collect',
      'Where your data is stored',
      'Third party services we use',
      'Your rights and choices',
      'Data retention',
      'Contact us',
      'Changes to this policy',
    ]);
    const privacyText = textOf(PRIVACY_SECTIONS);
    expect(privacyText).toContain('locally in your browser');
    expect(privacyText).toContain('not uploaded');
    expect(privacyText).toContain('If you use Guest Mode');
    expect(privacyText).toContain('If you sign in with Google');
    expect(privacyText).toContain('If you join the leaderboard');
    expect(privacyText).toContain('Leaderboard participation is off by default');
  });

  it('publishes all 13 Terms sections with real routes to Privacy and Health', () => {
    expect(TERMS_SECTIONS).toHaveLength(13);
    expect(TERMS_SECTIONS.map((section) => section.title)).toEqual([
      'Acceptance of terms',
      'What BITS in Motion is',
      'Who can use this application',
      'Your account',
      'Using the camera coach',
      'Your responsibilities',
      'No guarantee of accuracy',
      'Availability of the service',
      'Limitation of liability',
      'Ownership',
      'Changes to these terms',
      'Governing law',
      'Contact us',
    ]);
    expect(TERMS_SECTIONS.flatMap((section) => section.links || [])).toEqual([
      { label: 'Privacy Policy', route: 'privacy' },
      { label: 'Health Disclaimer', route: 'health-disclaimer' },
    ]);
    expect(textOf(TERMS_SECTIONS)).toContain('laws of India');
  });

  it('publishes all 8 Health Disclaimer sections, emergency numbers, and semantic safety checklists', () => {
    expect(HEALTH_SECTIONS).toHaveLength(8);
    expect(HEALTH_SECTIONS.map((section) => section.title)).toEqual([
      'This is not medical advice',
      'Talk to a doctor first, if needed',
      'Listen to your body',
      'Preparing your space, especially in a hostel room',
      'Limits of the camera coach',
      'Exercise sensibly',
      'Calorie and fitness estimates',
      'Feedback',
    ]);
    const healthText = textOf(HEALTH_SECTIONS);
    expect(healthText).toContain('call 112');
    expect(healthText).toContain('102');
    expect(healthText).toContain('108');
    expect(healthText).toContain('outside India');
    expect(HEALTH_SECTIONS.find((section) => section.title === 'Listen to your body').bullets.length).toBeGreaterThanOrEqual(4);
    expect(HEALTH_SECTIONS.find((section) => section.title.startsWith('Preparing your space')).bullets.length).toBeGreaterThanOrEqual(5);
    expect(HEALTH_SECTIONS.find((section) => section.title === 'Limits of the camera coach').bullets.length).toBeGreaterThanOrEqual(4);
    expect(HEALTH_SECTIONS.find((section) => section.title === 'Exercise sensibly').bullets.length).toBeGreaterThanOrEqual(5);
  });
});
