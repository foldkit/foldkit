---
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/markdown': patch
---

Show the `Application`, `ApplicationComposition`, its owned `makeApplication` method, and the completed application's `provide` method in DevTools setup guidance, installer instructions, and the Markdown island example. Root graph assembly through `Application` and `ApplicationComposition` lives in `application.ts`; explicit runtime-input completion and browser startup remain in `entry.ts`.
