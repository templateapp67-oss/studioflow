import "dotenv/config";
import {sitemapHandler} from "./server/sitemap";
import {bookingEmailHandler,emailStatusHandler} from "./server/bookingEmail";
import express from "express";
import { createServer } from "node:http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  VEDA_AI_MODE_IDS,
  VEDA_AI_SYSTEM_PROMPT,
  buildVedaAiPrompt,
  buildVedaFallbackContent,
  sanitizeVedaAiContent,
  type VedaAiDetails,
} from "./src/lib/vedaSanjeevaniAi";
import { nexoraDemoLeadHandler } from "./server/nexoraDemoLead";
import { nexoraDemoLeadsAdminHandler } from "./server/nexoraDemoLeads";
import {
  apiErrorHandler,
  asArray,
  asNumber,
  asObject,
  asString,
  asyncHandler,
  installProcessGuards,
  sendJson,
} from "./server/httpSafety";
import { rateLimit } from "./server/rateLimit";
import { optionalVerifiedUser, requireVerifiedUser } from "./server/supabaseAuth";

/** Rejects huge or malformed bodies before they reach the AI provider. */
function normalizeVedaDetails(input: any): VedaAiDetails | null {
  if (!input || typeof input !== 'object') return null;
  const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const businessName = clip(input.businessName, 120) || 'Veda Sanjeevani Ayurvedic Wellness & Spa';
  const services = Array.isArray(input.services)
    ? input.services.slice(0, 30).map((service: any) => ({
        id: clip(service?.id, 60),
        name: clip(service?.name, 90),
        category: clip(service?.category, 60),
        price: Number.isFinite(Number(service?.price)) ? Number(service.price) : null,
        durationMinutes: Number.isFinite(Number(service?.durationMinutes)) ? Number(service.durationMinutes) : 60,
      })).filter((service: any) => service.name)
    : [];
  return {
    businessName,
    city: clip(input.city, 80),
    address: clip(input.address, 200),
    category: clip(input.category, 80) || 'Ayurvedic wellness spa',
    tagline: clip(input.tagline, 160),
    phone: clip(input.phone, 30),
    about: clip(input.about, 800),
    services,
    tone: clip(input.tone, 160),
  };
}

