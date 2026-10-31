# Foldkit UI

## Overview

Foldkit UI is a set of headless, accessible UI components. You provide markup and styling through a `toView` callback. Foldkit UI provides attribute bundles, keyboard behavior, and state management where the interaction requires it.

## Installation

`@foldkit/ui` is a separate package from `foldkit`. Projects scaffolded by `create-foldkit-app` from an example that uses UI components already include it. Its peer dependencies are `foldkit` and `effect`, which every Foldkit project already has. Add it to any other project with:

::Snippet{name="uiOverviewInstall" label="Install Foldkit UI"}

## Component Categories

Components are either stateful Blocks or stateless render helpers.

### Stateful Blocks

Stateful [Blocks](/core/block), including Menu, Listbox, Combobox, Calendar, Dialog, and Popover, have their own Model, Message union, update, and OutMessage. Create an instance in the parent's constructor, hold it in the parent Model, render it with its `view`, send it Messages, and handle its OutMessages with `.on`.

### Stateless Render Helpers

Stateless render helpers, including Button, Input, Textarea, Select, Checkbox, Switch, Disclosure, Fieldset, and Nav, take a `ViewConfig` and your builder and return Html. They bundle ARIA, data, and event attributes for DOM elements that you render. They need no child instance. The builder determines the Message type returned by their callbacks, so you do not provide a Message type argument.

The Kind column below identifies each component category.

## Application Wiring

Some components use Commands, Subscriptions, or Mounts for focus, positioning, animation, and other effects. Each component's Layer carries those handlers, and each instance runs its own Subscriptions while it is in the parent Model. The parent's only wiring is to provide the component's Layer to its own Layer.

Each component module exports its class and its Layer: `Dialog.Dialog` and `Dialog.DialogLive`. A generic factory such as `Menu.makeBlock<Item>()` returns a class with its Layer attached as `Live`. A component that holds other components, such as Dialog holding an Animation, provides their Layers inside its own, so you only provide the components you create.

The example below creates a Dialog and a Menu in one root Block, provides both Layers, and starts the Program. Supply external services through the root Layer as described in [Layers](/core/layers).

::Snippet{name="uiEffects" label="Providing Foldkit UI effects"}

Component factories with instance-specific behavior return classes too. Call `Slider.forRoot(getTrackRoot)` or `Toast.makeBlock(PayloadSchema)` once at module scope, create instances of the class it returns, and provide that class's `Live`.

## Components

| Component                          | Kind   | Description                                                                                                                                                                                          |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Button](/ui/button)               | Helper | Accessible button with consistent ARIA attributes and data-attribute hooks for styling.                                                                                                              |
| [Input](/ui/input)                 | Helper | Text input with ARIA label/description linking and data-attribute hooks.                                                                                                                             |
| [Textarea](/ui/textarea)           | Helper | Multi-line text input with ARIA label/description linking and data-attribute hooks.                                                                                                                  |
| [Checkbox](/ui/checkbox)           | Helper | Toggle with accessible labeling, keyboard support, indeterminate state, and optional form integration.                                                                                               |
| [Fieldset](/ui/fieldset)           | Helper | Groups related form controls with a legend and description. Disabled state propagates to all children.                                                                                               |
| [Radio Group](/ui/radio-group)     | Block  | Radio options with roving tabindex, keyboard navigation, read-only navigation, and per-option label/description linking.                                                                             |
| [Switch](/ui/switch)               | Helper | On/off toggle with accessible labeling, keyboard support, and optional form integration.                                                                                                             |
| [Slider](/ui/slider)               | Block  | Numeric range input with pointer drag, keyboard step / page / home / end navigation, and ARIA slider semantics.                                                                                      |
| [Meter](/ui/meter)                 | Helper | Scalar value in a known range with `role="meter"`, clamped `aria-valuenow`, and threshold data attributes.                                                                                           |
| [Progress](/ui/progress)           | Helper | Task progress with `role="progressbar"`, determinate and indeterminate states, and `data-state` styling hooks.                                                                                       |
| [Select](/ui/select)               | Helper | Native select wrapper with ARIA label/description linking and data-attribute hooks.                                                                                                                  |
| [Listbox](/ui/listbox)             | Block  | Custom select dropdown with persistent selection, keyboard navigation, typeahead search, and read-only browsing.                                                                                     |
| [Combobox](/ui/combobox)           | Block  | Autocomplete input with filtering, keyboard navigation, custom rendering, and read-only browsing.                                                                                                    |
| [Dialog](/ui/dialog)               | Block  | Modal dialog using native &lt;dialog&gt; with focus trapping, backdrop, and scroll locking.                                                                                                          |
| [Menu](/ui/menu)                   | Block  | Dropdown menu with keyboard navigation, typeahead search, and aria-activedescendant focus.                                                                                                           |
| [Popover](/ui/popover)             | Block  | Floating panel with arbitrary content and natural Tab navigation.                                                                                                                                    |
| [Tooltip](/ui/tooltip)             | Block  | Non-interactive floating label anchored to a trigger. Shows on hover after a delay or immediately on keyboard focus, and hides on pointer-leave, blur, or Escape.                                    |
| [Toast](/ui/toast)                 | Block  | Stack of transient notifications anchored to a corner of the viewport. Each entry has its own enter and leave animation, auto-dismiss timer, and hover-to-pause behavior.                            |
| [Disclosure](/ui/disclosure)       | Helper | Show/hide toggle for building collapsible sections like FAQs and accordions.                                                                                                                         |
| [Tabs](/ui/tabs)                   | Block  | Tabbed interface with keyboard navigation, Home/End support, and wrapping.                                                                                                                           |
| [Nav](/ui/nav)                     | Helper | Stateless, URL-driven navigation landmark whose items are links, marking the current destination with aria-current="page".                                                                           |
| [Drag and Drop](/ui/drag-and-drop) | Block  | Sortable lists and cross-container movement with pointer tracking, keyboard navigation, auto-scrolling, and screen reader announcements.                                                             |
| [File Drop](/ui/file-drop)         | Block  | File input with drag-and-drop support, configurable accept patterns, and multiple-file mode. Emits typed OutMessages for received files and non-file drops.                                          |
| [Calendar](/ui/calendar)           | Block  | Inline calendar grid with 2D keyboard navigation, locale-aware headers, min/max constraints, and disabled-date support. Foundation for date pickers.                                                 |
| [Date Picker](/ui/date-picker)     | Block  | Input paired with a popover Calendar. Inherits the calendar’s constraint and keyboard-navigation support, with programmatic open/close and setters.                                                  |
| [Animation](/ui/animation)         | Block  | Coordinates CSS enter/leave animations via a state machine and data attributes. Works with both CSS transitions and CSS keyframe animations. Sends an OutMessage when the leave animation completes. |
| [Hover Intent](/ui/hover-intent)   | Block  | Headless hover and focus behavior for a trigger and panel, with delayed pointer opening and a closing grace period. The consumer owns semantics, positioning, and styling.                           |
| [Virtual List](/ui/virtual-list)   | Block  | Virtualization for large lists. Only the items inside the viewport plus an overscan buffer are mounted, and spacer elements above and below the visible slice keep the scrollbar accurate.           |

Underneath the floating components sits [Anchor](/ui/anchor), the positioning runtime Listbox, Combobox, Menu, Popover, Tooltip, and Date Picker share. It is neither a helper nor a Block, so it has no row above. Reach for it directly only when you are building an anchored component none of those cover.

## Showcase

The [UI Showcase](/example-apps/ui-showcase) demonstrates every component with styled, interactive examples. Use its source to see parent-child wiring, OutMessage handling, and view composition in one application.
