# Foldkit UI

## What is Foldkit UI?

Foldkit UI is a set of headless, accessible UI components. Each component is renderless. You provide the markup and styling through a toView callback, and Foldkit UI provides the accessibility attributes, keyboard navigation, and (where applicable) state management.

## Installation

`@foldkit/ui` is a separate package from `foldkit`. Projects scaffolded by `create-foldkit-app` from an example that uses UI components already include it. Its peer dependencies are `foldkit` and `effect`, which every Foldkit project already has. Add it to any other project with:

```sh
npm install @foldkit/ui
```

## Two categories

Foldkit UI components fall into two categories, distinguished by whether they carry state.

Stateful [Submodels](/core/submodel) (Menu, Listbox, Combobox, Calendar, Dialog, Popover, among others) manage their own Model, Message, update, and OutMessage. You embed them via h.submodel and handle their events by pattern-matching the OutMessage in your update.

Stateless render helpers (Button, Input, Textarea, Select, Checkbox, Switch, Disclosure, Fieldset, Nav) are called directly with a ViewConfig and your builder, and return Html. They bundle ARIA and data attributes onto consumer-rendered DOM. No Model, no h.submodel wiring. The controlled helpers dispatch the Messages returned by their config callbacks, and the builder you pass is what determines the Message type those callbacks must return, so there is no type argument to write. The “Kind” column in the table below marks which is which.

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
| [Disclosure](/ui/disclosure)       | Helper   | Show/hide toggle for building collapsible sections like FAQs and accordions.                                                                                                                         |
| [Tabs](/ui/tabs)                   | Submodel | Tabbed interface with keyboard navigation, Home/End support, and wrapping.                                                                                                                           |
| [Nav](/ui/nav)                     | Helper   | Stateless, URL-driven navigation landmark whose items are links, marking the current destination with aria-current="page".                                                                           |
| [Drag and Drop](/ui/drag-and-drop) | Submodel | Sortable lists and cross-container movement with pointer tracking, keyboard navigation, auto-scrolling, and screen reader announcements.                                                             |
| [File Drop](/ui/file-drop)         | Submodel | File input with drag-and-drop support, configurable accept patterns, and multiple-file mode. Emits typed OutMessages for received files and non-file drops.                                          |
| [Calendar](/ui/calendar)           | Submodel | Inline calendar grid with 2D keyboard navigation, locale-aware headers, min/max constraints, and disabled-date support. Foundation for date pickers.                                                 |
| [Date Picker](/ui/date-picker)     | Submodel | Input paired with a popover Calendar. Inherits the calendar’s constraint and keyboard-navigation support, with programmatic open/close and setters.                                                  |
| [Animation](/ui/animation)         | Submodel | Coordinates CSS enter/leave animations via a state machine and data attributes. Works with both CSS transitions and CSS keyframe animations. Sends an OutMessage when the leave animation completes. |

Underneath the floating components sits [Anchor](/ui/anchor), the positioning runtime Listbox, Combobox, Menu, Popover, Tooltip, and Date Picker share. It is neither a helper nor a Submodel, so it has no row above. Reach for it directly only when you are building an anchored component none of those cover.

## Showcase

The [UI Showcase](/example-apps/ui-showcase) example demonstrates every component with styled, interactive examples. It’s a good reference for how to wire up component state, handle Messages, and compose views.
