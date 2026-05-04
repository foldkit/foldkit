---
'foldkit': patch
---

Fix `Ui.Tabs` `persistPanels: true` rendering all panels simultaneously when consumer styles set `display:` on the panel.

The Tabs component marked inactive persisted panels with the HTML `hidden`
attribute, relying on the user-agent stylesheet's `[hidden] { display: none }`
rule. Author CSS like Tailwind's `flex` utility class beats the user-agent
rule on specificity, so all persisted panels rendered at once and stacked
vertically. The Tabs component now applies inline `display: none` to inactive
persisted panels in addition to the `hidden` attribute, which beats any
class-based `display` declaration regardless of consumer CSS.
