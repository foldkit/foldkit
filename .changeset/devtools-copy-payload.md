---
'@foldkit/devtools': minor
---

Add copy-to-clipboard buttons for Model, Message, Command, and Mount payloads in the DevTools overlay. Each button copies fully expanded, formatted JSON regardless of the inspector tree's expanded state, then briefly shows a check mark. Repeat clicks are ignored while the clipboard write is pending or the check mark is shown. The buttons use the website's snippet copy icon. Long Command and Mount arguments wrap within the inspector.
