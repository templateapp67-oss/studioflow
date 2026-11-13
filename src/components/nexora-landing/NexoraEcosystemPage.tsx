import { NEXORA_PUBLIC_TEMPLATES } from '../../lib/nexoraPublicTemplates';
import { nexoraTemplatePagePath, NEXORA_TEMPLATE_META } from '../../lib/nexoraTemplateCatalogue';
import { NexoraEcosystemSeoHead } from './NexoraEcosystemSeoHead';
import { NexoraGrowthPartnerRewardsPage } from './NexoraGrowthPartnerRewardsPage';

const pageData = {
  '/salon-onboarding': {
    title: 'Build a Salon Brand Customers Remember',
    heading: 'Your Salon. Your Style. Your Digital Brand.',
    intro: 'Create a beautiful salon website, showcase your services and help customers discover and connect with your business — all with NEXORA SalonOS.',
  },
  '/salon-growth': {
    title: 'NEXORA SalonOS — Salon Customer Growth & Retention.',
    heading: 'Build lasting customer relationships.',
    intro: 'Nexora helps salons organise customer relationships, create supported follow-up opportunities and manage salon operations. Results depend on your salon, configuration and customer consent.',
  },
  '/growth-partner-rewards': {
    title: 'Nexora Growth Partner — Reward Journey.',
    heading: 'Salon Onboarding Se Achievement Tak.',
    intro: 'Growth Partner rewards are subject to current programme rules, qualifying shops, verified collections and approval. Confirm eligibility and fulfilment conditions with Nexora before relying on a reward.',
  },
} as const;

const milestones = [
  ['25 eligible shops', 'Nexora branded T-shirt'],
  ['50 eligible shops', 'Samsung Tablet'],
  ['100 eligible shops', 'Branded HP Laptop'],
  ['250 eligible shops', 'Premium Electric Scooter'],
  ['500 eligible shops', 'Latest iPhone'],
  ['750 eligible shops', 'Royal Enfield 350cc Motorcycle'],
  ['1000+ eligible shops', 'SUV Car + District Partner Recognition'],
];

const growthTopics = [
  'Online booking requests and supported availability',
  'Organised customer information and follow-up opportunities',
  'Customer recall and retention workflows',
  'Digital salon presence and service information',
  'Customer discovery and salon profile experiences',
  'Business insights and supported reporting',
];

const onboardingFeatures = [
  { title: 'Your own salon website', text: 'Build a branded online home with your salon name, logo, colours, location and contact details.', image: '/templates/luxury-editorial/hero-960.webp', alt: 'NEXORA Ziya Hair Studio salon interior and styling presentation' },
  { title: 'Services customers can explore', text: 'Present haircuts, hair colour, skincare, beauty, nail and wellness services with clear descriptions, prices and durations.', image: '/templates/dermacure/hero.webp', alt: 'NEXORA Dermacure Skin and Aesthetic Clinic visual' },
  { title: 'A smoother booking journey', text: 'Give customers a clear way to view your salon information and use the booking options enabled for your account.', image: '/templates/pinky-nails/hero-nail-artist.webp', alt: 'NEXORA Pinky Nails Studio beauty service visual' },
  { title: 'Your team and salon story', text: 'Introduce your stylists, share your work and help new customers understand what makes your salon special.', image: '/templates/barber/hero.jpg', alt: 'NEXORA Royal Blade Barber Shop salon visual' },
];

const onboardingFaqs = [
  ['Can I create a website for my beauty parlour or salon?', 'Yes. Choose a salon category and a suitable NEXORA website template, then add your salon details, services, images and contact information.'],
  ['Can I use this for a barber shop or nail studio?', 'Yes. NEXORA includes different salon business categories and website templates, including hair salons, barber shops, beauty parlours, nail studios and other supported salon types.'],
  ['Can I add my own salon photos and logo?', 'Yes. Add your own brand details and suitable photos while setting up your salon website. Use images you own or have permission to publish.'],
  ['Will customers be able to book appointments online?', 'Booking options depend on your account setup, staff schedules, services and enabled features. Review the booking flow before publishing your website.'],
  ['Can I preview my website before it goes live?', 'Yes. Review your website design and content, check the desktop and mobile layouts, and make changes before you publish and share it.'],
];

