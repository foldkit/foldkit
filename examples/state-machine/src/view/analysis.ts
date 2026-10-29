import { clsx } from 'clsx'
import { Array } from 'effect'
import type { Html } from 'foldkit/html'

import * as Icon from '../icon'
import { checkoutMachine } from '../machine'
import { type Model } from '../model'

export const formatTags = (tags: ReadonlyArray<string>): string =>
  Array.match(tags, {
    onEmpty: () => 'None',
    onNonEmpty: Array.join(', '),
  })

export const transitionLogView = (
  model: Model,
  h: ApplicationViewBuilder,
): Html => {
  const transitionLogClassName =
    'border-l-2 border-orange-700 pl-3 font-mono text-xs leading-5 text-stone-300 lg:col-span-3'

  return Array.match(model.transitionLog, {
    onEmpty: () =>
      h.div(
        [h.Role('status'), h.Class(transitionLogClassName)],
        ['Waiting for the first checkout event'],
      ),
    onNonEmpty: transitionLog =>
      h.ol(
        [
          h.Role('log'),
          h.Class(clsx(transitionLogClassName, 'max-h-40 overflow-y-auto')),
        ],
        Array.map(transitionLog, entry =>
          h.keyed('li')(String(entry.id), [], [entry.summary]),
        ),
      ),
  })
}

export const DEAD_TRANSITIONS = checkoutMachine.deadTransitions()
export const UNREACHABLE_STATE_TAGS = checkoutMachine.unreachableStates()
export const MERMAID_DEFINITION = checkoutMachine.toMermaid()

export const analysisView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.section(
    [
      h.AriaLabel('State machine inspector'),
      h.Class('border border-stone-800 bg-stone-900 text-stone-100'),
    ],
    [
      h.div(
        [h.Class('grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-3 lg:items-start')],
        [
          h.div(
            [h.Class('lg:col-span-2')],
            [
              h.div(
                [h.Class('flex items-center gap-2 text-orange-300')],
                [
                  Icon.codeBracket(),
                  h.div(
                    [h.Class('text-xs font-bold uppercase tracking-widest')],
                    ['Developer view'],
                  ),
                ],
              ),
              h.h2(
                [h.Class('mt-3 font-serif text-2xl')],
                ['State machine inspector'],
              ),
              h.p(
                [h.Class('mt-2 max-w-2xl text-sm leading-6 text-stone-400')],
                [
                  'The storefront below is driven by the same explicit machine shown here. Every interaction produces a Message and a deterministic transition.',
                ],
              ),
            ],
          ),
          h.dl(
            [h.Class('grid grid-cols-2 gap-x-6 gap-y-2 text-xs')],
            [
              h.div(
                [],
                [
                  h.dt([h.Class('text-stone-400')], ['Unreachable']),
                  h.dd(
                    [h.Class('mt-1 font-mono text-stone-100')],
                    [formatTags(UNREACHABLE_STATE_TAGS)],
                  ),
                ],
              ),
              h.div(
                [],
                [
                  h.dt([h.Class('text-stone-400')], ['Dead transitions']),
                  h.dd(
                    [h.Class('mt-1 font-mono text-stone-100')],
                    [String(DEAD_TRANSITIONS.length)],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-5 border-t border-stone-700 px-5 py-5 sm:px-7')],
        [
          h.div(
            [h.Class('grid gap-3 lg:grid-cols-4 lg:items-start')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-400',
                  ),
                ],
                ['Recent transitions'],
              ),
              transitionLogView(model, h),
            ],
          ),
          h.ol(
            [h.AriaLabel('Machine states'), h.Class('flex flex-wrap gap-2')],
            Array.map(checkoutMachine.stateTags, stateTag => {
              const isActive = model.checkout._tag === stateTag

              return h.keyed('li')(
                stateTag,
                [
                  h.Class(
                    clsx('border px-2.5 py-1.5 font-mono text-xs', {
                      'border-orange-300 bg-orange-950 text-stone-100':
                        isActive,
                      'border-stone-700 text-stone-400': !isActive,
                    }),
                  ),
                ],
                [stateTag],
              )
            }),
          ),
        ],
      ),
      h.div(
        [h.Class('border-t border-stone-700')],
        [
          h.h3(
            [
              h.Class(
                'px-5 py-4 text-xs font-bold uppercase tracking-widest text-stone-400 sm:px-7',
              ),
            ],
            ['Mermaid definition'],
          ),
          h.pre(
            [
              h.Class(
                'max-h-96 overflow-auto border-t border-stone-700 bg-stone-950 p-5 font-mono text-xs leading-5 text-stone-300 sm:p-7',
              ),
            ],
            [MERMAID_DEFINITION],
          ),
        ],
      ),
    ],
  )
import type { ApplicationViewBuilder } from '../composition'
