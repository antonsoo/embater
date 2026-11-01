# Stalled source and study recovery

This follow-up to the [published vocabulary audit](vocabulary-audit.md) operates
the unchanged hosted application, with workers blocked to keep the injected
network stalls from being bypassed by good cached bytes.

In both Chromium and Firefox, hold the real printed-page-71 request until the
source reader's configured 15-second deadline expires. The unverified image stays
hidden and the reader presents a recovery message. Hold the same request through
the illustrated study's 20-second deadline: no file appears, the save button is
enabled again, and the failure message remains visible.

Release the stall, reopen the checked page, and save an actual illustrated study.
The recovered file contains the eye phrase and correct source page; practice
boxes remain unchanged. Both engines then still pass the protected-progress
backup and explicit valid restore. All four ordinary source/native-file/offline
journeys also pass in the same run. See the [receipt](vocabulary-audit/public-deadlines.json)
and [driver output](vocabulary-audit/public-deadlines.txt).

`npm run test:vocabulary -- https://antonsoo.github.io/embater/ /tmp/embater-deadlines`
now includes these elapsed-deadline and successful retry cases. This extends the
verification driver; no application code or reviewed Pages byte changed.
