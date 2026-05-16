---
'foldkit': patch
---

Fix DevTools MCP dispatch failing on Messages whose payloads contain Effect self-codec types like `Schema.Option`, `Schema.Date`, `Schema.Map`, and `Schema.Set`. The bridge now derives a JSON-canonical codec from your Message Schema via `Schema.toCodecJson` at boot and decodes incoming dispatch payloads against that, so the JSON-tagged shapes agents naturally produce (`{ _tag: "Some", value }`, ISO date strings, etc.) reconstruct into the correct runtime values. No application changes required. Your domain Schema stays unchanged.
