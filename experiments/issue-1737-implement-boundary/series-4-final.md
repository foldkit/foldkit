| Mode | Request | Baseline median (runs, ms) | Candidate median (runs, ms) | Change |
| --- | --- | --- | --- | --- |
| root-incomplete | cold completion | 4886 (4926, 5226, 4882, 4886, 4803) | 3596 (3591, 3581, 3613, 3596, 3614) | -26.4% |
| root-incomplete | post-edit completion | 4665 (4665, 4665, 4707, 4722, 4567) | 3465 (3465, 3387, 3532, 3369, 3495) | -25.7% |
| root-incomplete | semantic edit guard | 2.5 (2.5, 2.2, 2.2, 3.1, 3.4) | 2.8 (3.0, 2.1, 2.8, 2.0, 6.8) | n/a |
| root-incomplete | warm completion | 0.4 (0.4, 0.6, 0.4, 0.4, 0.5) | 0.4 (0.4, 0.4, 0.4, 0.4, 0.4) | n/a |
| root-valid | cold completion | 4934 (4946, 4864, 5032, 4934, 4780) | 3633 (3633, 3736, 3617, 3592, 3796) | -26.4% |
| root-valid | post-edit completion | 4671 (4653, 4671, 4823, 4639, 5471) | 3428 (3428, 3494, 3426, 3388, 3739) | -26.6% |
| root-valid | semantic edit guard | 2.6 (2.6, 2.6, 2.4, 3.1, 9.3) | 2.2 (2.1, 2.2, 2.3, 2.1, 2.4) | n/a |
| root-valid | warm completion | 0.4 (0.4, 0.4, 0.4, 0.4, 0.3) | 0.4 (0.4, 0.3, 0.4, 0.4, 0.4) | n/a |
| root-hover | cold root Model hover | 4873 (5006, 4873, 4769, 5376, 4809) | 3611 (3611, 3587, 3772, 3587, 3614) | -25.9% |
| root-hover | post-edit root Model hover | 4621 (5254, 4561, 4547, 4993, 4621) | 3439 (3439, 3436, 3594, 3467, 3437) | -25.6% |
| root-hover | semantic edit guard | 2.3 (3.6, 2.3, 2.3, 2.4, 2.3) | 2.1 (2.0, 2.1, 2.2, 2.0, 2.6) | n/a |
| root-hover | warm root Model hover | 0.4 (0.4, 0.4, 0.4, 0.7, 0.5) | 0.5 (0.6, 0.4, 0.5, 0.5, 0.5) | n/a |
| root-diagnostics | cold clean root diagnostics | 4794 (4848, 4790, 4764, 4816, 4794) | 3967 (3909, 4301, 3970, 3945, 3967) | -17.3% |
| root-diagnostics | root error appearance | 4664 (4633, 4664, 4630, 4693, 4671) | 3755 (3878, 3750, 3754, 3816, 3755) | -19.5% |
| root-diagnostics | root error clear | 4643 (4551, 4643, 4562, 4705, 4667) | 3838 (3923, 3838, 3819, 3744, 3925) | -17.3% |
| composition-incomplete | cold completion | 2743 (2854, 2708, 2696, 2743, 2751) | 2430 (2392, 2402, 2588, 2430, 2542) | -11.4% |
| composition-incomplete | post-edit completion | 2543 (2509, 2543, 2558, 2718, 2476) | 2275 (2275, 2190, 2239, 2310, 2337) | -10.6% |
| composition-incomplete | semantic edit guard | 4.8 (3.3, 5.4, 2.0, 7.3, 4.8) | 2.4 (2.1, 2.1, 2.5, 3.1, 2.4) | n/a |
| composition-incomplete | warm completion | 0.4 (0.4, 0.3, 0.3, 0.4, 0.4) | 0.3 (0.3, 0.3, 0.4, 0.3, 0.4) | n/a |

| Mode | Baseline max sampled RSS MiB (runs) | Candidate max sampled RSS MiB (runs) |
| --- | --- | --- |
| root-incomplete | 1742, 1724, 1730, 2068, 1863 | 1533, 1602, 1520, 1656, 1721 |
| root-valid | 1749, 1775, 1746, 1928, 2102 | 1592, 1570, 1595, 1555, 1583 |
| root-hover | 1722, 2114, 2092, 1819, 2073 | 1633, 1631, 1561, 1610, 1646 |
| root-diagnostics | 2535, 2397, 2545, 2454, 2536 | 1850, 1907, 2298, 2168, 2156 |
| composition-incomplete | 1526, 1568, 1585, 1377, 1529 | 1428, 1381, 1367, 1366, 1412 |

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
problems: none