export function NexoraEcosystemPage({ path }: { path: keyof typeof pageData }) {
  const page = pageData[path];
  const isOnboarding = path === '/salon-onboarding';
  const isRewards = path === '/growth-partner-rewards';
  if (isRewards) return <><NexoraEcosystemSeoHead path={path} /><NexoraGrowthPartnerRewardsPage /></>;
  return <div className="min-h-screen bg-white text-[#211B2B]">
    <NexoraEcosystemSeoHead path={path} />
    <header className="sticky top-0 z-30 border-b border-[#eee7ed] bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4" aria-label="Main navigation">
        <a className="mr-auto flex items-center gap-2 font-black tracking-[.16em] text-[#312347]" href="/" aria-label="NEXORA SalonOS home"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#312347] text-sm text-white">N</span><span>NEXORA <span className="text-[10px] tracking-[.12em] text-[#9b7d9c]">SALON OS</span></span></a>
        <a className="text-sm font-medium hover:text-[#9b6b83]" href="/">Home</a><a className="text-sm font-semibold text-[#65466a]" href="/salon-onboarding">Salon Onboarding</a><a className="text-sm font-medium hover:text-[#9b6b83]" href="/salon-growth">Salon Growth</a><a className="text-sm font-medium hover:text-[#9b6b83]" href="/pricing">Pricing</a><a className="rounded-full bg-[#312347] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#49345e]" href="/login">Owner Workspace</a>
      </nav>
    </header>
    <main>
      {isOnboarding ? <OnboardingLanding /> : <section className="bg-gradient-to-br from-[#20192d] via-[#362545] to-[#775269] px-5 py-20 text-white sm:py-28"><div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-[#f0c98b]">NEXORA SALONOS</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">{page.heading}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-white/85">{page.intro}</p><div className="mt-8 flex flex-wrap gap-3"><a className="rounded-xl bg-white px-5 py-3 font-bold text-[#30223b]" href="#growth">Explore Salon Growth</a><a className="rounded-xl border border-white/50 px-5 py-3 font-bold" href="/">Back to Nexora</a></div></div></section>}
      {isOnboarding ? null : <>
        <section id="growth" className="mx-auto max-w-6xl px-5 py-14"><h2 className="text-3xl font-extrabold">Support the customer journey</h2><p className="mt-4 max-w-3xl leading-7 text-[#665d6c]">From digital salon identity to booking requests and organised follow-up, Nexora brings supported workflows together. Retention is about long-term customer relationships, not a guaranteed booking or revenue outcome.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{growthTopics.map((topic) => <article key={topic} className="rounded-xl border border-[#ece7ed] p-5"><span className="font-bold">{topic}</span></article>)}</div></section>
        <InfoSection title="Communications, promotions and QR" items={['Messages and reminders depend on configured channels, customer consent and integrations.', 'Promotional discounts apply only to eligible salons, services and campaigns.', 'Use a salon-specific verified destination for functional QR codes; campaign artwork is not a payment QR.', 'Do not treat automated messaging or payment processing as available unless configured and confirmed.']} />
        <InfoSection title="Discover and grow responsibly" items={['Digital presence, customer activity and supported business insights', 'Reviews and referrals depend on genuine customer activity.', 'No Google ranking, customer count, revenue or automated return is guaranteed.', 'AI growth and ranking features are demonstrations or planned unless explicitly released.']} />
        <InfoSection title="Salon business transformation" items={['Before: scattered records, manual follow-ups and disconnected operations.', 'With supported Nexora tools: organised information, digital presence, booking workflows and reporting.', 'Explore your setup options on Salon Onboarding or review the approved plans on Pricing.']} />
      </>}
    </main>
    <footer className="border-t border-[#eee] bg-[#fbf9fc] px-5 py-9"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 text-sm"><a className="mr-auto font-black tracking-widest text-[#312347]" href="/">NEXORA SALONOS</a><a href="/">Home</a><a href="/salon-onboarding">Salon Onboarding</a><a href="/salon-growth">Salon Growth</a><a href="/pricing">Pricing</a><a href="/login">Owner Workspace</a></div><p className="mx-auto mt-5 max-w-7xl text-xs text-[#827888]">© {new Date().getFullYear()} NEXORA SalonOS. Salon website and management tools for your business.</p></footer>
  </div>;
}

function OnboardingLanding() {
  return <>
    <section className="relative isolate min-h-[620px] overflow-hidden bg-[#20192d] text-white sm:min-h-[680px]">
      <img src="/templates/aura-unisex/hero-main-720.webp" alt="Luxury modern salon interior with premium styling stations" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1d1728]/95 via-[#261b31]/80 to-[#261b31]/25" />
      <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-5 py-20 sm:min-h-[680px] lg:grid-cols-[1.1fr_.9fr]">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-[#f3d6a1]">The salon brand starts here · NEXORA</p>
          <h1 className="mt-7 text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">Your Salon Deserves a <span className="text-[#f3d6a1]">Beautiful Digital Identity.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">Create a professional salon website, show your services and team, and make it easier for customers to discover your brand. One polished online experience, made for the way Indian salons work.</p>
          <div className="mt-9 flex flex-wrap gap-3"><a href="#templates" className="rounded-full bg-[#f3d6a1] px-7 py-3.5 font-extrabold text-[#2d2035] shadow-lg transition hover:-translate-y-0.5">Explore Salon Designs <span aria-hidden="true">→</span></a><a href="/login?auth=signup&create=1" className="rounded-full border border-white/50 bg-white/10 px-7 py-3.5 font-bold text-white backdrop-blur transition hover:bg-white/20">Register Your Salon</a></div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/80"><span>✓ Mobile-friendly layouts</span><span>✓ Your brand, your content</span><span>✓ Preview before publishing</span></div>
        </div>
        <div className="hidden lg:block">
          <div className="ml-auto max-w-[440px] rounded-[2rem] border border-white/25 bg-white/10 p-3 shadow-2xl backdrop-blur-md">
            <img src="/templates/roop-mahal/hero-bridal.webp" alt="Stylist providing a premium salon service" className="h-[420px] w-full rounded-[1.5rem] object-cover" loading="lazy" />
            <div className="flex items-center justify-between gap-4 p-4"><div><p className="text-xs uppercase tracking-widest text-[#f3d6a1]">Made for salon owners</p><p className="mt-1 text-lg font-bold">Look professional. Grow with confidence.</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f3d6a1] text-xl text-[#2d2035]">✦</span></div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#c9a56a] via-[#f3d6a1] to-[#9b6b83]" />
    </section>

    <section className="border-b border-[#eee7ed] bg-[#fbf9fc] px-5 py-8"><div className="mx-auto grid max-w-7xl gap-5 text-center sm:grid-cols-3"><div><p className="text-sm font-extrabold text-[#49345e]">Salon Website Builder</p><p className="mt-1 text-sm text-[#756b7b]">A branded online presence for your salon</p></div><div><p className="text-sm font-extrabold text-[#49345e]">Salon Booking Experience</p><p className="mt-1 text-sm text-[#756b7b]">Clear service and appointment journeys</p></div><div><p className="text-sm font-extrabold text-[#49345e]">Salon Management Tools</p><p className="mt-1 text-sm text-[#756b7b]">Connected tools for daily salon work</p></div></div></section>

    <section id="templates" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#9a718b]">Find your salon look</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">A Website Style That Feels Like Your Brand</h2><p className="mt-4 leading-7 text-[#716777]">Explore NEXORA salon website templates for hair salons, barber shops, beauty parlours, nail studios and more. Choose a look that matches your services and your customers.</p></div><a href="/#nexora-template-library" className="font-bold text-[#65466a] hover:underline">View all salon templates →</a></div>
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{NEXORA_PUBLIC_TEMPLATES.map((template) => { const meta = NEXORA_TEMPLATE_META.find((item) => item.templateId === template.id); return <article key={template.id} className="group overflow-hidden rounded-2xl border border-[#e9e4eb] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><a href={nexoraTemplatePagePath(template.id)}><div className="relative overflow-hidden"><img className="h-56 w-full object-cover transition duration-500 group-hover:scale-105" src={template.coverImageUrl} alt={`${meta?.displayName ?? template.shortName} salon website template preview`} loading="lazy"/><span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#49345e]">{meta?.categoryName ?? 'Salon Website'}</span></div><div className="p-5"><h3 className="text-lg font-extrabold">{meta?.displayName ?? template.shortName}</h3><span className="mt-4 inline-flex text-sm font-bold text-[#65466a]">View live demo <span aria-hidden="true" className="ml-1">→</span></span></div></a></article>; })}</div>
    </section>

    <section className="bg-[#f8f4f7] px-5 py-16 sm:py-20"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#9a718b]">Everything in one place</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">More Than a Salon Website</h2><p className="mt-4 leading-7 text-[#716777]">Build your digital salon presence and bring important customer-facing details together in one clear experience.</p></div><div className="mt-10 grid gap-5 md:grid-cols-2">{onboardingFeatures.map((feature, index) => <article key={feature.title} className="grid overflow-hidden rounded-2xl border border-[#ece5ed] bg-white shadow-sm sm:grid-cols-[.9fr_1.1fr]"><img src={feature.image} alt={feature.alt} className="h-56 w-full object-cover sm:h-full" loading="lazy"/><div className="p-6"><span className="text-xs font-bold tracking-widest text-[#a47c91]">0{index + 1} / NEXORA</span><h3 className="mt-3 text-xl font-extrabold">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-[#716777]">{feature.text}</p></div></article>)}</div></div></section>

    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2"><div className="overflow-hidden rounded-[2rem]"><img src="/templates/kesh-prakriti/hero-reference.jpg" alt="Bright and welcoming salon interior ready for customers" className="h-[360px] w-full object-cover sm:h-[470px]" loading="lazy"/></div><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#9a718b]">Simple steps, polished result</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">From Salon Details to Your Live Website</h2><p className="mt-4 leading-7 text-[#716777]">Your salon website setup is designed to be clear and guided. Add the information customers need, review your pages and publish when everything looks right.</p><ol className="mt-7 space-y-4">{[['01','Choose your salon category and website design'],['02','Add your salon name, logo, photos and contact details'],['03','Add services, prices, durations and team information'],['04','Preview on mobile and desktop, then publish and share']].map(([number, label]) => <li key={number} className="flex items-start gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#312347] text-xs font-extrabold text-white">{number}</span><span className="pt-1 font-semibold text-[#413649]">{label}</span></li>)}</ol><a href="/login?auth=signup&create=1" className="mt-8 inline-flex rounded-full bg-[#312347] px-7 py-3.5 font-bold text-white transition hover:bg-[#49345e]">Start Salon Registration →</a></div></section>

    <section className="bg-[#241b2d] px-5 py-16 text-white sm:py-20"><div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_360px]"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#e5c18e]">Your brand deserves to be seen</p><h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">Make Your Salon Easier to Discover Online</h2><p className="mt-4 max-w-2xl leading-7 text-white/75">A clear salon website can help people understand your services, location, timings and how to contact you. NEXORA helps you create that online starting point. Search visibility depends on your content, location, competition and ongoing SEO work.</p><p className="mt-5 text-xs font-bold uppercase tracking-[.12em] text-[#e5c18e]">Salon Website · Beauty Parlour Website · Barber Shop Website · Nail Studio Website</p><a href="/login?auth=signup&create=1" className="mt-7 inline-flex justify-center rounded-full bg-[#f3d6a1] px-7 py-3.5 font-extrabold text-[#2d2035]">Create Your Salon Website →</a></div><div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 shadow-2xl"><img src="/templates/vogue-noir/hero-1.webp" alt="NEXORA Vogue Noir Makeup Studio visual" className="h-[260px] w-full object-cover" loading="lazy"/><div className="absolute inset-0 bg-gradient-to-t from-[#1b1424]/90 via-transparent to-transparent"/><p className="absolute bottom-5 left-5 right-5 text-lg font-extrabold">A beautiful first impression starts with your salon story.</p></div></div></section>

    <section className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[.72fr_1.28fr]"><div className="overflow-hidden rounded-[1.75rem]"><img src="/templates/11/hero-bride.webp" alt="NEXORA Shringaar Royal Bridal Lounge salon photography" className="h-[300px] w-full object-cover sm:h-[420px]" loading="lazy"/><div className="bg-[#f5edf3] p-6"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#9a718b]">NEXORA SALONOS</p><h2 className="mt-2 text-2xl font-black text-[#211b2b]">Questions, answered.</h2><p className="mt-2 text-sm leading-6 text-[#716777]">Know how salon templates, images and booking setup work before you get started.</p></div></div><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#9a718b]">Helpful information</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Salon Website & Onboarding FAQs</h2><div className="mt-9 divide-y divide-[#eee7ed] border-y border-[#eee7ed]">{onboardingFaqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[#35283e]">{question}<span className="text-xl text-[#9a718b] transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-4xl leading-7 text-[#716777]">{answer}</p></details>)}</div></div></section>
    <section className="px-5 pb-20"><div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-[#f5edf3] lg:grid-cols-[1.15fr_.85fr]"><div className="px-6 py-12 text-center sm:px-12 lg:py-16 lg:text-left"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#9a718b]">Welcome to NEXORA</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Your Salon Story Deserves a Beautiful Online Home.</h2><p className="mt-4 leading-7 text-[#716777]">Start with your salon category, make the design your own and create a website that reflects the care you bring to every customer.</p><a href="/login?auth=signup&create=1" className="mt-7 inline-flex rounded-full bg-[#312347] px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-0.5">Register Your Salon with NEXORA →</a></div><img src="/templates/bodhi-tree/preview.webp" alt="NEXORA Bodhi Tree Massage and Wellness salon photography" className="h-[260px] w-full object-cover sm:h-[340px] lg:h-full" loading="lazy"/></div></section>
  </>;
}

function InfoSection({ title, items }: { title: string; items: string[] }) {
  return <section className="border-t border-[#eee] bg-[#fcfafc] px-5 py-12"><div className="mx-auto max-w-6xl"><h2 className="text-3xl font-extrabold">{title}</h2><ul className="mt-6 grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item} className="rounded-xl bg-white p-5 leading-6 shadow-sm">{item}</li>)}</ul></div></section>;
}
