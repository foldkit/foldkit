---
'foldkit': patch
---

Find native blockquotes with `Scene.role('blockquote')` and `Scene.all.role('blockquote')`. These locators previously returned no match unless the element had an explicit role, forcing tests to use a selector for native quotation markup.

Add the other missing fixed mappings confirmed by the [ARIA in HTML W3C Recommendation of 11 August 2026](https://www.w3.org/TR/2026/REC-html-aria-20260811/#docconformance): `address`, `caption`, `code`, `del`, `dfn`, `em`, `hgroup`, `ins`, `menu`, `optgroup`, `s`, `search`, `strong`, `sub`, `sup`, `tbody`, `tfoot`, `thead`, and `time`. Draft-only mappings are excluded.

Role queries can now return additional matches or a different first match, particularly for `group` and `list`. Use the existing scoped locators when a query needs to target a particular container. Explicit roles keep their precedence, and query signatures and rendered markup are unchanged.
