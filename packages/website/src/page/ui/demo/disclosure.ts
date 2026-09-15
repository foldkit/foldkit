import type { HtmlBuilder } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { Icon } from '../../../icon'
import { Message } from '../message'

export const DISCLOSURE_DEMO_ID = 'disclosure-demo'
export const DISCLOSURE_COLLAPSED_PREVIEW_DEMO_ID =
  'disclosure-collapsed-preview-demo'

const COLLAPSED_PREVIEW_HEIGHT = '6rem'

// VIEW

export const basicDemo = (
  isDisclosureDemoOpen: boolean,
  h: HtmlBuilder<Message>,
) => {
  const chevron = (isOpen: boolean) =>
    h.span(
      [
        h.Class(
          `text-gray-600 dark:text-gray-300 ${isOpen ? 'rotate-180' : ''}`,
        ),
      ],
      [Icon.chevronDown('w-4 h-4')],
    )

  return [
    h.div(
      [h.Class('flex w-full max-w-lg flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Disclosure.buttonId(DISCLOSURE_DEMO_ID)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['Frequently asked'],
        ),
        Disclosure.view(
          {
            id: DISCLOSURE_DEMO_ID,
            isOpen: isDisclosureDemoOpen,
            onToggle: isOpen => Message.ToggledDisclosureDemo({ isOpen }),
            toView: attributes =>
              h.div(
                [
                  h.Class(
                    'overflow-hidden rounded-lg border border-gray-300 bg-cream dark:border-gray-700 dark:bg-gray-900',
                  ),
                ],
                [
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none',
                      ),
                    ],
                    [
                      h.div(
                        [h.Class('flex items-center justify-between w-full')],
                        [
                          h.span([], ['What is Foldkit?']),
                          chevron(isDisclosureDemoOpen),
                        ],
                      ),
                    ],
                  ),
                  attributes.animatePanel(
                    h.div(
                      [
                        ...attributes.panel,
                        h.Class(
                          'px-4 py-3 border-t border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200',
                        ),
                      ],
                      [
                        h.p(
                          [h.Class('text-gray-800 dark:text-gray-200')],
                          [
                            'Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.',
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
          },
          h,
        ),
      ],
    ),
  ]
}

export const collapsedPreviewDemo = (
  isDisclosureCollapsedPreviewDemoOpen: boolean,
  h: HtmlBuilder<Message>,
) => [
  h.div(
    [h.Class('flex w-full max-w-lg flex-col gap-1.5')],
    [
      h.p(
        [h.Class('text-sm font-medium text-gray-900 dark:text-white')],
        ['Featured article'],
      ),
      Disclosure.view(
        {
          id: DISCLOSURE_COLLAPSED_PREVIEW_DEMO_ID,
          isOpen: isDisclosureCollapsedPreviewDemoOpen,
          onToggle: isOpen =>
            Message.ToggledDisclosureCollapsedPreviewDemo({ isOpen }),
          toView: ({ button, panel, animatePanel }) =>
            h.article(
              [
                h.Class(
                  'relative overflow-hidden rounded-lg border border-gray-300 bg-cream dark:border-gray-700 dark:bg-gray-900',
                ),
              ],
              [
                h.h4(
                  [
                    h.Class(
                      'px-4 py-3 text-base font-normal text-gray-900 dark:text-white',
                    ),
                  ],
                  ['Why the Elm Architecture scales'],
                ),
                h.div(
                  [h.Class('relative')],
                  [
                    animatePanel(
                      h.div(
                        [
                          ...panel,
                          h.Class(
                            `space-y-3 border-t border-gray-300 px-4 pt-3 text-base leading-6 text-gray-800 dark:border-gray-700 dark:text-gray-200 ${isDisclosureCollapsedPreviewDemoOpen ? 'pb-20' : 'pb-3'}`,
                          ),
                        ],
                        [
                          h.p(
                            [],
                            [
                              'Foldkit keeps application state in one Model. Messages record facts, and update decides how each fact changes that Model.',
                            ],
                          ),
                          h.p(
                            [],
                            [
                              'Commands describe one-time work for the Runtime, so network requests, focus changes, and storage writes stay outside state transitions.',
                            ],
                          ),
                          h.p(
                            [],
                            [
                              'That separation leaves every transition visible in one place and gives tests the same inputs and outputs the application uses.',
                            ],
                          ),
                        ],
                      ),
                      { peek: COLLAPSED_PREVIEW_HEIGHT },
                    ),
                    ...(isDisclosureCollapsedPreviewDemoOpen
                      ? []
                      : [
                          h.div([
                            h.AriaHidden(true),
                            h.Class(
                              'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-cream to-transparent dark:from-gray-900',
                            ),
                          ]),
                        ]),
                  ],
                ),
                h.div(
                  [
                    h.Class(
                      'absolute inset-x-0 bottom-4 flex justify-center px-4',
                    ),
                  ],
                  [
                    h.button(
                      [
                        ...button,
                        h.Class(
                          'cursor-pointer whitespace-nowrap rounded-full border border-gray-300 bg-cream px-5 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 select-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800',
                        ),
                      ],
                      [
                        isDisclosureCollapsedPreviewDemoOpen
                          ? 'Show less'
                          : 'Read more',
                      ],
                    ),
                  ],
                ),
              ],
            ),
        },
        h,
      ),
    ],
  ),
]
