| Mode | Request | Baseline median (runs, ms) | Candidate median (runs, ms) | Change |
| --- | --- | --- | --- | --- |
| root-incomplete | cold completion | 4873 (4788, 4897, 4764, 4873, 5005) | 3616 (3537, 3616, 3698, 3484, 5111) | -25.8% |
| root-incomplete | post-edit completion | 4765 (4616, 4847, 4765, 4717, 4799) | 3380 (3420, 3259, 3380, 3174, 4143) | -29.1% |
| root-incomplete | semantic edit guard | 2.3 (2.3, 2.3, 3.5, 2.5, 2.1) | 2.8 (2.8, 2.1, 4.8, 2.1, 2.8) | n/a |
| root-incomplete | warm completion | 0.4 (0.4, 0.5, 0.3, 0.3, 0.4) | 0.4 (0.4, 0.4, 0.4, 0.3, 0.9) | n/a |
| root-hover | cold root Model hover | 4843 (5555, 5528, 4836, 4824, 4843) | 3679 (4006, 4128, 3499, 3679, 3552) | -24.0% |
| root-hover | post-edit root Model hover | 4664 (4682, 5104, 4629, 4664, 4653) | 3346 (3346, 3340, 3321, 3426, 3470) | -28.2% |
| root-hover | semantic edit guard | 2.1 (2.1, 2.2, 2.1, 2.0, 2.0) | 2.1 (2.1, 2.1, 2.1, 2.1, 2.1) | n/a |
| root-hover | warm root Model hover | 0.5 (0.5, 0.5, 0.4, 0.4, 0.5) | 0.5 (0.5, 0.6, 0.4, 0.6, 0.4) | n/a |
| root-diagnostics | cold clean root diagnostics | 4853 (10088, 4814, 4779, 4853, 5177) | 3802 (3802, 3865, 3776, 3764, 4899) | -21.7% |
| root-diagnostics | root error appearance | 4702 (8067, 4702, 4841, 4637, 4611) | 3641 (3641, 3797, 3593, 3639, 6020) | -22.6% |
| root-diagnostics | root error clear | 4785 (4554, 4618, 4952, 6046) | 3601 (3544, 3601, 3513, 3808, 8346) | -24.7% |
| composition-incomplete | cold completion | 2722 (2722, 2770, 2733, 2709, 2697) | 2275 (2268, 2295, 2263, 2275, 2435) | -16.4% |
| composition-incomplete | post-edit completion | 2508 (2508, 2550, 2475, 2507, 2549) | 2107 (2052, 2049, 2107, 2144, 2173) | -16.0% |
| composition-incomplete | semantic edit guard | 2.2 (2.2, 2.2, 2.1, 2.3, 2.1) | 2.1 (2.2, 2.0, 2.0, 2.1, 2.1) | n/a |
| composition-incomplete | warm completion | 0.4 (0.4, 0.4, 0.4, 0.4, 0.3) | 0.4 (0.4, 0.4, 0.4, 0.3, 0.3) | n/a |

| Mode | Baseline max sampled RSS MiB (runs) | Candidate max sampled RSS MiB (runs) |
| --- | --- | --- |
| root-incomplete | 1831, 2044, 2031, 1954, 2070 | 1735, 1632, 1677, 1761, 1570 |
| root-hover | 2107, 1759, 1787, 2085, 2038 | 1531, 1560, 1501, 1726, 1543 |
| root-diagnostics | 2417, 2445, 2458, 2448, 2331 | 2189, 1942, 2105, 2248, 1474 |
| composition-incomplete | 1505, 1582, 1547, 1587, 1587 | 1346, 1338, 1372, 1381, 1334 |

runs: 40; identities (official probe): 1 distinct; identities (hover fork): 1 distinct
  identity: {"client": "bcbe8e0f8693a2e3effb4a890a70c331153b616a4a2f88406dcffd842364a2e6", "executable": "a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2", "go": {"GODEBUG": null, "GOENV": null, "GOEXPERIMENT": null, "GOGC": null, "GOMAXPROCS": null, "GOMEMLIMIT": null}, "guard": "f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf", "native": ["@typescript/typescript-darwin-arm64", "7.0.2", "e88558e22e3db6c4da920e15a60eb2bbea801732b94aedb67e972be2a7f485b8"], "node": "v24.20.0", "probe": "1491ea5fe44f546a4adfb74126a42ec866e7235a3c62f25dead66a6b75cc1751", "server": {"name": "typescript-go", "version": "7.0.2"}, "wrapper": ["7.0.2", "2bd066d87f5bafd315be9f40889d0a60b9e58e0b", "3722b30210616a13a3213ded11575ba6b2dbab10c32a5ef67afca8513e27017e"]}
  identity: {"client": "bcbe8e0f8693a2e3effb4a890a70c331153b616a4a2f88406dcffd842364a2e6", "executable": "a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2", "go": {"GODEBUG": null, "GOENV": null, "GOEXPERIMENT": null, "GOGC": null, "GOMAXPROCS": null, "GOMEMLIMIT": null}, "guard": "f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf", "native": ["@typescript/typescript-darwin-arm64", "7.0.2", "e88558e22e3db6c4da920e15a60eb2bbea801732b94aedb67e972be2a7f485b8"], "node": "v24.20.0", "probe": "3ccab68a8d5cac56adf8c01adcea22764a7b3de57d4a58889bcb52594cf4f5ad", "server": {"name": "typescript-go", "version": "7.0.2"}, "wrapper": ["7.0.2", "2bd066d87f5bafd315be9f40889d0a60b9e58e0b", "3722b30210616a13a3213ded11575ba6b2dbab10c32a5ef67afca8513e27017e"]}
  workload composition-incomplete baseline  source 9131ee919aa1 chain 1ed71d59,0c58c35c,c845230d
  workload composition-incomplete candidate source b8b128fa5938 chain 3fa222a9,a94a7f3d,82e95161
  workload root-diagnostics       baseline  source 9131ee919aa1 chain 48f2cb9e,d1ea8045,48f2cb9e
  workload root-diagnostics       candidate source b8b128fa5938 chain fab720d5,6eaae032,fab720d5
  workload root-hover             baseline  source 9131ee919aa1 chain aa80a7df,a3f69991,c9543c5f
  workload root-hover             candidate source b8b128fa5938 chain b116f63c,515b0748,39062568
  workload root-incomplete        baseline  source 9131ee919aa1 chain 595c324f,81569521,642b32e4
  workload root-incomplete        candidate source b8b128fa5938 chain d7350d34,799803ab,cc4f2edd
problems: ['root-diagnostics-baseline-1: exit 1 status Failed Error: 22-second process wall limit']
