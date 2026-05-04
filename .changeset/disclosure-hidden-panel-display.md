---
'foldkit': patch
---

Fix `Ui.Disclosure` `persistPanel: true` panel rendering when closed if consumer styles set `display:` on the panel.

The Disclosure component marked the closed persisted panel with the HTML
`hidden` attribute, relying on the user-agent stylesheet's `[hidden] {
display: none }` rule. Author CSS like Tailwind's `flex` utility class beats
the user-agent rule on specificity, so the closed panel could render
visibly. The Disclosure component now applies inline `display: none` to the
closed persisted panel in addition to the `hidden` attribute, matching the
treatment that `Ui.Tabs` received.
