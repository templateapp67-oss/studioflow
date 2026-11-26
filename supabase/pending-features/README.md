# Preserved source outside the WhatsApp release

These files are not active Supabase migrations. They are retained byte-for-byte
from unrecorded local drafts so their feature implementations are not lost.

The owner's 2026-11-17 live catalog shows missing dependencies and incompatible
existing objects. For example, the live loyalty_rewards table uses owner_id and
required_points, while a deferred feature draft expects another contract; the
academy enquiry table required by the city patch is absent. Replaying an old
branch-slot definition would replace a different live implementation.

Fifteen feature/security drafts require their own reviewed rollout. The
alternate WhatsApp test-ledger draft is superseded by the recorded canonical
ledger and limiter rename and must not create a second counter store.

See docs/integrations/restored-supabase-history.json for the exact classification,
original hashes and canonical sources. Offline feature tests explicitly read
these files as proposed feature contracts. Those tests do not prove that the
features are deployed or working against the current live database.

Do not copy these files back into the automatic migration directory or mark
their versions applied merely to silence a history discrepancy.
