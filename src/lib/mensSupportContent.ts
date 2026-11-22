/**
 * Default ready-to-send prompts for the KeshKraft support assistant.
 *
 * Keep these as complete sentences. MensLiveChat accepts an optional
 * `starterPrompts` override so callers can supply a list for their page,
 * attachment or plan without embedding copy in the UI component.
 */
export const MENS_SUPPORT_STARTER_PROMPTS = [
  "What are the prices and durations for your men's haircuts?",
  'Which haircut would work well for thick, wavy hair?',
  'What men’s hair-colour services do you offer, and should I book a consultation first?',
  'How does the waitlist work if no appointment slots are available?',
  "Where can I see the barbers' profiles and portfolios?",
] as const;

export const MENS_SUPPORT_WELCOME_MESSAGE =
  'Welcome to KeshKraft. I’m a simulated support assistant. Ask about services, prices, barbers or the waitlist.';
