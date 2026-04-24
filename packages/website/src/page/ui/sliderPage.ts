import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { uiShowcaseViewSourceHref } from '../../link'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  demoContainer,
  heading,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import {
  type DataAttributeEntry,
  type KeyboardEntry,
  type PropEntry,
  dataAttributeTable,
  keyboardTable,
  propTable,
} from '../../view/docTable'
import type { Message } from './message'
import type { Model } from './model'
import * as Slider from './slider'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const examplesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'examples',
  text: 'Examples',
}

const subscriptionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'subscriptions',
  text: 'Subscriptions',
}

const stylingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'styling',
  text: 'Styling',
}

const keyboardInteractionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keyboard-interaction',
  text: 'Keyboard Interaction',
}

const accessibilityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'accessibility',
  text: 'Accessibility',
}

const apiReferenceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'api-reference',
  text: 'API Reference',
}

const initConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'init-config',
  text: 'InitConfig',
}

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

const sliderAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'slider-attributes',
  text: 'SliderAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  subscriptionsHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  sliderAttributesHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the slider instance.',
  },
  {
    name: 'min',
    type: 'number',
    description: 'Minimum value.',
  },
  {
    name: 'max',
    type: 'number',
    description: 'Maximum value.',
  },
  {
    name: 'step',
    type: 'number',
    description:
      'Increment between allowed values. Fractional steps are rounded to the step’s decimal precision to avoid floating-point drift.',
  },
  {
    name: 'initialValue',
    type: 'number',
    description:
      'Initial value. Clamped to [min, max] and snapped to the nearest step.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Slider.Model',
    description: 'The slider state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Slider.Message) => ParentMessage',
    description:
      'Wraps Slider Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'toView',
    type: '(attributes: SliderAttributes) => Html',
    description:
      'Callback that receives attribute groups for the root, track, filled track, thumb, label, and hidden input elements.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description:
      'Accessible name for screen readers when there is no visible label.',
  },
  {
    name: 'ariaLabelledBy',
    type: 'string',
    description:
      'ID of an external element whose text serves as the slider’s accessible name.',
  },
  {
    name: 'formatValue',
    type: '(value: number) => string',
    description:
      'Produces the aria-valuetext announced to screen readers. Use it when the numeric value needs a natural-language form (e.g. "3 of 10" or "50 percent").',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the slider is disabled. Removes pointer and keyboard interactivity while preserving focusability.',
  },
  {
    name: 'name',
    type: 'string',
    description:
      'Form field name. When provided, a hidden input carrying the current numeric value is included for native form submission.',
  },
]

const sliderAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'root',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the outer wrapper. Carries data-slider-id, data-orientation, and state data attributes.',
  },
  {
    name: 'track',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the track element (the bar). Carries data-slider-track-id (used by the drag subscription to measure cursor position), positioning styles, and the pointerdown handler for click-to-jump.',
  },
  {
    name: 'filledTrack',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto an element nested inside the track. Its inline width reflects the current value as a percentage of the range.',
  },
  {
    name: 'thumb',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the draggable handle. Carries role="slider", tabindex, aria-value*, the pointerdown handler, the keyboard handler, and positioning.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the visible label element. Carries the id the thumb’s aria-labelledby points to by default.',
  },
  {
    name: 'hiddenInput',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a hidden <input> for form submission. Only populated when the name prop is set.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-dragging',
    condition:
      'Present on the root, track, filled track, and thumb while the user is actively dragging.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on all groups when isDisabled is true.',
  },
  {
    attribute: 'data-orientation',
    condition:
      'Present on the root. Always "horizontal" in v1; vertical is planned.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'ArrowRight / ArrowUp',
    description: 'Increases the value by one step.',
  },
  {
    key: 'ArrowLeft / ArrowDown',
    description: 'Decreases the value by one step.',
  },
  {
    key: 'PageUp',
    description: 'Increases the value by ten steps.',
  },
  {
    key: 'PageDown',
    description: 'Decreases the value by ten steps.',
  },
  {
    key: 'Home',
    description: 'Jumps to the minimum value.',
  },
  {
    key: 'End',
    description: 'Jumps to the maximum value.',
  },
  {
    key: 'Escape',
    description:
      'During a pointer drag, cancels the drag and restores the pre-drag value.',
  },
]

// VIEW

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  copiedSnippets: CopiedSnippets,
): Html =>
  div(
    [],
    [
      pageTitle('ui/slider', 'Slider'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A numeric range input for values that sit on a continuous or stepped scale. Common uses include rating scales, volume controls, filter thresholds, and brightness settings. Follows the WAI-ARIA slider pattern with ',
        inlineCode('role="slider"'),
        ', full keyboard navigation, and pointer drag.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Slider is wired up in a ',
        link(uiShowcaseViewSourceHref('slider'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Slider is headless — your ',
        inlineCode('toView'),
        ' callback controls all markup and styling. The component hands back attribute groups for the root, track, filled track, thumb, label, and an optional hidden input for form submission.',
      ),
      demoContainer(
        ...Slider.sliderDemo(
          model.sliderRatingDemo,
          model.sliderVolumeDemo,
          toParentMessage,
        ),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiSliderBasicHighlighted)],
          [],
        ),
        Snippet.uiSliderBasicRaw,
        'Copy slider example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        subscriptionsHeader.level,
        subscriptionsHeader.id,
        subscriptionsHeader.text,
      ),
      para(
        'Pointer drag needs document-level ',
        inlineCode('pointermove'),
        ' / ',
        inlineCode('pointerup'),
        ' tracking (the cursor can leave the slider element). Slider exposes this as a Subscription you wire into your app’s ',
        inlineCode('subscriptions'),
        ' alongside an Escape-key subscription that cancels an in-progress drag. The example snippet above shows the full wiring.',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Slider exposes ',
        inlineCode('data-dragging'),
        ' while the user is actively dragging, ',
        inlineCode('data-disabled'),
        ' when disabled, and ',
        inlineCode('data-orientation'),
        ' on the root. The ',
        inlineCode('filledTrack'),
        ' attribute group carries an inline width so the filled portion always matches the current value.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The thumb receives ',
        inlineCode('role="slider"'),
        ', ',
        inlineCode('aria-valuemin'),
        ', ',
        inlineCode('aria-valuemax'),
        ', ',
        inlineCode('aria-valuenow'),
        ', and ',
        inlineCode('aria-orientation'),
        '. When ',
        inlineCode('formatValue'),
        ' is provided, the formatted string is announced via ',
        inlineCode('aria-valuetext'),
        '. By default the thumb is labeled via ',
        inlineCode('aria-labelledby'),
        ' pointing at the id carried on the ',
        inlineCode('label'),
        ' attribute group; you can override this with an explicit ',
        inlineCode('ariaLabel'),
        ' or ',
        inlineCode('ariaLabelledBy'),
        '.',
      ),
      heading(
        apiReferenceHeader.level,
        apiReferenceHeader.id,
        apiReferenceHeader.text,
      ),
      heading(
        initConfigHeader.level,
        initConfigHeader.id,
        initConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Slider.init()'), '.'),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Slider.view()'), '.'),
      propTable(viewConfigProps),
      heading(
        sliderAttributesHeader.level,
        sliderAttributesHeader.id,
        sliderAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(sliderAttributesProps),
    ],
  )
