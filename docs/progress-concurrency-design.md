# Protect a newer practice record

The current vocabulary code keeps a visit's boxes in memory. A whole-record write
from an older tab can erase another tab's completed answer, even when both records
are valid. A visibility message alone does not coordinate simultaneous writers.

Keep each visit's questions and practice counts independent. Before an automatic
write, take a short exclusive origin-scoped Web Lock, then compare the current raw
record with the exact bytes last read/written by that visit. A changed record is
preserved; that stale visit can still answer and export its own JSON. Do not merge
independent answers into an invented combined fluency score. A valid explicit
restore may replace the browser record deliberately.

The [Web Locks specification](https://w3c.github.io/web-locks/) defines the lock's
exclusive scope and release when the callback settles. The critical section here
contains only a synchronous read/compare/write; it holds no network operation.
A queued save has a two-second acquisition deadline and a visible backup route.
An environment without the coordination API keeps answers for the visit and
reports that browser persistence is unavailable. It does not silently claim a
protected automatic save.

Capture a snapshot when saving. Serial writes from one tab must retain newer
answers, and a valid restore supersedes its older pending snapshots. A storage
event can warn early; the locked reread, not event delivery, decides whether an
automatic write may proceed. Reread actual bytes when handling an event so a late
event cannot invalidate a newer completed restore.

The diagram and current question remain operable while a write waits. A restored
file creates its new question immediately; its durability message follows the
actual write. A later file selection must not inherit an older completion message.

    answer -> visit boxes -> snapshot -> exclusive lock -> compare raw record
                                                  |
                              same record --------+--> save -> release
                              changed record -----+--> preserve -> JSON backup
                              wait expires -------+--> visit only -> JSON backup

This coordinates updated tabs. A previously loaded older version that does not
request the lock remains a non-cooperating writer; document that boundary rather
than claiming protection against all possible storage mutations.
