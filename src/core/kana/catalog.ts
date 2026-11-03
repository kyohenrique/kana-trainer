export type Script = 'hiragana' | 'katakana'
export type ScriptMode = Script | 'both'
export type Category = 'basic' | 'marks' | 'combinations'

export interface Kana {
  readonly id: string
  readonly pairId: string
  readonly script: Script
  readonly category: Category
  readonly glyph: string
  readonly reading: string
  readonly acceptedReadings: readonly string[]
}

export interface KanaPair {
  readonly id: string
  readonly category: Category
  readonly hiragana: Kana
  readonly katakana: Kana
}

export interface KanaPairRow {
  readonly id: string
  readonly category: Category
  readonly label: string
  readonly slots: readonly (KanaPair | null)[]
}

export interface KanaRow {
  readonly id: string
  readonly script: Script
  readonly category: Category
  readonly label: string
  readonly slots: readonly (Kana | null)[]
}

type Entry = readonly [glyph: string, reading: string, ...aliases: string[]]
interface RowSeed {
  id: string
  category: Category
  label: string
  entries: readonly (Entry | null)[]
}

// Standard modern kana; historical kana and extended loanword combinations
// are outside this catalog. Each contracted syllable is one practice item.
const seeds: readonly RowSeed[] = [
  {
    id: 'a',
    category: 'basic',
    label: 'A',
    entries: [
      ['あ', 'a'],
      ['い', 'i'],
      ['う', 'u'],
      ['え', 'e'],
      ['お', 'o'],
    ],
  },
  {
    id: 'k',
    category: 'basic',
    label: 'K',
    entries: [
      ['か', 'ka'],
      ['き', 'ki'],
      ['く', 'ku'],
      ['け', 'ke'],
      ['こ', 'ko'],
    ],
  },
  {
    id: 's',
    category: 'basic',
    label: 'S',
    entries: [
      ['さ', 'sa'],
      ['し', 'shi', 'si'],
      ['す', 'su'],
      ['せ', 'se'],
      ['そ', 'so'],
    ],
  },
  {
    id: 't',
    category: 'basic',
    label: 'T',
    entries: [
      ['た', 'ta'],
      ['ち', 'chi', 'ti'],
      ['つ', 'tsu', 'tu'],
      ['て', 'te'],
      ['と', 'to'],
    ],
  },
  {
    id: 'n',
    category: 'basic',
    label: 'N',
    entries: [
      ['な', 'na'],
      ['に', 'ni'],
      ['ぬ', 'nu'],
      ['ね', 'ne'],
      ['の', 'no'],
    ],
  },
  {
    id: 'h',
    category: 'basic',
    label: 'H',
    entries: [
      ['は', 'ha'],
      ['ひ', 'hi'],
      ['ふ', 'fu', 'hu'],
      ['へ', 'he'],
      ['ほ', 'ho'],
    ],
  },
  {
    id: 'm',
    category: 'basic',
    label: 'M',
    entries: [
      ['ま', 'ma'],
      ['み', 'mi'],
      ['む', 'mu'],
      ['め', 'me'],
      ['も', 'mo'],
    ],
  },
  {
    id: 'y',
    category: 'basic',
    label: 'Y',
    entries: [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']],
  },
  {
    id: 'r',
    category: 'basic',
    label: 'R',
    entries: [
      ['ら', 'ra'],
      ['り', 'ri'],
      ['る', 'ru'],
      ['れ', 're'],
      ['ろ', 'ro'],
    ],
  },
  {
    id: 'w',
    category: 'basic',
    label: 'W',
    entries: [['わ', 'wa'], null, null, null, ['を', 'wo', 'o']],
  },
  { id: 'nasal', category: 'basic', label: 'N', entries: [['ん', 'n']] },
  {
    id: 'g',
    category: 'marks',
    label: 'G',
    entries: [
      ['が', 'ga'],
      ['ぎ', 'gi'],
      ['ぐ', 'gu'],
      ['げ', 'ge'],
      ['ご', 'go'],
    ],
  },
  {
    id: 'z',
    category: 'marks',
    label: 'Z',
    entries: [
      ['ざ', 'za'],
      ['じ', 'ji', 'zi'],
      ['ず', 'zu'],
      ['ぜ', 'ze'],
      ['ぞ', 'zo'],
    ],
  },
  {
    id: 'd',
    category: 'marks',
    label: 'D',
    entries: [
      ['だ', 'da'],
      ['ぢ', 'ji', 'di', 'zi'],
      ['づ', 'zu', 'du', 'dzu'],
      ['で', 'de'],
      ['ど', 'do'],
    ],
  },
  {
    id: 'b',
    category: 'marks',
    label: 'B',
    entries: [
      ['ば', 'ba'],
      ['び', 'bi'],
      ['ぶ', 'bu'],
      ['べ', 'be'],
      ['ぼ', 'bo'],
    ],
  },
  {
    id: 'p',
    category: 'marks',
    label: 'P',
    entries: [
      ['ぱ', 'pa'],
      ['ぴ', 'pi'],
      ['ぷ', 'pu'],
      ['ぺ', 'pe'],
      ['ぽ', 'po'],
    ],
  },
  {
    id: 'ky',
    category: 'combinations',
    label: 'KY',
    entries: [
      ['きゃ', 'kya'],
      ['きゅ', 'kyu'],
      ['きょ', 'kyo'],
    ],
  },
  {
    id: 'sh',
    category: 'combinations',
    label: 'SH',
    entries: [
      ['しゃ', 'sha', 'sya'],
      ['しゅ', 'shu', 'syu'],
      ['しょ', 'sho', 'syo'],
    ],
  },
  {
    id: 'ch',
    category: 'combinations',
    label: 'CH',
    entries: [
      ['ちゃ', 'cha', 'tya'],
      ['ちゅ', 'chu', 'tyu'],
      ['ちょ', 'cho', 'tyo'],
    ],
  },
  {
    id: 'ny',
    category: 'combinations',
    label: 'NY',
    entries: [
      ['にゃ', 'nya'],
      ['にゅ', 'nyu'],
      ['にょ', 'nyo'],
    ],
  },
  {
    id: 'hy',
    category: 'combinations',
    label: 'HY',
    entries: [
      ['ひゃ', 'hya'],
      ['ひゅ', 'hyu'],
      ['ひょ', 'hyo'],
    ],
  },
  {
    id: 'my',
    category: 'combinations',
    label: 'MY',
    entries: [
      ['みゃ', 'mya'],
      ['みゅ', 'myu'],
      ['みょ', 'myo'],
    ],
  },
  {
    id: 'ry',
    category: 'combinations',
    label: 'RY',
    entries: [
      ['りゃ', 'rya'],
      ['りゅ', 'ryu'],
      ['りょ', 'ryo'],
    ],
  },
  {
    id: 'gy',
    category: 'combinations',
    label: 'GY',
    entries: [
      ['ぎゃ', 'gya'],
      ['ぎゅ', 'gyu'],
      ['ぎょ', 'gyo'],
    ],
  },
  {
    id: 'j',
    category: 'combinations',
    label: 'J',
    entries: [
      ['じゃ', 'ja', 'jya', 'zya'],
      ['じゅ', 'ju', 'jyu', 'zyu'],
      ['じょ', 'jo', 'jyo', 'zyo'],
    ],
  },
  {
    id: 'by',
    category: 'combinations',
    label: 'BY',
    entries: [
      ['びゃ', 'bya'],
      ['びゅ', 'byu'],
      ['びょ', 'byo'],
    ],
  },
  {
    id: 'py',
    category: 'combinations',
    label: 'PY',
    entries: [
      ['ぴゃ', 'pya'],
      ['ぴゅ', 'pyu'],
      ['ぴょ', 'pyo'],
    ],
  },
]

export const scripts: readonly Script[] = ['hiragana', 'katakana']
export const categories: readonly Category[] = [
  'basic',
  'marks',
  'combinations',
]

function toKatakana(hiragana: string): string {
  return [...hiragana]
    .map((character) => String.fromCharCode(character.charCodeAt(0) + 0x60))
    .join('')
}

export const kanaPairRows: readonly KanaPairRow[] = seeds.map((seed) => ({
  id: seed.id,
  category: seed.category,
  label: seed.label,
  slots: seed.entries.map((entry): KanaPair | null => {
    if (entry === null) return null
    const [hiragana, reading, ...aliases] = entry
    // Pair by character, not reading: じ and ぢ must remain separate choices.
    const pairId = `kana:${hiragana}`
    function createKana(script: Script): Kana {
      const glyph = script === 'hiragana' ? hiragana : toKatakana(hiragana)
      return {
        id: `${script}:${glyph}`,
        pairId,
        script,
        category: seed.category,
        glyph,
        reading,
        acceptedReadings: [reading, ...aliases],
      }
    }
    return {
      id: pairId,
      category: seed.category,
      hiragana: createKana('hiragana'),
      katakana: createKana('katakana'),
    }
  }),
}))

export const kanaRows: readonly KanaRow[] = scripts.flatMap((script) =>
  kanaPairRows.map((row) => ({
    id: `${script}:${row.id}`,
    script,
    category: row.category,
    label: row.label,
    slots: row.slots.map((pair) => pair?.[script] ?? null),
  })),
)

export const kanaPairs: readonly KanaPair[] = kanaPairRows.flatMap((row) =>
  row.slots.filter((pair): pair is KanaPair => pair !== null),
)

export const kanaPairIds: ReadonlySet<string> = new Set(
  kanaPairs.map((pair) => pair.id),
)

export const kanaCatalog: readonly Kana[] = kanaRows.flatMap((row) =>
  row.slots.filter((kana): kana is Kana => kana !== null),
)
export const kanaIds: ReadonlySet<string> = new Set(
  kanaCatalog.map((kana) => kana.id),
)

export function matchesMode(script: Script, mode: ScriptMode): boolean {
  return mode === 'both' || mode === script
}

export function defaultSelection(): string[] {
  return kanaPairs
    .filter((pair) => pair.category === 'basic')
    .map((pair) => pair.id)
}

export function selectedKana(
  selectedPairIds: readonly string[],
  mode: ScriptMode,
): readonly Kana[] {
  const selected = new Set(selectedPairIds)
  return kanaCatalog.filter(
    (kana) => selected.has(kana.pairId) && matchesMode(kana.script, mode),
  )
}
