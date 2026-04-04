---
'foldkit': patch
---

Make Scene.type and Scene.keydown dual for data-last piping. Both interactions now accept a single-argument form that returns a function waiting for the target, enabling pipe composition with locators: `pipe(Scene.label('Email'), Scene.type('alice@example.com'))`.
