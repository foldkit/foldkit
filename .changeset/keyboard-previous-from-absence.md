---
'@foldkit/ui': patch
---

Fix previous-key navigation when no item is highlighted. In a Combobox opened by focusing its input with `openOnFocus: true`, pressing ArrowUp now highlights the last enabled item. The shared keyboard helper starts its backward search at the final item instead of skipping it, including for a configured horizontal previous key.

Navigation from an existing highlighted item and the all-disabled fallback preserve their behavior. No public API or consumer migration changes are required.
