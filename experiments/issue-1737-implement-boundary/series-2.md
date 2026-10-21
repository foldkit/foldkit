| Mode | Request | Baseline median (runs, ms) | Candidate median (runs, ms) | Change |
| --- | --- | --- | --- | --- |
| root-incomplete | cold completion | 4894 (4810, 4981, 4894, 4864, 6423) | 3573 (3589, 3550, 3561, 3573, 7727) | -27.0% |
| root-incomplete | post-edit completion | 4686 (4686, 4592, 4651, 5354, 5742) | 3416 (3415, 3392, 3416, 3447, 6591) | -27.1% |
| root-incomplete | semantic edit guard | 2.5 (2.2, 2.6, 2.0, 2.5, 12) | 2.5 (2.5, 2.3, 2.1, 2.5, 2.9) | n/a |
| root-incomplete | warm completion | 0.4 (0.4, 0.4, 0.3, 0.4, 0.7) | 0.4 (0.4, 0.4, 0.4, 0.4, 4.3) | n/a |
| root-valid | cold completion | 4907 (5195, 4907, 5385, 4774, 4843) | 3690 (3690, 3912, 3734, 3538, 3634) | -24.8% |
| root-valid | post-edit completion | 4770 (5145, 5172, 4750, 4601, 4770) | 3434 (3434, 3566, 3631, 3397, 3403) | -28.0% |
| root-valid | semantic edit guard | 2.6 (2.7, 2.6, 2.2, 4.3, 2.1) | 2.2 (2.1, 2.3, 2.4, 2.2, 2.1) | n/a |
| root-valid | warm completion | 0.3 (0.4, 0.4, 0.3, 0.3, 0.3) | 0.4 (0.4, 0.4, 0.4, 0.4, 0.4) | n/a |
| root-hover | cold root Model hover | 4901 (4861, 4901, 4816, 5059, 5102) | 3610 (3604, 3573, 3610, 3727, 3837) | -26.3% |
| root-hover | post-edit root Model hover | 4640 (4640, 4687, 4556, 4638, 5280) | 3600 (3478, 3413, 4300, 3600, 3689) | -22.4% |
| root-hover | semantic edit guard | 2.4 (2.1, 2.4, 2.2, 2.6, 2.7) | 2.2 (2.0, 2.2, 3.0, 2.4, 2.0) | n/a |
| root-hover | warm root Model hover | 0.4 (0.5, 0.4, 0.4, 0.4, 0.4) | 0.5 (0.4, 0.5, 0.4, 0.5, 0.5) | n/a |
| root-diagnostics | cold clean root diagnostics | 5021 (6866, 10777, 4895, 4825, 5021) | 3997 (5943, 4844, 3981, 3964, 3997) | -20.4% |
| root-diagnostics | root error appearance | 4963 (6062, 6393, 4617, 4963, 4614) | 3788 (3819, 5130, 3742, 3788, 3691) | -23.7% |
| root-diagnostics | root error clear | 4611 (4647, 4531, 5649, 4575) | 3744 (3744, 4715, 3694, 3725, 3820) | -18.8% |
| composition-incomplete | cold completion | 2784 (2784, 2870, 2707, 2714, 2845) | 2442 (2534, 2426, 2442, 2609, 2410) | -12.3% |
| composition-incomplete | post-edit completion | 2604 (2492, 2605, 2546, 2604, 2629) | 2269 (2203, 2293, 2212, 2269, 2276) | -12.9% |
| composition-incomplete | semantic edit guard | 2.9 (2.3, 4.2, 2.1, 2.9, 2.9) | 2.2 (2.4, 2.2, 2.2, 2.1, 2.3) | n/a |
| composition-incomplete | warm completion | 0.3 (0.3, 0.3, 0.3, 0.3, 0.4) | 0.4 (0.4, 0.4, 0.3, 0.4, 0.4) | n/a |

| Mode | Baseline max sampled RSS MiB (runs) | Candidate max sampled RSS MiB (runs) |
| --- | --- | --- |
| root-incomplete | 1779, 2026, 1914, 1949, 1425 | 1609, 1603, 1615, 1595, 1574 |
| root-valid | 1658, 1724, 2077, 2064, 1923 | 1597, 1822, 1605, 1668, 1702 |
| root-hover | 2040, 1908, 2015, 2104, 1718 | 1642, 1648, 1480, 1565, 1643 |
| root-diagnostics | 1764, 2194, 2449, 2496, 2537 | 2242, 2067, 1926, 2206, 1932 |
| composition-incomplete | 1530, 1570, 1584, 1558, 1586 | 1437, 1438, 1433, 1424, 1441 |

runs: 50; identities (official probe): 1 distinct; identities (hover fork): 1 distinct
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
  workload root-valid             baseline  source 9131ee919aa1 chain aa80a7df,a3f69991,c9543c5f
  workload root-valid             candidate source b8b128fa5938 chain b116f63c,515b0748,39062568
problems: ['root-diagnostics-baseline-1: exit 1 status Failed Error: 22-second process wall limit']
