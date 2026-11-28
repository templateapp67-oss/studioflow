import { ArrowDown, ArrowRight, CalendarDays, Globe, Layers3, MessageCircle, Package, Smartphone, Users } from 'lucide-react';
import { NEXORA_PUBLIC_TEMPLATES } from '../../lib/nexoraPublicTemplates';
import { nexoraTemplateMeta, nexoraTemplatePagePath } from '../../lib/nexoraTemplateCatalogue';
import { buildWhatsAppClickToChatUrl, NEXORA_OFFICIAL_WHATSAPP_NUMBER } from '../../lib/whatsappContact';

const pageWidth = 'mx-auto max-w-7xl px-5 sm:px-8';
const primaryButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#312347] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#53336d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d4590]';
const subtleButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d9cce1] bg-white px-5 py-3 text-sm font-bold text-[#312347] transition hover:bg-[#f6eff9] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d4590]';
const appSalesEmail = 'bestsinger11@gmail.com';

const sections = [
  ['salonos', 'SalonOS platform'],
  ['free-salon-website-templates', 'Free template demos'],
  ['android-salon-booking-app', 'Android app and source code'],
  ['about-faq', 'Common questions'],
] as const;

const capabilities = [
  { icon: Globe, title: 'Salon website builder', text: 'Start with one of 16 designs. Add your logo, hours, photos, staff profiles, and a service menu with prices and durations.' },
  { icon: CalendarDays, title: 'Appointments and payments', text: 'Present available services and appointments on your published website. Booking and payments depend on your setup and enabled payment options.' },
  { icon: Users, title: 'Customer CRM and staff', text: 'Keep client records and appointment history together, organise staff schedules, and review staff commission tools.' },
  { icon: Package, title: 'POS billing and inventory', text: 'Review tools for bills, payment records, products, and stock as part of day-to-day salon operations.' },
  { icon: MessageCircle, title: 'Reminders and retention', text: 'Explore appointment reminders, customer recall, birthday offers, campaigns, and loyalty tools. Messaging requires the appropriate setup and customer consent.' },
  { icon: Layers3, title: 'Multi-branch operations and insights', text: 'Compare plans for branch management, team access, activity reports, and business analytics.' },
];

const audiences = ['Hair and unisex salons', 'Beauty parlours and studios', 'Barber shops', 'Spas and wellness centres', 'Makeup and bridal studios', 'Independent beauty professionals', 'Multi-location salon chains'];

const appOffers = [
  {
    title: 'Ready-made Android app',
    price: '₹25,000',
    description: 'For salon owners who want a branded app with service categories, service information, and an appointment booking interface.',
    action: 'Enquire about the Android app',
    message: 'Hi App Creator, I would like a demo and purchase details for the ₹25,000 Android Salon Booking App.',
  },
  {
    title: 'Android Studio source code',
    price: '₹20,000',
    description: 'For developers, freelancers, and agencies who want an Android Studio project to adapt for a client or their own beauty business.',
    action: 'Enquire about source code',
    message: 'Hi App Creator, I would like the scope and licensing details for the ₹20,000 Android Studio salon app source code.',
  },
];

const questions = [
  ['Can I browse free salon website templates?', 'Yes. All 16 salon website template demos can be previewed for free without signing in. You can explore the layouts from this page and review publishing options on the SalonOS Pricing page.'],
  ['Can I download the templates for free?', 'These are live demos for the NEXORA website builder. Check the Pricing page for access and publishing terms, or ask App Creator about the separate Android Studio source code offer.'],
  ['What does the Android salon app include?', 'The ready-made Android app provides service categories, service details, straightforward navigation, and an appointment booking interface. Confirm the exact workflow, integrations, and deliverables in your demo.'],
  ['Can I change the branding or add features?', 'Yes. Discuss app name, logo, colours, service categories, contact information, screens, and custom workflows with App Creator. Website and admin panel development can also be scoped separately.'],
  ['How do I choose between SalonOS and the Android app?', 'SalonOS suits businesses that want a website builder and management tools. The Android app is a separate offer for teams that want a branded mobile booking experience. Contact the team for a walkthrough of either option.'],
];

function appWhatsApp(prefilledMessage: string) {
  return buildWhatsAppClickToChatUrl({ phoneNumber: NEXORA_OFFICIAL_WHATSAPP_NUMBER, prefilledMessage });
}

export function NexoraAboutContent() {
  return (
    <>
      <nav aria-label="About page sections" className="border-y border-[#eadfed] bg-[#fbf7fc]">
        <ul className={pageWidth + ' flex flex-wrap gap-x-6 gap-y-1 py-3'}>
          {sections.map(([id, label]) => (
            <li key={id}><a href={'#' + id} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#473053] hover:underline focus-visible:underline">{label}<ArrowDown size={14} aria-hidden="true" /></a></li>
          ))}
        </ul>
      </nav>

      <section id="salonos" aria-labelledby="about-salonos-title" className="scroll-mt-20 py-14 sm:py-20">
        <div className={pageWidth}>
          <div className="grid items-center gap-7 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold text-[#775481]">NEXORA SalonOS</p>
              <h2 id="about-salonos-title" className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">Build your salon website and run your business from one platform</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#665d6c]">Give customers a place to find your services and request appointments. Give your team a workspace for bookings, customers, billing, staff, inventory and follow-up.</p>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-[#e9dfea] bg-[#241a32]">
              <img src="/nexora-about/salon-operations.webp" width={605} height={345} className="h-auto w-full" loading="lazy" decoding="async" alt="Illustrated salon workspace with a booking website, customer records, marketing, loyalty and business analytics" />
              <figcaption className="px-4 py-3 text-sm text-[#e7dbed]">Illustration of SalonOS workflows. Dashboard figures are examples.</figcaption>
            </figure>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-[#eee5ef] bg-white p-5 sm:p-6">
                <Icon className="mb-4 text-[#714787]" size={24} aria-hidden="true" />
                <h3 className="text-lg font-extrabold">{title}</h3>
                <p className="mt-2 leading-6 text-[#665d6c]">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className={primaryButton} href="/salon-os">Explore SalonOS <ArrowRight size={16} aria-hidden="true" /></a>
            <a className={subtleButton} href="/pricing">Compare plans and pricing</a>
          </div>
          <h3 className="mt-10 text-lg font-extrabold">Built for salon and beauty businesses</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {audiences.map((item) => <li key={item} className="rounded-full bg-[#f6eef7] px-3.5 py-2 text-sm font-medium text-[#473053]">{item}</li>)}
          </ul>
        </div>
      </section>

      <section id="free-salon-website-templates" aria-labelledby="about-templates-title" className="scroll-mt-20 border-y border-[#eadfed] bg-[#fbf7fc] py-14 sm:py-20">
        <div className={pageWidth}>
          <h2 id="about-templates-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Free salon website template demos</h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#665d6c]">Preview all 16 beauty and hair salon website templates for free. Browse designs for beauty parlours, barbers, nail studios, spas, and more. Choose a layout, then personalise it in the NEXORA website builder.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NEXORA_PUBLIC_TEMPLATES.map((template) => {
              const meta = nexoraTemplateMeta(template.id);
              const title = meta?.displayName ?? template.shortName;
              return (
                <article className="overflow-hidden rounded-2xl border border-[#e9dfea] bg-white" key={template.id}>
                  <a className="group block h-full transition hover:bg-[#fcf9fd] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#6d4590]" href={nexoraTemplatePagePath(template.id)}>
                    <img src={template.coverImageUrl} width={320} height={200} loading="lazy" decoding="async" className="aspect-[8/5] w-full object-cover" alt={title + ' website design preview'} />
                    <div className="p-4">
                      <p className="text-xs font-bold text-[#775481]">{meta?.categoryName}</p>
                      <h3 className="mt-1 font-extrabold">{title}</h3>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#57366a] group-hover:underline">View demo <ArrowRight size={15} aria-hidden="true" /></span>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
          <a className={primaryButton + ' mt-8'} href="/salon-onboarding">See how to customise and publish <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </section>

      <section id="android-salon-booking-app" aria-labelledby="about-app-title" className="scroll-mt-20 bg-[#241a32] py-14 text-white sm:py-20">
        <div className={pageWidth}>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[#f4d99d]"><Smartphone size={17} aria-hidden="true" /> Android development by App Creator</p>
          <h2 id="about-app-title" className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">Android Salon Booking App</h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#e7dbed]">Give customers a branded Android app to explore your salon or beauty parlour services and request appointments. Buy the ready-made app or enquire about the Android Studio source code for a client project.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {appOffers.map(({ title, price, description, action, message }) => (
              <article key={title} className="flex flex-col rounded-2xl border border-[#674f77] bg-[#30213e] p-6 sm:p-8">
                <h3 className="text-xl font-extrabold">{title}</h3>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#f4d99d]">{price}</p>
                <p className="mb-6 mt-3 flex-1 leading-6 text-[#e7dbed]">{description}</p>
                <a href={appWhatsApp(message)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f4d99d] px-4 py-3 text-center text-sm font-extrabold text-[#23192b] hover:bg-[#ffe7b4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <MessageCircle size={16} aria-hidden="true" />{action}
                </a>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div><h3 className="font-extrabold">Make it your own</h3><p className="mt-2 leading-6 text-[#e7dbed]">Discuss the app name, logo, colours, service categories, business contact details, customer screens, and any additional booking workflows.</p></div>
            <div><h3 className="font-extrabold">App Creator development services</h3><p className="mt-2 leading-6 text-[#e7dbed]">Android apps, Android Studio projects, existing app customisation, websites, admin panels, and ready-made business apps for client projects.</p></div>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-[#e7dbed]">The app and source code are separate offers from SalonOS subscriptions. Confirm licensing, deployment, support and custom development scope before purchase.</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold">
            <a className="text-[#f4d99d] underline underline-offset-4" href={appWhatsApp('Hi App Creator, I would like to see a demo of the Android Salon Booking App.')}>Request a demo on WhatsApp · +91 78528 77721</a>
            <a className="text-white underline underline-offset-4" href={'mailto:' + appSalesEmail}>{appSalesEmail}</a>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16" aria-labelledby="about-ecosystem-title">
        <div className={pageWidth}>
          <h2 id="about-ecosystem-title" className="text-3xl font-extrabold tracking-tight">The NEXORA beauty business ecosystem</h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#665d6c]">Explore website onboarding, customer growth tools, and partner programmes for the people and businesses serving the beauty industry.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className={subtleButton} href="/salon-onboarding">Salon onboarding</a>
            <a className={subtleButton} href="/salon-growth">Salon growth and retention</a>
            <a className={subtleButton} href="/growth-partner-rewards">Growth partner rewards</a>
            <a className={subtleButton} href="/partner-rewards">Salon partner recognition</a>
          </div>
        </div>
      </section>

      <section id="about-faq" aria-labelledby="about-faq-title" className="scroll-mt-20 border-y border-[#eadfed] bg-[#fbf7fc] py-14 sm:py-16">
        <div className={pageWidth}>
          <h2 id="about-faq-title" className="text-3xl font-extrabold tracking-tight">Questions about templates, SalonOS and the Android app</h2>
          <div className="mt-6 max-w-4xl space-y-3">
            {questions.map(([question, answer]) => (
              <details key={question} className="rounded-xl border border-[#eadfed] bg-white px-5">
                <summary className="cursor-pointer py-4 font-bold focus-visible:outline-2 focus-visible:outline-[#6d4590]">{question}</summary>
                <p className="pb-5 leading-7 text-[#665d6c]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
