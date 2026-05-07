# Plugin output summary

Each row is one corpus file. Lines = total newlines in the formatted output. Max indent = the largest leading-space prefix found on any line, in spaces.

| file | baseline lines | plugin lines | Δ lines | baseline max indent | plugin max indent | Δ indent | idempotent |
|---|---:|---:|---:|---:|---:|---:|:---:|
| examples/auth/src/main.ts | 135 | 124 | -11 | 16 | 20 | 4 | yes |
| examples/auth/src/view.ts | 40 | 34 | -6 | 18 | 18 | 0 | yes |
| examples/auth/src/page/loggedOut/view.ts | 32 | 29 | -3 | 14 | 14 | 0 | yes |
| examples/auth/src/page/loggedOut/page/login.ts | 346 | 304 | -42 | 24 | 24 | 0 | yes |
| packages/typing-game/client/src/main.ts | 24 | 23 | -1 | 4 | 4 | 0 | yes |
| packages/typing-game/client/src/view/view.ts | 83 | 72 | -11 | 10 | 10 | 0 | yes |
| packages/typing-game/client/src/page/room/view/view.ts | 257 | 242 | -15 | 18 | 22 | 4 | yes |
| packages/typing-game/client/src/page/room/view/playing.ts | 123 | 114 | -9 | 10 | 12 | 2 | yes |
| packages/typing-game/client/src/page/room/view/finished.ts | 164 | 135 | -29 | 24 | 28 | 4 | yes |
| packages/typing-game/client/src/page/room/view/waiting.ts | 65 | 60 | -5 | 10 | 12 | 2 | yes |
| packages/typing-game/client/src/page/home/view.ts | 204 | 184 | -20 | 20 | 24 | 4 | yes |
| packages/website/src/page/landing.ts | 1186 | 853 | -333 | 28 | 26 | -2 | yes |
| packages/website/src/page/gettingStarted.ts | 124 | 104 | -20 | 12 | 10 | -2 | yes |
| packages/website/src/page/manifesto.ts | 96 | 75 | -21 | 8 | 6 | -2 | yes |

Totals: baseline 2879 lines, plugin 2353 lines, Δ -526 lines (-18.3%).
