import type { pt } from './pt'

export const en = {
  app: {
    tagline: 'Practice kana over a cup of coffee.',
    title: 'Choose your kana · Kana Trainer',
    description: 'Choose hiragana and katakana to practice at your own pace.',
    skip: 'Skip to selection',
    language: 'Language',
    home: 'Kana Trainer — kana selection',
  },
  selection: {
    title: 'Choose your kana.',
    writing: 'Writing system',
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    both: 'Both',
    group: 'Select {{name}} group',
    row: 'Select {{script}} row {{row}} — {{category}}',
    kana: '{{glyph}} ({{reading}}), {{script}}',
    selected_zero: 'kana selected',
    selected_one: 'kana selected',
    selected_other: 'kana selected',
    notSaved:
      'Your browser could not save your choices. They apply to this visit.',
    empty: 'Select at least one kana to build your practice set.',
    comingSoon: 'Practice coming soon',
    basic: { title: 'Basics' },
    marks: { title: 'Variations' },
    combinations: { title: 'Combinations' },
  },
} satisfies typeof pt
