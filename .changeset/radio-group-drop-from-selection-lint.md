---
'@foldkit/oxlint-plugin': patch
---

Drop `RadioGroup` from the `selection-submodel-factory-at-module-scope` rule. RadioGroup is now a stateless controlled render helper with no `create` factory, so the rule covers Combobox, Listbox, Menu, and Tabs.
