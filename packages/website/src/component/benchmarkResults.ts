import { clsx } from 'clsx'
import { Array, Schema } from 'effect'
import { type Html, inertHtml as ih } from 'foldkit/html'

import summaryJson from '../../../../internal/js-framework-benchmark/results/2026-10-30/summary.json'
import type { islandAttributes } from '../markdown/islandAttributes'

const SummaryRow = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  values: Schema.Array(Schema.Number),
})

const Summary = Schema.Struct({
  columns: Schema.Array(
    Schema.Struct({ name: Schema.String, version: Schema.String }),
  ),
  cpu: Schema.Array(SummaryRow),
  memory: Schema.Array(SummaryRow),
})

const summary = Schema.decodeSync(Summary)(summaryJson)
if (
  Array.some(
    [...summary.cpu, ...summary.memory],
    row => row.values.length !== summary.columns.length,
  )
) {
  throw new Error('Each benchmark row must have one value per framework')
}

const CPU_DECIMAL_PLACES = 1
const MEMORY_DECIMAL_PLACES = 2

type BenchmarkKind = typeof islandAttributes.BenchmarkResults.Type.kind

const numericCellClassName = (name: string): string =>
  clsx(
    'min-w-[4rem] px-2 py-3 text-right tabular-nums whitespace-nowrap',
    name === 'Foldkit' && 'bg-accent-100/60 dark:bg-accent-900/20',
  )

export const view = (kind: BenchmarkKind): Html => {
  const isCPU = kind === 'CPU'
  const rows = isCPU ? summary.cpu : summary.memory
  const digits = isCPU ? CPU_DECIMAL_PLACES : MEMORY_DECIMAL_PLACES
  const label = isCPU
    ? 'Table benchmark median total duration in milliseconds'
    : 'Table benchmark median browser memory in mebibytes'
  const firstColumn = isCPU ? 'Operation (ms)' : 'Measurement (MiB)'

  return ih.div(
    [
      ih.Class(
        'overflow-x-auto overscroll-x-none mb-6 rounded-lg border border-gray-200 dark:border-gray-800',
      ),
      ih.Role('region'),
      ih.AriaLabel(label),
      ih.Tabindex(0),
    ],
    [
      ih.table(
        [
          ih.Class(
            'w-full min-w-[40rem] text-sm text-gray-800 dark:text-gray-200',
          ),
          ih.AriaLabel(label),
        ],
        [
          ih.thead(
            [
              ih.Class(
                'border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white',
              ),
            ],
            [
              ih.tr(
                [],
                [
                  ih.th(
                    [
                      ih.Scope('col'),
                      ih.Class(
                        'sticky left-0 z-10 min-w-[10rem] bg-gray-50 px-3 py-3 text-left font-semibold dark:bg-gray-950',
                      ),
                    ],
                    [firstColumn],
                  ),
                  ...Array.map(summary.columns, ({ name, version }) =>
                    ih.th(
                      [
                        ih.Scope('col'),
                        ih.AriaLabel(`${name} ${version}`),
                        ih.Class(numericCellClassName(name)),
                      ],
                      [
                        ih.span([ih.Class('block font-semibold')], [name]),
                        ih.span(
                          [
                            ih.Class(
                              'block text-xs font-normal text-gray-600 dark:text-gray-400',
                            ),
                          ],
                          [` ${version}`],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          ih.tbody(
            [],
            Array.map(rows, ({ id, label, values }) =>
              ih.keyed('tr')(
                id,
                [
                  ih.Class(
                    'border-b border-gray-200 last:border-b-0 dark:border-gray-800',
                  ),
                ],
                [
                  ih.th(
                    [
                      ih.Scope('row'),
                      ih.Class(
                        'sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left font-normal dark:bg-gray-950',
                      ),
                    ],
                    [label],
                  ),
                  ...Array.map(
                    Array.zip(summary.columns, values),
                    ([{ name }, value]) =>
                      ih.td(
                        [ih.Class(numericCellClassName(name))],
                        [value.toFixed(digits)],
                      ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )
}
