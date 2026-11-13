import { NEXORA_PUBLIC_TEMPLATES } from '../../lib/nexoraPublicTemplates';
import { nexoraTemplatePagePath, NEXORA_TEMPLATE_META } from '../../lib/nexoraTemplateCatalogue';
import { NexoraEcosystemSeoHead } from './NexoraEcosystemSeoHead';
import { NexoraGrowthPartnerRewardsPage } from './NexoraGrowthPartnerRewardsPage';
import { NexoraTopSalonJaipurPage } from './NexoraTopSalonJaipurPage';

const pageData = {
  '/salon-onboarding': {
    title: 'Create Your Own Salon Brand With Nexora.',
    heading: 'Aapke Salon Ki Apni Digital Pehchaan.',
    intro: 'Choose a website design, add your own salon branding, showcase your services and build your digital presence using Nexora SalonOS.',
  },
  '/salon-growth': {
    title: 'Nexora SalonOS — Salon Customer Growth & Retention.',
    heading: 'Build lasting customer relationships.',
    intro: 'Nexora helps salons organise customer relationships, create supported follow-up opportunities and manage salon operations. Results depend on your salon, configuration and customer consent.',
  },
  '/growth-partner-rewards': {
    title: 'Nexora Growth Partner — Reward Journey.',
    heading: 'Salon Onboarding Se Achievement Tak.',
    intro: 'Growth Partner rewards are subject to current programme rules, qualifying shops, verified collections and approval. Confirm eligibility and fulfilment conditions with Nexora before relying on a reward.',
  },
  '/top-salon-jaipur-awards': {
    title: 'NEXORA Top Salon Jaipur Awards — 90-Day Salon Competition',
    heading: 'NEXORA Top Salon Jaipur Awards',
    intro: 'Register your Jaipur salon for the fixed 90-day NEXORA competition. Track verified gateway payments, customers, reviews and your position against other approved competitors.',
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

export function NexoraEcosystemPage({ path }: { path: keyof typeof pageData }) {
  const page = pageData[path];
  const isOnboarding = path === '/salon-onboarding';
  const isRewards = path === '/growth-partner-rewards';
  const isTopSalonAwards = path === '/top-salon-jaipur-awards';
  if (isRewards) return <><NexoraEcosystemSeoHead path={path} /><NexoraGrowthPartnerRewardsPage /></>;
  if (isTopSalonAwards) return <><NexoraEcosystemSeoHead path={path} /><NexoraTopSalonJaipurPage /></>;
  return <div className="min-h-screen bg-white text-[#211B2B]">
    <NexoraEcosystemSeoHead path={path} />
    <header className="sticky top-0 z-20 border-b border-[#eee] bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-5 py-4" aria-label="Main navigation">
        <a className="mr-auto font-black tracking-[.18em] text-[#312347]" href="/">NEXORA <span className="text-xs tracking-normal">SALON OS</span></a>
        <a href="/">Home</a><a href="/salon-onboarding">Salon Onboarding</a><a href="/salon-growth">Salon Growth</a><a href="/growth-partner-rewards">Growth Partner Rewards</a><a href="/pricing">Pricing</a><a className="rounded-lg bg-[#312347] px-4 py-2 text-white" href="/login">Owner Workspace</a>
      </nav>
    </header>
    <main>
      <section className="bg-gradient-to-br from-[#20192d] via-[#362545] to-[#775269] px-5 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-[#f0c98b]">NEXORA SALONOS</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">{page.heading}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-white/85">{page.intro}</p><div className="mt-8 flex flex-wrap gap-3"><a className="rounded-xl bg-white px-5 py-3 font-bold text-[#30223b]" href={isRewards ? '/login' : isOnboarding ? '#templates' : '#growth'}>{isRewards ? 'Become a Nexora Growth Partner' : isOnboarding ? 'Explore Templates' : 'Explore Salon Onboarding'}</a><a className="rounded-xl border border-white/50 px-5 py-3 font-bold" href="/">Back to Nexora</a></div></div>
      </section>
      {isOnboarding ? <>
        <section id="templates" className="mx-auto max-w-7xl px-5 py-14"><h2 className="text-3xl font-extrabold">Choose Your Website Template</h2><p className="mt-3 text-[#665d6c]">Explore the actual template previews and their business categories.</p><div className="mt-8 flex snap-x gap-5 overflow-x-auto pb-5" aria-label="Salon website templates">{NEXORA_PUBLIC_TEMPLATES.map((template) => { const meta = NEXORA_TEMPLATE_META.find((item) => item.templateId === template.id); return <article key={template.id} className="w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#e9e4eb] bg-white shadow-sm"><a href={nexoraTemplatePagePath(template.id)}><img className="h-44 w-full object-cover" src={template.coverImageUrl} alt={`${meta?.displayName ?? template.shortName} website preview`} loading="lazy"/><div className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#84617a]">{meta?.categoryName}</p><h3 className="mt-1 font-bold">{meta?.displayName ?? template.shortName}</h3><span className="mt-3 inline-block text-sm font-bold text-[#65466a]">View Demo →</span></div></a></article>; })}</div><a href="/#nexora-template-library" className="mt-4 inline-block font-bold text-[#65466a]">Explore all templates →</a></section>
        <InfoSection title="Create Your Own Brand" items={['Salon name, logo and brand colours', 'Business photographs and address', 'Phone, WhatsApp and opening hours', 'Social media links']} />
        <InfoSection title="Add Your Services" items={['Service name, description, price and duration', 'Service categories and images', 'Staff assignment and packages where supported']} />
        <InfoSection title="Personalise the Customer Experience" items={['Configure booking settings and availability', 'Present service information and contact options', 'Share your salon link or QR destination', 'Edit → Preview → Publish → Share']} />
        <InfoSection title="Your salon identity stays your own" items={['Salon-branded website and digital profile', 'Service catalogue and salon contact information', 'Nexora provides the platform behind the salon experience']} />
        <InfoSection title="Onboarding Benefits" items={['Available setup and product capabilities depend on plan and configuration.', 'Optional or promotional benefits apply only when confirmed under current programme terms.', 'No blanket free or instant setup promise is made on this page.']} />
        <section className="mx-auto max-w-6xl px-5 py-12"><h2 className="text-3xl font-extrabold">Preview before you publish</h2><p className="mt-3 text-[#665d6c]">Review your salon website on desktop, tablet and mobile, then edit, preview, publish and share it with your customers.</p></section>
      </> : isRewards ? <>
        <section className="mx-auto max-w-5xl px-5 py-14"><h2 className="text-3xl font-extrabold">Reward Journey</h2><p className="mt-3 text-[#665d6c]">The targets and reward associations below reflect the supplied programme brief; availability, qualifying events and fulfilment remain subject to verification against the current official policy.</p><ol className="mt-8 grid gap-4 sm:grid-cols-2">{milestones.map(([target, reward], index) => <li key={target} className="rounded-2xl border border-[#e6dccb] bg-[#fbf8f2] p-6"><span className="text-sm font-bold text-[#95743e]">MILESTONE {String(index + 1).padStart(2, '0')}</span><h3 className="mt-2 text-xl font-extrabold">{target}</h3><p className="mt-2">{reward}</p></li>)}</ol><p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6">Trigger rule and fulfilment process require confirmation by the programme owner. The reference brief describes a subsequent qualifying trigger (for example, 26th shop after 25), but this page does not represent that as verified policy.</p></section>
        <InfoSection title="Verification and fulfilment" items={['Previous-period collection records are reviewed', 'Business and shop eligibility are verified', 'Collection audit and programme approval are required', 'Reward fulfilment follows the approved programme terms']} />
        <InfoSection title="Additional recognition" items={['LED sign boards, co-branded T-shirts, promotional advertising and trophies are not represented as available rewards until programme eligibility is confirmed.']} />
      </> : <>
        <section id="growth" className="mx-auto max-w-6xl px-5 py-14"><h2 className="text-3xl font-extrabold">Support the customer journey</h2><p className="mt-4 max-w-3xl leading-7 text-[#665d6c]">From digital salon identity to booking requests and organised follow-up, Nexora brings supported workflows together. Retention is about long-term customer relationships, not a guaranteed booking or revenue outcome.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{growthTopics.map((topic) => <article key={topic} className="rounded-xl border border-[#ece7ed] p-5"><span className="font-bold">{topic}</span></article>)}</div></section>
        <InfoSection title="Communications, promotions and QR" items={['Messages and reminders depend on configured channels, customer consent and integrations.', 'Promotional discounts apply only to eligible salons, services and campaigns.', 'Use a salon-specific verified destination for functional QR codes; campaign artwork is not a payment QR.', 'Do not treat automated messaging or payment processing as available unless configured and confirmed.']} />
        <InfoSection title="Discover and grow responsibly" items={['Digital presence, customer activity and supported business insights', 'Reviews and referrals depend on genuine customer activity.', 'No Google ranking, customer count, revenue or automated return is guaranteed.', 'AI growth and ranking features are demonstrations or planned unless explicitly released.']} />
        <InfoSection title="Salon business transformation" items={['Before: scattered records, manual follow-ups and disconnected operations.', 'With supported Nexora tools: organised information, digital presence, booking workflows and reporting.', 'Explore your setup options on Salon Onboarding or review the approved plans on Pricing.']} />
      </>}
    </main>
    <footer className="border-t border-[#eee] px-5 py-8"><div className="mx-auto flex max-w-7xl flex-wrap gap-5 text-sm"><a href="/">Home</a><a href="/salon-onboarding">Salon Onboarding</a><a href="/salon-growth">Salon Growth</a><a href="/growth-partner-rewards">Growth Partner Rewards</a><a href="/pricing">Pricing</a><a href="/login">Owner Workspace</a></div></footer>
  </div>;
}

function InfoSection({ title, items }: { title: string; items: string[] }) {
  return <section className="border-t border-[#eee] bg-[#fcfafc] px-5 py-12"><div className="mx-auto max-w-6xl"><h2 className="text-3xl font-extrabold">{title}</h2><ul className="mt-6 grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item} className="rounded-xl bg-white p-5 leading-6 shadow-sm">{item}</li>)}</ul></div></section>;
}