/** Models occasionally wrap JSON in ``` fences — accept both. */
function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const portArg = process.argv.indexOf('--port');
  const PORT = Number(portArg>=0?process.argv[portArg+1]:process.env.PORT||3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('Invalid server port');

  // Behind a proxy (Vercel sets VERCEL=1) the caller address arrives in
  // x-forwarded-for. `trust proxy` is enabled only there or when TRUST_PROXY is
  // set explicitly, so a directly exposed server cannot be spoofed into
  // resetting its own rate-limit budget with a forged header.
  const trustProxy = process.env.TRUST_PROXY || (process.env.VERCEL ? '1' : '');
  if (trustProxy) app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');

  // AI prompts are small; capping the body keeps a large payload from reaching
  // the provider or the JSON parser's memory.
  app.use(express.json({ limit: '256kb' }));

  // Defence in depth behind asyncHandler: a stray rejection is logged instead of
  // taking the API down. See server/httpSafety.ts for the full rationale.
  installProcessGuards();

  // Per-caller budgets for the cost-bearing AI routes. Each request costs a
  // Gemini call, so the ceiling is deliberately low; verified owners get their
  // own budget keyed by user id instead of sharing their network address.
  const AI_WINDOW_MS = 10 * 60 * 1000;
  const aiLimiters = {
    bio: rateLimit({ name: 'generate-bio', windowMs: AI_WINDOW_MS, max: 20 }),
    promoImage: rateLimit({ name: 'generate-promo-image', windowMs: AI_WINDOW_MS, max: 10 }),
    promoCopy: rateLimit({ name: 'generate-promo-copy', windowMs: AI_WINDOW_MS, max: 30 }),
    veda: rateLimit({ name: 'veda-website-content', windowMs: AI_WINDOW_MS, max: 15 }),
    recommendations: rateLimit({
      name: 'ai-recommendations',
      windowMs: AI_WINDOW_MS,
      max: 30,
      authenticatedMax: 120,
    }),
  };
  // Sign-in is required for the four owner-workspace generators. The customer
  // recommendation route stays readable without an account and is limited
  // anonymously instead.
  const requireSignedIn = requireVerifiedUser();
  const identifyCustomer = optionalVerifiedUser();

  // Optional demo/preview entry: when PREVIEW_TEMPLATE is set (e.g. "prism-chroma"),
  // the site root opens that template directly. Off by default — no effect in production.
  const previewTemplate = (process.env.PREVIEW_TEMPLATE || '').trim();
  if (previewTemplate) {
    app.get("/", (req, res, next) => {
      if (Object.keys(req.query || {}).length > 0) return next();
      return res.redirect(302, `/?template=${encodeURIComponent(previewTemplate)}`);
    });
  }

  app.get("/sitemap.xml", sitemapHandler);

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "StudioFlow White-label Salon OS" });
  });

  // Demo enquiries are handled by one shared server-side implementation that
  // is used by both this Express server and the Vercel function
  // `api/nexora-demo-lead.ts`. Credentials never enter browser code, the
  // enquiry is stored by the `submit-landing-lead` Supabase Edge Function in
  // the private `public.landing_leads` table, and the durable rate limit of
  // that function applies across every instance.
  app.post("/api/nexora-demo-lead", asyncHandler(async (req, res) => {
    await nexoraDemoLeadHandler(
      {
        method: req.method,
        body: req.body,
        headers: req.headers as Record<string, string | string[] | undefined>,
        get: (name: string) => req.get(name),
        ip: req.ip,
      },
      res,
    );
  }));

  // Manager-only operations on the demo-request register (listing, export and
  // erasure on request). The manager role is taken from the signed JWT's
  // server-controlled `app_metadata.site_role` claim.
  app.post("/api/nexora-demo-leads", asyncHandler(async (req, res) => {
    await nexoraDemoLeadsAdminHandler(
      {
        method: req.method,
        body: req.body,
        headers: req.headers as Record<string, string | string[] | undefined>,
        get: (name: string) => req.get(name),
      },
      res,
    );
  }));

  // AI Bio Generation Route with Gemini
  app.post("/api/generate-bio", requireSignedIn, aiLimiters.bio, asyncHandler(async (req, res) => {
    // Validated once, so neither the prompt nor the fallback can be handed a
    // non-string (an object with `.replace` missing used to throw in `catch`).
    const input = asObject(req.body);
    const businessName = asString(input.businessName, 120);
    const businessType = asString(input.businessType, 60);
    const ownerName = asString(input.ownerName, 80);
    const vibe = asString(input.vibe, 80);
    const specialties = asString(input.specialties, 200);
    try {

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback response if key is missing
        return res.json({
          source: "template",
          tagline: `Elevating ${(businessType || "salon").replace('_', ' ')} with bespoke luxury & precision care.`,
          bio: `Welcome to ${businessName || "our studio"}, founded by ${ownerName || "our team"}. We are a modern sanctuary dedicated to ${specialties || 'exceptional salon services'}. Blending a ${vibe || 'luxury'} aesthetic with high-performance organic products, our mission is to make every client feel renewed and confident.`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `Write a high-converting tagline (max 10 words) and a compelling salon story/about bio (2-3 sentences) for a beauty business with the following details:
Salon Name: ${businessName}
Category: ${businessType}
Founder: ${ownerName}
Atmosphere/Vibe: ${vibe}
Specialties: ${specialties}

Return strictly valid JSON in this format:
{"tagline": "...", "bio": "..."}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({ source: "ai", ...parsed });
      } else {
        throw new Error('Empty AI response');
      }
    } catch (err) {
      console.error('Gemini generation error:', err);
      // Fallback
      return res.json({
        source: "template",
        tagline: `Redefining beauty & relaxation in a luxury space.`,
        bio: `Welcome to ${businessName || 'our studio'}. Our passionate team offers bespoke salon treatments designed to accentuate your unique natural style.`
      });
    }
  }));

  // Promotional Image Generation Endpoint with Gemini
  app.post("/api/generate-promo-image", requireSignedIn, aiLimiters.promoImage, asyncHandler(async (req, res) => {
    const input = asObject(req.body);
    const prompt = asString(input.prompt, 1200);
    const serviceName = asString(input.serviceName, 120);
    const category = asString(input.category, 80);
    const style = asString(input.style, 80);
    const aspectRatio = asString(input.aspectRatio, 10) || '1:1';
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      const detailedPrompt = prompt || `A professional, ultra-high quality, editorial advertising photo for a luxury salon promoting "${serviceName}" in the "${category || 'Beauty & Wellness'}" category. Aesthetic: ${style || 'Luxury Chic & Modern Elegance'}, warm studio lighting, pristine clean background, 8k resolution commercial photoshoot.`;

      if (!apiKey) {
        return res.json({
          success: false,
          fallbackNotice: "No GEMINI_API_KEY configured. Using high-resolution curated asset.",
          imageUrl: null,
          promptUsed: detailedPrompt
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const chosenAspect = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: detailedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: chosenAspect,
          },
        },
      });

      let generatedImageUrl: string | null = null;
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (generatedImageUrl) {
        return res.json({
          success: true,
          imageUrl: generatedImageUrl,
          promptUsed: detailedPrompt,
        });
      } else {
        return res.json({
          success: false,
          imageUrl: null,
          promptUsed: detailedPrompt,
          notice: "Image generation model returned without an inline image part; using curated backup."
        });
      }
    } catch (err: any) {
      console.error("Gemini Image generation error:", err?.message || err);
      return res.json({
        success: false,
        imageUrl: null,
        error: err?.message || "Failed to generate promotional image with AI.",
      });
    }
  }));

  // Promotional Copy and Caption Generation Endpoint
  app.post("/api/generate-promo-copy", requireSignedIn, aiLimiters.promoCopy, asyncHandler(async (req, res) => {
    // `offer` used to be interpolated with truthiness checks and then
    // `.toUpperCase()`-d in the fallback: a truthy non-string threw inside the
    // catch block and took the process down. It is a bounded string now.
    const input = asObject(req.body);
    const businessName = asString(input.businessName, 120);
    const serviceName = asString(input.serviceName, 120);
    const price = asNumber(input.price, 0, 0, 10_000_000);
    const offer = asString(input.offer, 80);
    const city = asString(input.city, 80);
    const discountPercent = asNumber(input.discountPercent, 0, 0, 100);
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          whatsapp: `✨ *EXCLUSIVE SALON OFFER* ✨\n\nHey beautiful! Treat yourself to *${serviceName}* at *${businessName}* in ${city || 'our studio'}.\n\n🎉 *Special Offer*: ${offer || `${discountPercent || 20}% OFF this week!`}\n💰 *Price*: ₹${price ? Number(price).toLocaleString('en-IN') : 'Special Rate'}\n\n📍 Visit us at: ${city || 'Indiranagar, Bengaluru'}\n📲 Reserve your slot now before slots fill up!`,
          instagramCaption: `✨ Glow up season is here! ✨\n\nExperience pure relaxation with our signature *${serviceName}* at ${businessName}.\n\n💎 *Special Deal*: ${offer || `Enjoy ${discountPercent || 20}% OFF for a limited time!`}\n⭐ Price: ₹${price ? Number(price).toLocaleString('en-IN') : 'Special Rate'}\n\n📍 ${city || 'Bengaluru'} | ⏰ Limited slots available\n\n👇 Tap the link in bio to book your appointment!\n\n#SalonOffers #${businessName?.replace(/\s+/g, '') || 'Salon'} #${serviceName?.replace(/\s+/g, '') || 'Beauty'} #SelfCare #GlowUp #HairAndSkin #BridalBeauty #SalonDeals`,
          headline: `Transform Your Look with ${serviceName}`,
          badgeText: offer ? offer.toUpperCase() : `SPECIAL ${discountPercent || 20}% OFF`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are an elite beauty salon social media marketing copywriter. Create promotional copy for a salon service with these details:
Salon: ${businessName}
Service: ${serviceName}
Price: ₹${price}
Special Offer: ${offer || `${discountPercent || 20}% OFF`}
City: ${city || 'India'}

Return strictly JSON with the following keys:
{
  "whatsapp": "A high-converting WhatsApp message with emojis, clear bullet points, price details, and a booking call-to-action.",
  "instagramCaption": "An engaging Instagram caption with hook, offer details, CTA ('Link in bio to book'), and 10 relevant hashtags.",
  "headline": "A short, punchy promotional banner headline (max 6 words)",
  "badgeText": "Short badge text for image corner (e.g. '20% OFF TODAY' or 'FESTIVE SPECIAL', max 4 words)"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      if (text) {
        return res.json({ source: "ai", ...JSON.parse(text) });
      }
      throw new Error("Empty copy response");
    } catch (err) {
      console.error("Copy generation error:", err);
      return res.json({
        source: "template",
        whatsapp: `✨ *EXCLUSIVE SALON OFFER* ✨\n\nHey beautiful! Treat yourself to *${serviceName || 'our signature treatment'}* at *${businessName || 'our salon'}*.\n\n🎉 *Special Deal*: ${offer || 'Exclusive Discount This Week'}\n💰 *Price*: ₹${price ? price.toLocaleString('en-IN') : 'Special Rate'}\n\n📲 Book your appointment now!`,
        instagramCaption: `✨ Elevate your everyday glow! ✨\n\nBook your *${serviceName || 'treatment'}* today at ${businessName || 'our studio'}.\n\n👇 Tap link in bio to book your appointment!\n\n#Salon #Beauty #SelfCare #SalonDeals`,
        headline: `Special Offer: ${serviceName || 'Signature Service'}`,
        badgeText: offer ? offer.toUpperCase() : 'LIMITED SPECIAL'
      });
    }
  }));

  /**
   * Template 14 — Veda Sanjeevani AI website content.
   *
   * The browser only ever sends business details; the Gemini key stays here.
   * Without a key (or if the provider fails) the endpoint still answers with an
   * honest, brand-specific draft produced by the shared template library, so the
   * "Generate my website content" button always does something useful.
   */
  app.post("/api/veda-website-content", requireSignedIn, aiLimiters.veda, asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const mode = (VEDA_AI_MODE_IDS as readonly string[]).includes(body.mode) ? body.mode : 'all';
    const details = normalizeVedaDetails(body.details);
    if (!details) {
      return res.status(400).json({ error: 'Add your business name before generating content.' });
    }
    const fallback = () =>
      res.json({
        source: 'template',
        mode,
        content: buildVedaFallbackContent(mode as any, details),
        notice: 'No GEMINI_API_KEY is configured on this server, so the template drafted this content. Every line is editable.',
      });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return fallback();

    try {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await withTimeout(
        ai.models.generateContent({
          model: process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',
          contents: `${buildVedaAiPrompt(mode as any, details)}\n\nRequested task: ${mode}`,
          config: { responseMimeType: 'application/json', systemInstruction: VEDA_AI_SYSTEM_PROMPT, temperature: 0.8 },
        }),
        45000,
        'The AI service took too long to respond',
      );
      const text = typeof response.text === 'string' ? response.text : '';
      if (!text.trim()) throw new Error('Empty AI response');
      const parsed = JSON.parse(stripJsonFence(text));
      const content = sanitizeVedaAiContent(parsed.content ?? parsed);
      if (!content || Object.keys(content).length === 0) throw new Error('AI response had no usable sections');
      return res.json({
        source: 'ai',
        mode,
        content,
        notice: 'Written by AI from the details you supplied. Read it through and edit anything that does not sound like your studio before publishing.',
      });
    } catch (error) {
      console.error('Veda AI content error:', error);
      const draft = buildVedaFallbackContent(mode as any, details);
      return res.json({
        source: 'template',
        mode,
        content: draft,
        notice: 'The AI service could not be reached just now, so the template drafted this instead. Try again in a moment, or edit this copy directly.',
      });
    }
  }));

  // AI Personalized Recommendations Endpoint with Gemini
  app.post("/api/ai-recommendations", identifyCustomer, aiLimiters.recommendations, asyncHandler(async (req, res) => {
    // Every field is validated before use. A body of `null`, a string or an
    // object where an array is expected used to throw inside this handler and,
    // because the old fallback re-read the same unvalidated value, inside the
    // `catch` block too — which killed the process. Nothing below can throw on
    // a hostile body: the fallback is built from the validated values only.
    const body = asObject(req.body);
    const bookingHistory = asArray(body.bookingHistory, 10);
    const favorites = asArray(body.favorites, 20);
    const availableServices = asArray<Record<string, unknown>>(body.availableServices, 30);

    const fallback = (reason: string) => ({
      source: 'template' as const,
      recommendations: availableServices.slice(0, 4).map((service) => ({
        salonSlug: asString(service?.salonSlug, 80),
        serviceId: asString(service?.serviceId, 80),
        serviceName: asString(service?.serviceName, 120),
        aiReason: reason,
      })).filter((service) => service.serviceName),
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || availableServices.length === 0) {
      return sendJson(res, 200, fallback('Based on the services you have been browsing, this signature treatment is curated for you.'));
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are an AI beauty and wellness concierge for Nexora salon platform.
User's past booking history: ${JSON.stringify(bookingHistory)}
User's favorite salons: ${JSON.stringify(favorites)}
Available services across salons: ${JSON.stringify(availableServices.map((s, i) => ({ id: i, salonSlug: asString(s?.salonSlug, 80), serviceId: asString(s?.serviceId, 80), name: asString(s?.serviceName, 120), category: asString(s?.category, 60), price: asNumber(s?.price, 0) })))}

Select up to 4 best matching services from the available services based on the user's history and preferences, and write a short, engaging, personalized AI recommendation reason ("aiReason") for each.
Return strictly valid JSON in this format:
{"recommendations": [{"index": number, "aiReason": "..."}]}`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        }),
        20000,
        'The AI service took too long to respond',
      );

      const text = typeof response.text === 'string' ? response.text : '';
      if (!text.trim()) throw new Error('Empty AI recommendations response');

      const parsed = JSON.parse(stripJsonFence(text)) as { recommendations?: unknown };
      const recommendations = asArray<Record<string, unknown>>(parsed?.recommendations, 4)
        .map((item) => {
          const index = Math.trunc(asNumber(item?.index, -1, -1, availableServices.length - 1));
          const service = index >= 0 ? availableServices[index] : undefined;
          return {
            salonSlug: asString(service?.salonSlug, 80),
            serviceId: asString(service?.serviceId, 80),
            serviceName: asString(service?.serviceName, 120),
            aiReason: asString(item?.aiReason, 400),
          };
        })
        .filter((item) => item.serviceName && item.aiReason);

      if (recommendations.length === 0) throw new Error('AI response had no usable recommendations');
      return sendJson(res, 200, { source: 'ai', recommendations });
    } catch (error) {
      console.error('AI recommendations error:', error instanceof Error ? error.message : error);
      return sendJson(res, 200, fallback('Curated recommendation matching your style and beauty preferences.'));
    }
  }));

  // Email Service Status Endpoint (legacy path preserved)
  app.get("/api/email-service-status", emailStatusHandler);

  // Automated Booking Email Endpoint (Resend integration). The shared handler
  // authenticates the caller, uses booking RLS and binds the recipient to the
  // stored booking before delivery.
  app.post("/api/send-booking-email", bookingEmailHandler);

  // Terminal error handler: an unexpected throw becomes a logged 500 JSON
  // response instead of an unhandled rejection that stops the server.
  app.use(apiErrorHandler());

  // Optional direct template preview, used only when explicitly enabled in development.
  // Query-string routes (including published sites and other templates) are unchanged.
  if (process.env.NODE_ENV !== "production" && /^[a-z_]+$/.test(process.env.STUDIOFLOW_PREVIEW_TEMPLATE || "")) {
    app.get("/", (req, res, next) => {
      if (req.originalUrl !== "/") return next();
      return res.redirect(302, `/?template=${encodeURIComponent(process.env.STUDIOFLOW_PREVIEW_TEMPLATE!)}`);
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const disableHmr = process.env.DISABLE_HMR === "true";
    // Vite still injects its client (and opens a socket) with hmr: false.
    // Supply the small CSS runtime its development transforms need instead.
    if (disableHmr) {
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(`
          const sheets = new Map();
          export function updateStyle(id, content) {
            let style = sheets.get(id);
            if (!style) { style = document.createElement('style'); style.setAttribute('data-vite-dev-id', id); document.head.appendChild(style); sheets.set(id, style); }
            style.textContent = content;
          }
          export function removeStyle(id) { const style = sheets.get(id); if (style) { style.remove(); sheets.delete(id); } }
          export function injectQuery(url, query) {
            if (!url.startsWith('.') && !url.startsWith('/')) return url;
            const pathname = url.replace(/[?#].*$/, '');
            const { search, hash } = new URL(url, 'http://vite.dev');
            return pathname + '?' + query + (search ? '&' + search.slice(1) : '') + hash;
          }
          export function createHotContext() { return { data: {}, accept() {}, acceptExports() {}, dispose() {}, prune() {}, invalidate() {}, on() {}, off() {}, send() {} }; }
          export class ErrorOverlay extends HTMLElement {}
        `);
      });
    }
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'], hmr: disableHmr ? false : { server: httpServer } },
      appType: "spa",
    });
    // Serve route-owned login metadata while preserving auth/template query state.
    app.get(/^\/login\/?$/, (req, _res, next) => {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = '/login.html' + query;
      next();
    });
    app.all("/api/*", (_req, res) => {
      res.status(404).json({error:'Unknown API endpoint'});
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // `redirect: false` keeps the marketing documents on their canonical,
    // slash-free URLs. Without it `express.static` answers `/pricing` with a
    // 301 to `/pricing/`, which contradicts the canonical link in the
    // document and differs from the Vercel rewrite.
    app.use(express.static(distPath, { redirect: false }));
    app.all("/api/*", (_req, res) => {
      res.status(404).json({error:'Unknown API endpoint'});
    });
    app.get(/^\/login\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "login.html"));
    });
    // The SalonOS landing page ships as its own prerendered document.
    app.get(/^\/salon-os\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "salon-os", "index.html"));
    });
    app.get(/^\/pricing\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "pricing", "index.html"));
    });
    app.get(/^\/privacy\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "privacy", "index.html"));
    });
    // The NEXORA marketing routes ship their own prerendered documents too, so
    // the production server never answers them with the homepage shell.
    app.get(/^\/salon-onboarding\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "salon-onboarding", "index.html"));
    });
    app.get(/^\/salon-growth\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "salon-growth", "index.html"));
    });
    app.get(/^\/growth-partner-rewards\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "growth-partner-rewards", "index.html"));
    });
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`StudioFlow Salon OS running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
