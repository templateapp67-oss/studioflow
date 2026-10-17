Campaign sender setup (server only)

The deployed sender remains disabled until these Supabase Edge secrets are configured:
- STUDIOFLOW_MARKETING_WHATSAPP_TOKEN: server-side permanent system-user token with WhatsApp messaging permission.
- STUDIOFLOW_MARKETING_WHATSAPP_PHONE_ID: registered sender phone-number ID.
- STUDIOFLOW_MARKETING_WHATSAPP_TEMPLATE: approved MARKETING template name, with IMAGE header and four positional body parameters: customer name, salon name, personalized offer text, booking URL.
- STUDIOFLOW_MARKETING_WHATSAPP_LANGUAGE: approved template language (default en_US).
- STUDIOFLOW_MARKETING_GRAPH_VERSION: a currently supported Graph version, e.g. vNN.0; no potentially stale API-version default is assumed.
- STUDIOFLOW_MARKETING_OWNER_ID: the one salon-owner auth UUID authorized to use this sender. Other salons remain disabled; do not reuse this binding for a different salon without configuring that salon's sender.

Include the customer preference URL in the approved template's static body:
https://nexora-one-white-label.templateapp67.chatgpt.site/?app=1&tab=profile
Include STOP instructions and honor replies using the owner's Do Not Contact controls. Inbound STOP webhooks and provider delivery webhooks are not implemented here. Accepted records indicate provider acceptance only, never delivery.

The owner prepares a campaign and attaches an owned uploaded ad. The review screen precedes sending. Each call claims at most ten recipients, rechecks consent/blocks before every provider request, and persists accepted/failed/unknown/skipped outcomes. Concurrent claims cannot resend processing/accepted rows. Expired processing rows become unknown and are not retried automatically. Unknown outcomes require reconciliation in WhatsApp Manager.

No secrets belong in the website bundle or repository. No production messages are sent by verification tests; SQL fixtures roll back and transport tests use mock responses.
