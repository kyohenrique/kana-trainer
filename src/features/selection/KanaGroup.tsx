import { useTranslation } from 'react-i18next'
import {
  kanaPairRows,
  type Category,
  type KanaPair,
} from '../../core/kana/catalog'
import { usePreferences } from '../../shared/preferences/context'
import { Checkbox } from '../../shared/ui/Checkbox'
import { KanaTile } from './KanaTile'
import type { SelectionFeedback } from './feedbackPlan'

function getChecked(
  ids: readonly string[],
  selected: ReadonlySet<string>,
): boolean | 'mixed' {
  const count = ids.filter((id) => selected.has(id)).length
  return count === ids.length ? true : count === 0 ? false : 'mixed'
}

interface Props {
  category: Category
  feedback: SelectionFeedback
  onSelectionChange: (ids: readonly string[], selected: boolean) => void
}

export function KanaGroup({ category, feedback, onSelectionChange }: Props) {
  const { t } = useTranslation()
  const { preferences } = usePreferences()
  const selected = new Set(preferences.selectedPairIds)
  const rows = kanaPairRows.filter((row) => row.category === category)
  const ids = rows.flatMap((row) =>
    row.slots
      .filter((pair): pair is KanaPair => pair !== null)
      .map((pair) => pair.id),
  )
  const title = t(`selection.${category}.title`)

  return (
    <section aria-labelledby={`${category}-heading`}>
      <div className="mb-5 flex min-h-6 items-center gap-2.5">
        <Checkbox
          checked={getChecked(ids, selected)}
          label={t('selection.group', { name: title })}
          onChange={(checked) => onSelectionChange(ids, checked)}
        />
        <h2 id={`${category}-heading`} className="text-sm font-medium text-ink">
          {title}
        </h2>
      </div>
      <div className="space-y-1">
        {rows.map((row) => {
          const rowIds = row.slots
            .filter((pair): pair is KanaPair => pair !== null)
            .map((pair) => pair.id)
          return (
            <div key={row.id} className="flex items-center gap-2.5">
              <Checkbox
                checked={getChecked(rowIds, selected)}
                label={t('selection.row', {
                  row: row.label,
                  script: t(`selection.${preferences.mode}`),
                  category: title,
                })}
                onChange={(checked) => onSelectionChange(rowIds, checked)}
              />
              <div
                className={`grid min-w-0 flex-1 gap-2 pr-1 pb-1 ${row.slots.length === 1 ? 'grid-cols-1' : category === 'combinations' ? 'grid-cols-3' : 'grid-cols-5'}`}
              >
                {row.slots.map((pair, position) =>
                  pair === null ? (
                    <span key={`empty-${position}`} aria-hidden="true" />
                  ) : (
                    <KanaTile
                      key={pair.id}
                      pair={pair}
                      mode={preferences.mode}
                      selected={selected.has(pair.id)}
                      feedbackRevision={feedback.revision}
                      feedbackDelay={feedback.delays.get(pair.id)}
                      onToggle={() =>
                        onSelectionChange([pair.id], !selected.has(pair.id))
                      }
                    />
                  ),
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
