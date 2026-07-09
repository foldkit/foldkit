import clsx from 'clsx'
import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import * as Icon from '../../icon'
import {
  ToggledDisclosureAnimatedDemo,
  ToggledDisclosureBasicDemo,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const DISCLOSURE_BASIC_DEMO_ID = 'disclosure-basic-demo'
const DISCLOSURE_ANIMATED_DEMO_ID = 'disclosure-animated-demo'

const basicButtonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 text-gray-900 hover:bg-gray-200/50 rounded-lg data-[open]:rounded-b-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none'

const basicPanelClassName =
  'px-4 py-3 border-x border-b border-gray-300 rounded-b-lg text-gray-800'

const animatedContainerClassName =
  'border border-gray-300 rounded-lg overflow-hidden'

const animatedButtonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition text-gray-900 hover:bg-gray-200/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none'

const animatedPanelClassName =
  'px-4 py-3 border-t border-gray-300 text-gray-800'

const PANEL_TEXT =
  'Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.'

const chevron = (isOpen: boolean): Html => {
  const h = html()

  return h.span(
    [h.Class(clsx('text-gray-600', { 'rotate-180': isOpen }))],
    [Icon.chevronDown('w-4 h-4')],
  )
}

const buttonContent = (isOpen: boolean): Html => {
  const h = html()

  return h.div(
    [h.Class('flex items-center justify-between w-full')],
    [h.span([], ['What is Foldkit?']), chevron(isOpen)],
  )
}

const panelText = (): Html => {
  const h = html()

  return h.p([h.Class('text-gray-800')], [PANEL_TEXT])
}

const subheading = (text: string): Html => {
  const h = html<UiMessage>()

  return h.h3(
    [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
    [text],
  )
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Disclosure']),

      subheading('Basic'),
      h.label(
        [
          h.For(Disclosure.buttonId(DISCLOSURE_BASIC_DEMO_ID)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Frequently asked'],
      ),
      Disclosure.view<UiMessage>({
        id: DISCLOSURE_BASIC_DEMO_ID,
        isOpen: model.disclosureBasicDemo,
        onToggle: isOpen => ToggledDisclosureBasicDemo({ isOpen }),
        toView: attributes =>
          h.div(
            [],
            [
              h.button(
                [...attributes.button, h.Class(basicButtonClassName)],
                [buttonContent(model.disclosureBasicDemo)],
              ),
              model.disclosureBasicDemo
                ? h.div(
                    [...attributes.panel, h.Class(basicPanelClassName)],
                    [panelText()],
                  )
                : h.empty,
            ],
          ),
      }),

      subheading('Animated'),
      h.label(
        [
          h.For(Disclosure.buttonId(DISCLOSURE_ANIMATED_DEMO_ID)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Frequently asked'],
      ),
      Disclosure.view<UiMessage>({
        id: DISCLOSURE_ANIMATED_DEMO_ID,
        isOpen: model.disclosureAnimatedDemo,
        onToggle: isOpen => ToggledDisclosureAnimatedDemo({ isOpen }),
        toView: attributes =>
          h.div(
            [h.Class(animatedContainerClassName)],
            [
              h.button(
                [...attributes.button, h.Class(animatedButtonClassName)],
                [buttonContent(model.disclosureAnimatedDemo)],
              ),
              attributes.animatePanel(
                h.div(
                  [...attributes.panel, h.Class(animatedPanelClassName)],
                  [panelText()],
                ),
              ),
            ],
          ),
      }),
    ],
  )
})
