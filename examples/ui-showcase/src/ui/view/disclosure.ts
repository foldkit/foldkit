import clsx from 'clsx'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import * as Icon from '../../icon'
import { Message as UiMessage } from '../message'
import type { UiModel } from '../model'

const DISCLOSURE_BASIC_DEMO_ID = 'disclosure-basic-demo'
const DISCLOSURE_ANIMATED_DEMO_ID = 'disclosure-animated-demo'
const DISCLOSURE_COLLAPSED_PREVIEW_DEMO_ID = 'disclosure-collapsed-preview-demo'
const COLLAPSED_PREVIEW_HEIGHT = '6rem'

const PANEL_TEXT =
  'Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.'

const chevron = (isOpen: boolean, h: HtmlBuilder<UiMessage>): Html => {
  return h.span(
    [h.Class(clsx('text-gray-600', { 'rotate-180': isOpen }))],
    [Icon.chevronDown('w-4 h-4')],
  )
}

const buttonContent = (isOpen: boolean, h: HtmlBuilder<UiMessage>): Html => {
  return h.div(
    [h.Class('flex items-center justify-between w-full')],
    [h.span([], ['What is Foldkit?']), chevron(isOpen, h)],
  )
}

const panelText = (h: HtmlBuilder<UiMessage>): Html => {
  return h.p([h.Class('text-gray-800')], [PANEL_TEXT])
}

const collapsedPreviewPanel = (h: HtmlBuilder<UiMessage>): Html =>
  h.div(
    [h.Class('space-y-3 text-base leading-6 text-gray-800')],
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
  )

const subheading = (text: string, h: HtmlBuilder<UiMessage>): Html => {
  return h.h3(
    [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
    [text],
  )
}

export const view = Submodel.defineView<UiModel, UiMessage>(
  (model, h): Html => {
    return h.div(
      [],
      [
        h.h2(
          [h.Class('text-2xl font-bold text-gray-900 mb-6')],
          ['Disclosure'],
        ),

        subheading('Basic', h),
        h.label(
          [
            h.For(Disclosure.buttonId(DISCLOSURE_BASIC_DEMO_ID)),
            h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
          ],
          ['Frequently asked'],
        ),
        Disclosure.view(
          {
            id: DISCLOSURE_BASIC_DEMO_ID,
            isOpen: model.isDisclosureBasicDemoOpen,
            onToggle: isOpen =>
              UiMessage.ToggledDisclosureBasicDemo({ isOpen }),
            toView: attributes =>
              h.div(
                [],
                [
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 text-gray-900 hover:bg-gray-200/50 rounded-lg data-[open]:rounded-b-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none',
                      ),
                    ],
                    [buttonContent(model.isDisclosureBasicDemoOpen, h)],
                  ),
                  model.isDisclosureBasicDemoOpen
                    ? h.div(
                        [
                          ...attributes.panel,
                          h.Class(
                            'px-4 py-3 border-x border-b border-gray-300 rounded-b-lg text-gray-800',
                          ),
                        ],
                        [panelText(h)],
                      )
                    : h.empty,
                ],
              ),
          },
          h,
        ),

        subheading('Animated', h),
        h.label(
          [
            h.For(Disclosure.buttonId(DISCLOSURE_ANIMATED_DEMO_ID)),
            h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
          ],
          ['Frequently asked'],
        ),
        Disclosure.view(
          {
            id: DISCLOSURE_ANIMATED_DEMO_ID,
            isOpen: model.isDisclosureAnimatedDemoOpen,
            onToggle: isOpen =>
              UiMessage.ToggledDisclosureAnimatedDemo({ isOpen }),
            toView: attributes =>
              h.div(
                [h.Class('border border-gray-300 rounded-lg overflow-hidden')],
                [
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition text-gray-900 hover:bg-gray-200/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none',
                      ),
                    ],
                    [buttonContent(model.isDisclosureAnimatedDemoOpen, h)],
                  ),
                  attributes.animatePanel(
                    h.div(
                      [
                        ...attributes.panel,
                        h.Class(
                          'px-4 py-3 border-t border-gray-300 text-gray-800',
                        ),
                      ],
                      [panelText(h)],
                    ),
                  ),
                ],
              ),
          },
          h,
        ),

        subheading('Collapsed preview', h),
        h.p(
          [h.Class('mb-1.5 text-sm font-medium text-gray-900')],
          ['Featured article'],
        ),
        Disclosure.view(
          {
            id: DISCLOSURE_COLLAPSED_PREVIEW_DEMO_ID,
            isOpen: model.isDisclosureCollapsedPreviewDemoOpen,
            onToggle: isOpen =>
              UiMessage.ToggledDisclosureCollapsedPreviewDemo({ isOpen }),
            toView: ({ button, panel, animatePanel }) =>
              h.article(
                [
                  h.Class(
                    'relative overflow-hidden rounded-lg border border-gray-300 bg-white',
                  ),
                ],
                [
                  h.h4(
                    [h.Class('px-4 py-3 text-base font-normal text-gray-900')],
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
                              `border-t border-gray-300 px-4 pt-3 ${model.isDisclosureCollapsedPreviewDemoOpen ? 'pb-20' : 'pb-3'}`,
                            ),
                          ],
                          [collapsedPreviewPanel(h)],
                        ),
                        { peek: COLLAPSED_PREVIEW_HEIGHT },
                      ),
                      ...(model.isDisclosureCollapsedPreviewDemoOpen
                        ? []
                        : [
                            h.div([
                              h.AriaHidden(true),
                              h.Class(
                                'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent',
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
                            'cursor-pointer whitespace-nowrap rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 select-none',
                          ),
                        ],
                        [
                          model.isDisclosureCollapsedPreviewDemoOpen
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
    )
  },
)
