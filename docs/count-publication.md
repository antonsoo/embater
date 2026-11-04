# Count comparison publication

Verified 3 November 2026 on the canonical [Embater site](https://antonsoo.github.io/embater/compare.html#count-measuring).

The [count and transfer audit](count-audit.md) describes the reproduced defects, source boundaries and independently checked geometry. This document records what was actually published.

| Boundary | Evidence |
| --- | --- |
| Application source | `ccc135ad7102e7fe03dcac7787ea71676f14df0a`; inventory in [the clean-build inventory](count-audit/clean-build.json). The implementation and native examples were published with audit commit `eeec46b26ae27d0495fa16214497df3ff1462047`. |
| Clean installation | Node 24.22.1, npm 11.19.1, `npm ci`, checks and production build; 74 tests pass. All 89 build files match the working build byte-for-byte. |
| Deployed branch | Fast-forward Pages commit `a4f8bd63c5039e968229078d191c19edf4c7eddc`, built from those exact clean-build bytes. No branch history was rewritten. |
| Canonical hosted files | All 89 production files match under both [gzip](count-audit/public-gzip.json) and [identity](count-audit/public-identity.json) requests. The deployment's `.nojekyll` marker is separate from the build. |
| Immutable source artifacts | The same receipts compare 59 pinned raw source artifacts, including the audit, implementation, retained scans, fonts, notices and native examples. All match. |
| Hosted operation | [Eight public browser journeys](count-audit/public-reference.json): Chromium/Firefox, 1440/375 px, light/dark; real controls, exact half pitches, held source/ruler, refused imports, native downloads, source reading and controlled offline reopening. |
| Native output | [Independent public-download oracle](count-audit/public-artifacts.json) checks SVG point extents, six CSV rows, source quotes/credits, source-image identity and downloads extracted from script-free saved HTML. |
| Canonical recheck | Entry HTML, worker and source image [still match after browser operation](count-audit/public-recheck.json). |
| Remote CI | The CI and Pages Actions runs for `eeec46b` ended in failure with **zero executed steps**. They did not validate this change. Local clean checks and the separate successful legacy Pages build establish the claims above. |

The live shared source reader uses the independently reproduced 1350 × 2100 render of printed page 69 (SHA-256 `29eb1a487e566f3ea1397f96412aeb7d51504f80c01741c81325f8eab77ec3fd`). The saved count reading uses the retained 2033 × 3161 archive image of that same leaf (`783d80afa3c7401f826a74f484832d5f7e5d79255b19ae3e74b3bf35fa3878b4`). The two artifacts were checked against their own identities, not treated as interchangeable because their page labels agree.

The catalogue discovery route is reviewed separately in Officina. Physical printing, assistive-technology use and an exhaustive browser/device matrix are not claimed. No registry package or tagged release was created.
