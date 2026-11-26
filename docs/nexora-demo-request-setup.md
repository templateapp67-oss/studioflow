# Nexora demo-request integration

The modular SalonOS landing page is available at `/salon-os`, and the detailed pricing page remains at `/pricing`. Both share the same demo dialog, which posts to the same-origin server endpoint `POST /api/nexora-demo-lead`. The browser never receives CRM credentials. The server validates the required fields and consent, applies a small in-process request limit, rejects non-HTTPS CRM URLs, applies an eight-second timeout, and only reports success after the configured receiver returns a 2xx response.

## Configure before accepting real demo requests

Set these variables in the server's secret/environment configuration (never as `VITE_*` variables):

- `NEXORA_CRM_LEAD_ENDPOINT` — verified HTTPS endpoint that accepts the JSON payload described below.
- `NEXORA_CRM_LEAD_TOKEN` — optional bearer credential if required by that receiver. Store it only in server secrets.

If the endpoint is absent or invalid, the server returns `503` and the UI tells the visitor the request was not sent. Do not tell visitors their request was received until the CRM endpoint has acknowledged it.

## Payload

```json
{
  "name": "...",
  "email": "...",
  "salonName": "...",
  "phone": null,
  "city": null,
  "consent": true,
  "source": "nexora-pricing-demo"
}
```

Configure the receiver to return a 2xx response only after it has accepted the lead. The demo form does not persist leads locally. The in-memory request limiter is best-effort and is not a substitute for edge/WAF rate limiting in production.

## Deliberately omitted

No countdown or deadline is displayed because no approved campaign deadline was provided. No video embed, testimonials, review ratings, partner logos, or ROI metrics are shown because the attached README marks these as sample content and supplies no verified replacement assets or data. Annual plan totals use the previously approved values; monthly prices remain unavailable, and annual prices are GST-inclusive per the user's confirmation.
