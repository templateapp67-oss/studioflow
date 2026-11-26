# NEXORA Help Centre, AI chat and WhatsApp setup

Public Knowledge Base: https://nexorasalonos.tawk.help/

The NEXORA website links to this hosted Help Centre. The Tawk chat widget runs on public NEXORA marketing pages only; tenant salon websites and the signed-in owner workspace are excluded.

## Publish the Knowledge Base (not ticketing)

Use the 19-article NEXORA Knowledge Base content pack attached to this task. Create these public top-level categories in this order:

1. Getting Started
2. Templates & Salon Categories
3. Salon Website Setup & Customization
4. Website Features & Online Booking
5. Services, Staff & Customers
6. Billing, Payments & Inventory
7. Marketing, WhatsApp & Customer Growth
8. Plans, Pricing & Features
9. Account, Privacy & Security
10. Onboarding, Growth & Partner Programmes
11. Troubleshooting & Support

Create each article with its supplied title, subtitle, category, slug and body. Set each to Public + Published. Keep categories, article pages and search enabled. Turn Ticket Form / Submit Ticket off: this is a self-service Knowledge Base, not a ticket portal.

## Enable website AI answers

1. In the Tawk property, open Add-ons > AI Assist and enable it.
2. Open Automations > Add Agent and create NEXORA Help Assistant.
3. Add these website sources: the homepage, /salon-os, /pricing, /salon-onboarding, /salon-growth, /growth-partner-rewards, /partner-rewards, /privacy, and https://nexorasalonos.tawk.help/.
4. In the agent's Knowledge sources, select the NEXORA Knowledge Base and the website sources. Refresh/re-crawl them after published website changes.
5. Assign the agent to Live Chat. Test in the preview before enabling automatic replies to visitors.
6. Enable multilingual support. Use Asia/Kolkata if the schedule is enabled.
7. Configure escalation to a human agent when an answer is missing, a customer asks for a person, or an account/payment/booking-specific issue needs checking.

### Recommended AI agent instructions

> You are the NEXORA SalonOS Help Assistant. Answer questions about NEXORA SalonOS, its public website, templates, salon categories, account setup, services, website customisation, online bookings, staff, customer tools, pricing and published features.
>
> Use only the connected NEXORA website pages and NEXORA Knowledge Base as sources. Reply in the visitor's language. Use simple Indian English, Hindi or Hinglish. Keep answers clear and practical, and provide the relevant official NEXORA page or Help Centre article when useful.
>
> Never guess a price, feature limit, plan entitlement, payment status, booking availability, support response time, integration status or account-specific detail. If the answer is not present in the sources, say that it is not confirmed in the published information and offer a human handover.
>
> Never ask for passwords, OTPs, card numbers, UPI PINs or other sensitive credentials. Do not claim to have changed an account, appointment, subscription or payment. Do not promise rankings, revenue or customer growth.

## Connect the WhatsApp AI assistant

The website WhatsApp button opens a normal click-to-chat conversation with NEXORA's support number +91 7852877721. The website embed alone does not turn WhatsApp into an AI bot.

To make the same AI agent answer WhatsApp messages through Tawk:

1. Confirm +91 7852877721 is a WhatsApp Business number that the business owner/admin can verify.
2. In Tawk, open Administration > Integrations > Messaging > WhatsApp > Install and connect with the authorised Meta Business Manager account. Complete number verification.
3. If the number already runs in the WhatsApp Business App, check whether WhatsApp Coexistence is available for the account. It may allow the Business App to keep working while one-to-one conversations sync to Tawk.
4. Open Automations > Agents > NEXORA Help Assistant > Channels and enable the connected WhatsApp inbox.
5. Test an incoming WhatsApp message from a separate customer phone. Confirm the AI answer arrives and a human handover reaches the Tawk inbox.

This is a provider-managed WhatsApp Business Platform integration; NEXORA does not need a custom WhatsApp API server for this flow. Meta/Tawk account authorisation and phone verification are still required. If the number cannot be connected or verified, click-to-chat continues to work but AI replies on WhatsApp will not be active.

## Test before launch

Test these questions: how many templates and categories; which template is for a barber shop; how to create a salon website; whether customers can book online; which plan includes staff management; which plan includes WhatsApp Business API; what annual pricing includes; and how to contact a human.

Check desktop and mobile. Confirm the Help Centre link opens the published KB, Tawk chat appears bottom-left, WhatsApp opens the correct number and unknown questions are handed to a human rather than guessed.

## Official provider guides

- AI Assist: https://help.tawk.to/article/getting-started-with-ai-assist
- WhatsApp connection: https://help.tawk.to/article/connecting-whatsapp-to-tawkto
- WhatsApp Coexistence: https://help.tawk.to/article/connecting-whatsapp-to-tawkto-with-whatsapp-coexistence
- AI escalation: https://help.tawk.to/article/how-to-train-apollo-ai-to-transfer-chats-to-human-agents
- Knowledge Base articles: https://help.tawk.to/article/creating-a-new-knowledge-base-article
- Tawk privacy: https://www.tawk.to/privacy-policy/

Important: Website code and this guide do not enable AI Assist or connect a WhatsApp number inside Tawk/Meta. Those account-side switches and verifications must be completed in the authenticated provider dashboard.
