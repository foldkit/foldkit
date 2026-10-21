| Mode | Request | Baseline median (runs, ms) | Candidate median (runs, ms) | Change |
| --- | --- | --- | --- | --- |
| root-incomplete | cold completion | 4823 (4809, 4879, 4823, 4830, 4790) | 3639 (3572, 3638, 3639, 3678, 3673) | -24.5% |
| root-incomplete | post-edit completion | 4653 (4653, 4696, 4706, 4619, 4644) | 3430 (3497, 3418, 3430, 3406, 3557) | -26.3% |
| root-incomplete | semantic edit guard | 2.5 (2.9, 2.5, 3.4, 2.2, 2.1) | 2.2 (2.2, 2.3, 2.3, 2.0, 2.2) | n/a |
| root-incomplete | warm completion | 0.4 (0.3, 0.4, 0.4, 0.5, 0.4) | 0.4 (0.4, 0.4, 0.4, 0.4, 0.4) | n/a |
| root-hover | cold root Model hover | 5199 (5589, 4988, 5199, 5422, 4802) | 3693 (3728, 3725, 3675, 3693, 3559) | -29.0% |
| root-hover | post-edit root Model hover | 4879 (4879, 5622, 4752, 4980, 4610) | 3509 (3586, 3502, 3401, 3528, 3509) | -28.1% |
| root-hover | semantic edit guard | 2.6 (2.6, 4.6, 2.2, 2.1, 5.4) | 2.1 (2.1, 2.4, 2.7, 2.1, 2.1) | n/a |
| root-hover | warm root Model hover | 0.5 (0.7, 0.5, 0.4, 0.6, 0.4) | 0.4 (0.5, 0.4, 0.5, 0.4, 0.4) | n/a |
| root-diagnostics | cold clean root diagnostics | 4894 (4894, 4829, 5246, 4986, 4786) | 4024 (4093, 4092, 3933, 3993, 4024) | -17.8% |
| root-diagnostics | root error appearance | 4695 (4548, 4749, 5734, 4574, 4695) | 3931 (4382, 3755, 3931, 3969, 3837) | -16.3% |
| root-diagnostics | root error clear | 4667 (4629, 4674, 5426, 4667, 4657) | 3837 (3748, 3775, 3837, 9409, 4212) | -17.8% |

| Mode | Baseline max sampled RSS MiB (runs) | Candidate max sampled RSS MiB (runs) |
| --- | --- | --- |
| root-incomplete | 1734, 1844, 1737, 1746, 1762 | 1667, 1598, 1675, 1641, 1614 |
| root-hover | 1752, 1621, 1780, 1924, 1624 | 1616, 1636, 1688, 1635, 1647 |
| root-diagnostics | 2564, 2418, 2123, 2326, 2421 | 2177, 1925, 2006, 1774, 1978 |

runs: 30; identities (official probe): 1 distinct; identities (hover fork): 1 distinct
  identity: {"client": "bcbe8e0f8693a2e3effb4a890a70c331153b616a4a2f88406dcffd842364a2e6", "executable": "a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2", "go": {"GODEBUG": null, "GOENV": null, "GOEXPERIMENT": null, "GOGC": null, "GOMAXPROCS": null, "GOMEMLIMIT": null}, "guard": "f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf", "native": ["@typescript/typescript-darwin-arm64", "7.0.2", "e88558e22e3db6c4da920e15a60eb2bbea801732b94aedb67e972be2a7f485b8"], "node": "v24.20.0", "probe": "1491ea5fe44f546a4adfb74126a42ec866e7235a3c62f25dead66a6b75cc1751", "server": {"name": "typescript-go", "version": "7.0.2"}, "wrapper": ["7.0.2", "2bd066d87f5bafd315be9f40889d0a60b9e58e0b", "3722b30210616a13a3213ded11575ba6b2dbab10c32a5ef67afca8513e27017e"]}
  identity: {"client": "bcbe8e0f8693a2e3effb4a890a70c331153b616a4a2f88406dcffd842364a2e6", "executable": "a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2", "go": {"GODEBUG": null, "GOENV": null, "GOEXPERIMENT": null, "GOGC": null, "GOMAXPROCS": null, "GOMEMLIMIT": null}, "guard": "f82396c66ef418574707f23e1056609be22b492308436d817d0102daefaa9eaf", "native": ["@typescript/typescript-darwin-arm64", "7.0.2", "e88558e22e3db6c4da920e15a60eb2bbea801732b94aedb67e972be2a7f485b8"], "node": "v24.20.0", "probe": "3ccab68a8d5cac56adf8c01adcea22764a7b3de57d4a58889bcb52594cf4f5ad", "server": {"name": "typescript-go", "version": "7.0.2"}, "wrapper": ["7.0.2", "2bd066d87f5bafd315be9f40889d0a60b9e58e0b", "3722b30210616a13a3213ded11575ba6b2dbab10c32a5ef67afca8513e27017e"]}
  workload root-diagnostics       baseline  source 9131ee919aa1 chain 48f2cb9e,d1ea8045,48f2cb9e
  workload root-diagnostics       candidate source b8b128fa5938 chain fab720d5,6eaae032,fab720d5
  workload root-hover             baseline  source 9131ee919aa1 chain aa80a7df,a3f69991,c9543c5f
  workload root-hover             candidate source b8b128fa5938 chain b116f63c,515b0748,39062568
  workload root-incomplete        baseline  source 9131ee919aa1 chain 595c324f,81569521,642b32e4
  workload root-incomplete        candidate source b8b128fa5938 chain d7350d34,799803ab,cc4f2edd
problems: none
