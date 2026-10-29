import "dotenv/config";
import {sitemapHandler} from "./server/sitemap";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const portArg = process.argv.indexOf('--port');
  const PORT = Number(portArg>=0?process.argv[portArg+1]:process.env.PORT||3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('Invalid server port');

  app.use(express.json());

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
  app.get("/api/email-service-status", (_req, res) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'StudioFlow <onboarding@resend.dev>';
    res.json({
      status: "ok",
      provider: "resend",
      configured: Boolean(resendApiKey),
      from: fromEmail,
      mode: resendApiKey ? "live" : "preview"
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

      if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
        return res.status(400).json({ error: 'Valid recipient email address is required.' });
      }

      const recipient = to.trim();
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'StudioFlow <onboarding@resend.dev>';
      const isReminder = type === 'reminder';
      const ref = bookingRef || 'NX-BOOKING';
      const subject = isReminder
        ? `Reminder: Your appointment tomorrow at ${salonName}`
        : `Booking Confirmed: ${serviceName || 'Salon Service'} at ${salonName} (${ref})`;

      const price = Number(servicePrice) || 0;
      const paid = Number(amountPaid) || 0;
      const balance = Math.max(0, price - paid);
      const fullAddress = [salonAddress, salonCity].filter(Boolean).join(', ') || 'Salon Studio';

      // HTML template
      const html = isReminder
        ? `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
            <div style="background:#0f172a;color:#ffffff;padding:28px 24px;text-align:center;">
              <span style="background:rgba(255,255,255,0.18);padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fcd34d;">Appointment Reminder</span>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;">See You Tomorrow at ${salonName}!</h1>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hello <strong>${clientName || 'Guest'}</strong>, your salon visit is scheduled for tomorrow:</p>
              <div style="background:#fff5f9;border:1px solid #fbcfe8;border-radius:12px;padding:18px;text-align:center;margin-bottom:20px;">
                <div style="font-size:22px;font-weight:900;color:#9f1239;font-family:monospace;">${date} @ ${time} IST</div>
                <div style="font-size:14px;font-weight:700;color:#334155;margin-top:4px;">${serviceName} with ${stylistName}</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;">Ref: ${ref}</div>
              </div>
              <div style="background:#f1f5f9;border-radius:10px;padding:12px 16px;font-size:13px;color:#475569;margin-bottom:18px;">
                <strong>Location:</strong> ${fullAddress}
              </div>
              ${salonPhone ? `<p style="font-size:13px;text-align:center;color:#64748b;">Questions? Contact the salon at <a href="tel:${salonPhone}" style="color:#9f1239;font-weight:700;">${salonPhone}</a></p>` : ''}
            </div>
            <div style="background:#f8fafc;padding:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
              ${salonName} • Automated notification by StudioFlow
            </div>
          </div>
        </body></html>`
        : `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
            <div style="background:linear-gradient(135deg,#702d4b,#9f1239);color:#ffffff;padding:32px 24px;text-align:center;">
              <span style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Confirmed Appointment</span>
              <h1 style="margin:10px 0 0;font-size:24px;font-weight:800;">Booking Confirmed!</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">${salonName}</p>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Namaste <strong>${clientName || 'Guest'}</strong>, your booking is confirmed with ${salonName}.</p>
              <div style="border:1px dashed #cbd5e1;background:#f8fafc;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Booking Reference</div>
                  <div style="font-size:18px;font-family:monospace;font-weight:800;color:#0f172a;">${ref}</div>
                </div>
                <span style="background:#ecfdf5;color:#047857;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;">Confirmed</span>
              </div>
              <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:20px;">
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Service:</td><td style="padding:8px 0;text-align:right;font-weight:700;">${serviceName}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Specialist:</td><td style="padding:8px 0;text-align:right;font-weight:600;">${stylistName}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Date & Time:</td><td style="padding:8px 0;text-align:right;font-weight:800;color:#be185d;font-family:monospace;">${date} @ ${time} IST</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Salon Address:</td><td style="padding:8px 0;text-align:right;">${fullAddress}</td></tr>
              </table>
              <div style="background:#fff5f9;border:1px solid #fbcfe8;border-radius:12px;padding:14px;margin-bottom:20px;font-size:13px;">
                <div style="font-weight:700;color:#9f1239;margin-bottom:6px;">Payment Summary</div>
                <div>Service Total: <strong>₹${price.toLocaleString('en-IN')}</strong></div>
                ${paid > 0 ? `<div style="color:#047857;">Advance Paid: <strong>-₹${paid.toLocaleString('en-IN')}</strong></div>` : ''}
                <div style="margin-top:6px;font-size:14px;font-weight:800;color:#9f1239;">Balance Due at Salon: ₹${balance.toLocaleString('en-IN')}</div>
              </div>
              <div style="font-size:12px;color:#64748b;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px;">
                • Please arrive 10 minutes before your slot.<br/>
                • Show your reference code (${ref}) at reception.<br/>
                • Balance can be paid via cash, UPI, or card at the salon.
              </div>
            </div>
            <div style="background:#f8fafc;padding:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
              ${salonName} • Automated confirmation by StudioFlow
            </div>
          </div>
        </body></html>`;

      const text = `${salonName} - ${isReminder ? 'Appointment Reminder' : 'Booking Confirmation'}\n\n` +
        `Client: ${clientName || 'Guest'}\n` +
        `Reference: ${ref}\n` +
        `Service: ${serviceName}\n` +
        `Specialist: ${stylistName}\n` +
        `Date & Time: ${date} at ${time} IST\n` +
        `Address: ${fullAddress}\n` +
        `Total: Rs. ${price} | Paid: Rs. ${paid} | Balance Due: Rs. ${balance}\n\n` +
        `Please arrive 10 minutes prior to your appointment.\n${salonPhone ? `Phone: ${salonPhone}\n` : ''}`;

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

      // If Resend API key is not in dev server env, succeed gracefully with preview info
      console.log(`[Email Service] Automated ${type} email prepared for ${recipient}: "${subject}"`);
      return res.json({
        success: true,
        delivered: false,
        simulated: true,
        emailId: `sim_${Date.now()}`,
        to: recipient,
        type,
        subject,
        notice: 'Email generated. Add RESEND_API_KEY to your environment to send live emails via Resend.',
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudioFlow Salon OS running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
