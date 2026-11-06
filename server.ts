import "dotenv/config";
import {sitemapHandler} from "./server/sitemap";
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


const bookingEmailWindows = new Map<string, { count: number; resetAt: number }>();

function cleanEmailText(value: unknown, max = 200): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function escapeEmailHtml(value: unknown, max = 200): string {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return cleanEmailText(value, max).replace(/[&<>"']/g, character => replacements[character] ?? character);
}

async function getAuthenticatedEmail(authorization?: string): Promise<string | null> {
  if (!authorization || !/^Bearer\s+\S+/i.test(authorization)) return null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const publicKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publicKey) return null;
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { apikey: publicKey, Authorization: authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id && typeof user.email === 'string' ? user.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

function consumeBookingEmailQuota(email: string): boolean {
  const now = Date.now();
  const current = bookingEmailWindows.get(email);
  if (!current || current.resetAt <= now) {
    bookingEmailWindows.set(email, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self), payment=(self), usb=()');
    next();
  });
  const httpServer = createServer(app);
  const portArg = process.argv.indexOf('--port');
  const PORT = Number(portArg>=0?process.argv[portArg+1]:process.env.PORT||3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('Invalid server port');

  app.use(express.json({ limit: '100kb' }));

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

  // AI Bio Generation Route with Gemini
  app.post("/api/generate-bio", async (req, res) => {
    try {
      const { businessName, businessType, ownerName, vibe, specialties } = req.body;

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
        bio: `Welcome to ${req.body.businessName || 'our studio'}. Our passionate team offers bespoke salon treatments designed to accentuate your unique natural style.`
      });
    }
  });

  // Promotional Image Generation Endpoint with Gemini
  app.post("/api/generate-promo-image", async (req, res) => {
    try {
      const { prompt, serviceName, category, style, aspectRatio = "1:1" } = req.body;
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
  });

  // Promotional Copy and Caption Generation Endpoint
  app.post("/api/generate-promo-copy", async (req, res) => {
    try {
      const { businessName, serviceName, price, offer, city, discountPercent } = req.body;
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
        whatsapp: `✨ *EXCLUSIVE SALON OFFER* ✨\n\nHey beautiful! Treat yourself to *${req.body.serviceName || 'our signature treatment'}* at *${req.body.businessName || 'our salon'}*.\n\n🎉 *Special Deal*: ${req.body.offer || 'Exclusive Discount This Week'}\n💰 *Price*: ₹${req.body.price || 'Special Rate'}\n\n📲 Book your appointment now!`,
        instagramCaption: `✨ Elevate your everyday glow! ✨\n\nBook your *${req.body.serviceName || 'treatment'}* today at ${req.body.businessName || 'our studio'}.\n\n👇 Tap link in bio to book your appointment!\n\n#Salon #Beauty #SelfCare #SalonDeals`,
        headline: `Special Offer: ${req.body.serviceName || 'Signature Service'}`,
        badgeText: req.body.offer ? req.body.offer.toUpperCase() : 'LIMITED SPECIAL'
      });
    }
  });

  /**
   * Template 14 — Veda Sanjeevani AI website content.
   *
   * The browser only ever sends business details; the Gemini key stays here.
   * Without a key (or if the provider fails) the endpoint still answers with an
   * honest, brand-specific draft produced by the shared template library, so the
   * "Generate my website content" button always does something useful.
   */
  app.post("/api/veda-website-content", async (req, res) => {
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
  });

  // AI Personalized Recommendations Endpoint with Gemini
  app.post("/api/ai-recommendations", async (req, res) => {
    try {
      const { bookingHistory = [], favorites = [], availableServices = [] } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || availableServices.length === 0) {
        return res.json({
          recommendations: availableServices.slice(0, 4).map((s: any) => ({
            salonSlug: s.salonSlug,
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            aiReason: `Based on your interest in ${s.category || 'luxury wellness'}, this signature treatment is curated for you.`
          }))
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

      const prompt = `You are an AI beauty and wellness concierge for Nexora salon platform.
User's past booking history: ${JSON.stringify(bookingHistory.slice(0, 10))}
User's favorite salons: ${JSON.stringify(favorites)}
Available services across salons: ${JSON.stringify(availableServices.slice(0, 30).map((s: any, i: number) => ({ id: i, salonSlug: s.salonSlug, serviceId: s.serviceId, name: s.serviceName, category: s.category, price: s.price })))}

Select up to 4 best matching services from the available services based on the user's history and preferences, and write a short, engaging, personalized AI recommendation reason ("aiReason") for each.
Return strictly valid JSON in this format:
{"recommendations": [{"index": number, "aiReason": "..."}]}`;

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
        return res.json(parsed);
      } else {
        throw new Error("Empty AI recommendations response");
      }
    } catch (err) {
      console.error("AI recommendations error:", err);
      return res.json({
        recommendations: (req.body.availableServices || []).slice(0, 4).map((s: any) => ({
          salonSlug: s.salonSlug,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          aiReason: `Curated recommendation matching your style and beauty preferences.`
        }))
      });
    }
  });

  // Email Service Status Endpoint
  app.get("/api/email-service-status", async (req, res) => {
    const userEmail = await getAuthenticatedEmail(req.get('authorization'));
    if (!userEmail) return res.status(401).json({ error: 'Authentication required.' });
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'StudioFlow <onboarding@resend.dev>';
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: "ok",
      provider: "resend",
      configured: Boolean(resendApiKey),
      from: fromEmail,
      mode: resendApiKey ? "live" : "unconfigured"
    });
  });

  // Automated Booking Email Endpoint (Resend integration)
  app.post("/api/send-booking-email", async (req, res) => {
    try {
      const {
        type = 'confirmation',
        to,
        clientName,
        bookingRef,
        serviceName,
        servicePrice = 0,
        amountPaid = 0,
        stylistName = 'Specialist',
        date,
        time,
        salonName = 'StudioFlow Salon',
        salonAddress = '',
        salonCity = '',
        salonPhone = '',
        salonWhatsapp = ''
      } = req.body;

      if (!to || typeof to !== 'string' || to.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
        return res.status(400).json({ error: 'Valid recipient email address is required.' });
      }

      const recipient = to.trim();
      const userEmail = await getAuthenticatedEmail(req.get('authorization'));
      if (!userEmail) return res.status(401).json({ error: 'Authentication required.' });
      if (userEmail !== recipient.toLowerCase()) return res.status(403).json({ error: 'Booking email recipient must match the signed-in account.' });
      if (!consumeBookingEmailQuota(userEmail)) return res.status(429).json({ error: 'Email send limit reached. Try again in a few minutes.' });
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'StudioFlow <onboarding@resend.dev>';
      const isReminder = type === 'reminder';
      const ref = bookingRef || 'NX-BOOKING';
      const subjectSalon = cleanEmailText(salonName, 100).replace(/[\r\n]+/g, ' ');
      const subjectService = cleanEmailText(serviceName || 'Salon Service', 100).replace(/[\r\n]+/g, ' ');
      const subjectRef = cleanEmailText(ref, 64).replace(/[\r\n]+/g, ' ');
      const subject = isReminder
        ? `Reminder: Your appointment tomorrow at ${subjectSalon}`
        : `Booking Confirmed: ${subjectService} at ${subjectSalon} (${subjectRef})`;

      const priceValue = Number(servicePrice);
      const paidValue = Number(amountPaid);
      const price = Number.isFinite(priceValue) ? Math.max(0, priceValue) : 0;
      const paid = Number.isFinite(paidValue) ? Math.max(0, paidValue) : 0;
      const balance = Math.max(0, price - paid);
      const fullAddress = [salonAddress, salonCity].filter(Boolean).map(value => cleanEmailText(value, 160)).join(', ') || 'Salon Studio';
      const safeSalonName = escapeEmailHtml(salonName, 100);
      const safeClientName = escapeEmailHtml(clientName || 'Guest', 100);
      const safeServiceName = escapeEmailHtml(serviceName || 'Salon Service', 120);
      const safeStylistName = escapeEmailHtml(stylistName, 100);
      const safeDate = escapeEmailHtml(date || '', 40);
      const safeTime = escapeEmailHtml(time || '', 40);
      const safeRef = escapeEmailHtml(ref, 64);
      const safeFullAddress = escapeEmailHtml(fullAddress, 240);
      const safeSalonPhone = escapeEmailHtml(salonPhone, 32);
      const phoneHref = String(salonPhone || '').replace(/[^\d+]/g, '').slice(0, 24);

      // HTML template
      const html = isReminder
        ? `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
            <div style="background:#0f172a;color:#ffffff;padding:28px 24px;text-align:center;">
              <span style="background:rgba(255,255,255,0.18);padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fcd34d;">Appointment Reminder</span>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;">See You Tomorrow at ${safeSalonName}!</h1>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hello <strong>${safeClientName}</strong>, your salon visit is scheduled for tomorrow:</p>
              <div style="background:#fff5f9;border:1px solid #fbcfe8;border-radius:12px;padding:18px;text-align:center;margin-bottom:20px;">
                <div style="font-size:22px;font-weight:900;color:#9f1239;font-family:monospace;">${safeDate} @ ${safeTime} IST</div>
                <div style="font-size:14px;font-weight:700;color:#334155;margin-top:4px;">${safeServiceName} with ${safeStylistName}</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;">Ref: ${safeRef}</div>
              </div>
              <div style="background:#f1f5f9;border-radius:10px;padding:12px 16px;font-size:13px;color:#475569;margin-bottom:18px;">
                <strong>Location:</strong> ${safeFullAddress}
              </div>
              ${salonPhone ? `<p style="font-size:13px;text-align:center;color:#64748b;">Questions? Contact the salon at <a href="tel:${phoneHref}" style="color:#9f1239;font-weight:700;">${safeSalonPhone}</a></p>` : ''}
            </div>
            <div style="background:#f8fafc;padding:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
              ${safeSalonName} • Automated notification by StudioFlow
            </div>
          </div>
        </body></html>`
        : `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
            <div style="background:linear-gradient(135deg,#702d4b,#9f1239);color:#ffffff;padding:32px 24px;text-align:center;">
              <span style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Confirmed Appointment</span>
              <h1 style="margin:10px 0 0;font-size:24px;font-weight:800;">Booking Confirmed!</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">${safeSalonName}</p>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Namaste <strong>${safeClientName}</strong>, your booking is confirmed with ${safeSalonName}.</p>
              <div style="border:1px dashed #cbd5e1;background:#f8fafc;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Booking Reference</div>
                  <div style="font-size:18px;font-family:monospace;font-weight:800;color:#0f172a;">${safeRef}</div>
                </div>
                <span style="background:#ecfdf5;color:#047857;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;">Confirmed</span>
              </div>
              <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:20px;">
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Service:</td><td style="padding:8px 0;text-align:right;font-weight:700;">${safeServiceName}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Specialist:</td><td style="padding:8px 0;text-align:right;font-weight:600;">${safeStylistName}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Date & Time:</td><td style="padding:8px 0;text-align:right;font-weight:800;color:#be185d;font-family:monospace;">${safeDate} @ ${safeTime} IST</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Salon Address:</td><td style="padding:8px 0;text-align:right;">${safeFullAddress}</td></tr>
              </table>
              <div style="background:#fff5f9;border:1px solid #fbcfe8;border-radius:12px;padding:14px;margin-bottom:20px;font-size:13px;">
                <div style="font-weight:700;color:#9f1239;margin-bottom:6px;">Payment Summary</div>
                <div>Service Total: <strong>₹${price.toLocaleString('en-IN')}</strong></div>
                ${paid > 0 ? `<div style="color:#047857;">Advance Paid: <strong>-₹${paid.toLocaleString('en-IN')}</strong></div>` : ''}
                <div style="margin-top:6px;font-size:14px;font-weight:800;color:#9f1239;">Balance Due at Salon: ₹${balance.toLocaleString('en-IN')}</div>
              </div>
              <div style="font-size:12px;color:#64748b;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px;">
                • Please arrive 10 minutes before your slot.<br/>
                • Show your reference code (${safeRef}) at reception.<br/>
                • Balance can be paid via cash, UPI, or card at the salon.
              </div>
            </div>
            <div style="background:#f8fafc;padding:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
              ${safeSalonName} • Automated confirmation by StudioFlow
            </div>
          </div>
        </body></html>`;

      const text = `${safeSalonName} - ${isReminder ? 'Appointment Reminder' : 'Booking Confirmation'}\n\n` +
        `Client: ${safeClientName}\n` +
        `Reference: ${safeRef}\n` +
        `Service: ${safeServiceName}\n` +
        `Specialist: ${safeStylistName}\n` +
        `Date & Time: ${safeDate} at ${safeTime} IST\n` +
        `Address: ${safeFullAddress}\n` +
        `Total: Rs. ${price} | Paid: Rs. ${paid} | Balance Due: Rs. ${balance}\n\n` +
        `Please arrive 10 minutes prior to your appointment.\n${salonPhone ? `Phone: ${safeSalonPhone}\n` : ''}`;

      // If Resend is configured, call Resend API directly
      if (resendApiKey) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [recipient],
            subject,
            html,
            text,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errMsg = data?.message || data?.error || 'Failed to send via Resend';
          console.error('Resend API error:', errMsg);
          return res.status(502).json({ error: errMsg, delivered: false });
        }

        return res.json({
          success: true,
          delivered: true,
          emailId: data.id,
          to: recipient,
          type,
          subject,
        });
      }

      return res.status(503).json({
        success: false,
        delivered: false,
        error: 'Email delivery is not configured. Set RESEND_API_KEY before sending customer emails.',
      });
    } catch (err: any) {
      console.error('Send booking email error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to process booking email' });
    }
  });

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
    app.use(express.static(distPath));
    app.all("/api/*", (_req, res) => {
      res.status(404).json({error:'Unknown API endpoint'});
    });
    app.get(/^\/login\/?$/, (_req, res) => {
      res.sendFile(path.join(distPath, "login.html"));
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
