# Foldkit UI

## Overview

Foldkit UI is a set of headless, accessible UI components. You provide markup and styling through a `toView` callback. Foldkit UI provides attribute bundles, keyboard behavior, and state management where the interaction requires it.

## Installation

`@foldkit/ui` is a separate package from `foldkit`. Projects scaffolded by `create-foldkit-app` from an example that uses UI components already include it. Its peer dependencies are `foldkit` and `effect`, which every Foldkit project already has. Add it to any other project with:

::Snippet{name="uiOverviewInstall" label="install Foldkit UI"}

## Component Categories

Components are either stateful Submodels or stateless render helpers.

Stateful [Submodels](/core/submodel), including Menu, Listbox, Combobox, Calendar, Dialog, and Popover, have their own Model, Message union, update, and OutMessage. Embed them with `h.submodel` and fold their OutMessages into the parent update.

Stateless render helpers, including Button, Input, Textarea, Select, Checkbox, Switch, Disclosure, Fieldset, and Nav, take a `ViewConfig` and your builder and return Html. They bundle ARIA, data, and event attributes for DOM elements that you render. They need no child Model or `h.submodel` wiring. The builder determines the Message type returned by their callbacks, so you do not provide a Message type argument.

The Kind column below identifies each component category.

## Components

| Component                          | Kind     | Description                                                                                                                                                                                          |
| ---------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Button](/ui/button)               | Helper   | Accessible button with consistent ARIA attributes and data-attribute hooks for styling.                                                                                                              |
| [Input](/ui/input)                 | Helper   | Text input with ARIA label/description linking and data-attribute hooks.                                                                                                                             |
| [Textarea](/ui/textarea)           | Helper   | Multi-line text input with ARIA label/description linking and data-attribute hooks.                                                                                                                  |
| [Checkbox](/ui/checkbox)           | Helper   | Toggle with accessible labeling, keyboard support, indeterminate state, and optional form integration.                                                                                               |
| [Fieldset](/ui/fieldset)           | Helper   | Groups related form controls with a legend and description. Disabled state propagates to all children.                                                                                               |
| [Radio Group](/ui/radio-group)     | Submodel | Radio options with roving tabindex, keyboard navigation, read-only navigation, and per-option label/description linking.                                                                             |
| [Switch](/ui/switch)               | Helper   | On/off toggle with accessible labeling, keyboard support, and optional form integration.                                                                                                             |
| [Slider](/ui/slider)               | Submodel | Numeric range input with pointer drag, keyboard step / page / home / end navigation, and ARIA slider semantics.                                                                                      |
| [Select](/ui/select)               | Helper   | Native select wrapper with ARIA label/description linking and data-attribute hooks.                                                                                                                  |
| [Listbox](/ui/listbox)             | Submodel | Custom select dropdown with persistent selection, keyboard navigation, typeahead search, and read-only browsing.                                                                                     |
| [Combobox](/ui/combobox)           | Submodel | Autocomplete input with filtering, keyboard navigation, custom rendering, and read-only browsing.                                                                                                    |
| [Dialog](/ui/dialog)               | Submodel | Modal dialog using native &lt;dialog&gt; with focus trapping, backdrop, and scroll locking.                                                                                                          |
| [Menu](/ui/menu)                   | Submodel | Dropdown menu with keyboard navigation, typeahead search, and aria-activedescendant focus.                                                                                                           |
| [Popover](/ui/popover)             | Submodel | Floating panel with arbitrary content and natural Tab navigation.                                                                                                                                    |
| [Tooltip](/ui/tooltip)             | Submodel | Non-interactive floating label anchored to a trigger. Shows on hover after a delay or immediately on keyboard focus, and hides on pointer-leave, blur, or Escape.                                    |
| [Toast](/ui/toast)                 | Submodel | Stack of transient notifications anchored to a corner of the viewport. Each entry has its own enter and leave animation, auto-dismiss timer, and hover-to-pause behavior.                            |
| [Disclosure](/ui/disclosure)       | Helper   | Show/hide toggle for building collapsible sections like FAQs and accordions.                                                                                                                         |
| [Tabs](/ui/tabs)                   | Submodel | Tabbed interface with keyboard navigation, Home/End support, and wrapping.                                                                                                                           |
| [Nav](/ui/nav)                     | Helper   | Stateless, URL-driven navigation landmark whose items are links, marking the current destination with aria-current="page".                                                                           |
| [Drag and Drop](/ui/drag-and-drop) | Submodel | Sortable lists and cross-container movement with pointer tracking, keyboard navigation, auto-scrolling, and screen reader announcements.                                                             |
| [File Drop](/ui/file-drop)         | Submodel | File input with drag-and-drop support, configurable accept patterns, and multiple-file mode. Emits typed OutMessages for received files and non-file drops.                                          |
| [Calendar](/ui/calendar)           | Submodel | Inline calendar grid with 2D keyboard navigation, locale-aware headers, min/max constraints, and disabled-date support. Foundation for date pickers.                                                 |
| [Date Picker](/ui/date-picker)     | Submodel | Input paired with a popover Calendar. Inherits the calendar’s constraint and keyboard-navigation support, with programmatic open/close and setters.                                                  |
| [Animation](/ui/animation)         | Submodel | Coordinates CSS enter/leave animations via a state machine and data attributes. Works with both CSS transitions and CSS keyframe animations. Sends an OutMessage when the leave animation completes. |
| [Hover Intent](/ui/hover-intent)   | Submodel | Headless hover and focus behavior for a trigger and panel, with delayed pointer opening and a closing grace period. The consumer owns semantics, positioning, and styling.                           |
| [Virtual List](/ui/virtual-list)   | Submodel | Virtualization for large lists. Only the items inside the viewport plus an overscan buffer are mounted, and spacer elements above and below the visible slice keep the scrollbar accurate.           |

Underneath the floating components sits [Anchor](/ui/anchor), the positioning runtime Listbox, Combobox, Menu, Popover, Tooltip, and Date Picker share. It is neither a helper nor a Submodel, so it has no row above. Reach for it directly only when you are building an anchored component none of those cover.

## Showcase

The [UI Showcase](/example-apps/ui-showcase) demonstrates every component with styled, interactive examples. Use its source to see parent-child wiring, OutMessage folds, and view composition in one application.
