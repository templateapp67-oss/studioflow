import {
  ArrowRight,
  Award,
  Bike,
  Car,
  CheckCircle2,
  ClipboardList,
  Gift,
  Megaphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  TrendingUp,
} from 'lucide-react';

type RewardKind = 'shirt' | 'tablet' | 'laptop' | 'scooter' | 'phone' | 'motorcycle' | 'suv';

const rewardMilestones: Array<{
  target: string;
  reward: string;
  description: string;
  kind: RewardKind;
  imageLabel: string;
}> = [
  { target: '25', reward: 'NEXORA Branded T-shirt', description: 'Start your journey with style.', kind: 'shirt', imageLabel: 'Black NEXORA branded polo T-shirt' },
  { target: '50', reward: 'Samsung Tablet', description: 'Work smarter and grow bigger.', kind: 'tablet', imageLabel: 'Premium tablet computer' },
  { target: '100', reward: 'Branded HP Laptop', description: 'Power your business forward.', kind: 'laptop', imageLabel: 'Premium business laptop' },
  { target: '250', reward: 'Premium Electric Scooter', description: 'Move forward with ease.', kind: 'scooter', imageLabel: 'Modern premium electric scooter' },
  { target: '500', reward: 'Latest iPhone', description: 'Stay connected with NEXORA.', kind: 'phone', imageLabel: 'Premium latest-generation smartphone' },
  { target: '750', reward: 'Royal Enfield 350cc', description: 'Ride towards greater success.', kind: 'motorcycle', imageLabel: 'Classic 350cc motorcycle' },
  { target: '1000+', reward: 'SUV Car + District Partner Recognition', description: 'Celebrate your highest achievement.', kind: 'suv', imageLabel: 'Premium dark SUV vehicle' },
];

const recognitionItems = [
  { kind: 'sign', title: 'LED Sign Boards', note: 'Brand visibility support' },
  { kind: 'shirts', title: 'Co-branded T-shirts', note: 'Partner identity' },
  { kind: 'promotion', title: 'Promotional Advertising', note: 'Local awareness support' },
  { kind: 'trophy', title: 'Achievement Trophies', note: 'Recognition of milestones' },
] as const;

const verificationSteps = [
  { title: 'Previous-period records', detail: 'Collection records from the applicable period are reviewed.', icon: ClipboardList },
  { title: 'Shop eligibility check', detail: 'Business details and qualifying shop eligibility are verified.', icon: ShieldCheck },
  { title: 'Collection audit', detail: 'The collection audit and programme approval are completed.', icon: CheckCircle2 },
  { title: 'Reward fulfilment', detail: 'Approved rewards are fulfilled under the current programme terms.', icon: Gift },
];

export function NexoraGrowthPartnerRewardsPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fafc] text-[#172033]">
      <header className="sticky top-0 z-30 border-b border-[#e8e6e2] bg-white/95 shadow-[0_2px_16px_rgba(20,28,44,0.05)] backdrop-blur">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-9" aria-label="Main navigation">
          <a href="/" className="mr-auto flex min-w-0 items-center gap-2.5" aria-label="NEXORA home">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f7c66d] to-[#bd8730] text-2xl font-black text-[#172033] shadow-sm">N</span>
            <span className="min-w-0 leading-none">
              <span className="block text-xl font-black tracking-[.12em] text-[#101827] sm:text-2xl">NEXORA</span>
              <span className="mt-1 block text-[8px] font-bold tracking-[.21em] text-[#647084] sm:text-[9px]">SALON · GROW · SUCCEED</span>
            </span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-semibold text-[#293449] lg:flex">
            <a className="transition hover:text-[#b47d24]" href="/">Home</a>
            <a className="transition hover:text-[#b47d24]" href="/salon-onboarding">Templates</a>
            <a className="border-b-2 border-[#d79b36] pb-1 font-extrabold text-[#a86c13]" href="/growth-partner-rewards" aria-current="page">Rewards</a>
            <a className="transition hover:text-[#b47d24]" href="/salon-growth">Partner Programme</a>
            <a className="transition hover:text-[#b47d24]" href="/pricing">Support & Plans</a>
          </div>
          <a href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f5c15c] to-[#d89421] px-3.5 py-2.5 text-xs font-extrabold text-[#182033] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:px-5 sm:text-sm">
            Become a Partner <ArrowRight size={16} />
          </a>
        </nav>
        <div className="flex gap-5 overflow-x-auto px-4 pb-2 text-xs font-semibold text-[#536075] lg:hidden">
          <a className="whitespace-nowrap" href="/">Home</a>
          <a className="whitespace-nowrap" href="/salon-onboarding">Templates</a>
          <a className="whitespace-nowrap font-extrabold text-[#a86c13]" href="/growth-partner-rewards" aria-current="page">Rewards</a>
          <a className="whitespace-nowrap" href="/salon-growth">Partner Programme</a>
          <a className="whitespace-nowrap" href="/pricing">Support & Plans</a>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-[#101a2b] px-5 py-14 text-white sm:py-20 lg:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_40%,rgba(214,157,66,0.28),transparent_28%),radial-gradient(circle_at_15%_10%,rgba(76,104,145,0.22),transparent_34%),linear-gradient(115deg,#0c1524_0%,#17243a_56%,#31263a_100%)]" />
          <div className="absolute -right-20 top-0 -z-10 h-80 w-80 rounded-full border border-[#d8ad66]/20" />
          <div className="absolute -right-8 top-12 -z-10 h-64 w-64 rounded-full border border-[#d8ad66]/15" />
          <div className="mx-auto grid max-w-[1320px] items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#e7bc72]/35 bg-[#e7bc72]/10 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[.2em] text-[#f2ca7e]">
                <Sparkles size={14} /> NEXORA Growth Partner Programme
              </p>
              <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[4.25rem]">
                Salon Onboarding Se
                <span className="block bg-gradient-to-r from-[#ffe3a1] via-[#f6c15c] to-[#d8952f] bg-clip-text text-transparent">Achievement Tak.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#e4e9f1] sm:text-lg sm:leading-8">
                Grow your salon network with NEXORA and unlock exciting rewards as you achieve new milestones.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/login" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd575] to-[#d99427] px-6 py-3.5 text-sm font-extrabold text-[#152033] shadow-[0_12px_30px_rgba(211,151,49,.22)] transition hover:-translate-y-0.5 hover:shadow-lg">
                  Become a Nexora Growth Partner <ArrowRight size={17} />
                </a>
                <a href="#reward-journey" className="rounded-full border border-white/60 px-6 py-3.5 text-sm font-bold text-white transition hover:border-[#f6c15c] hover:bg-white/10">
                  Explore Reward Milestones
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-[#c4cedb]">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-[#f4c56f]" /> Clear milestone targets</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-[#f4c56f]" /> Verification-led rewards</span>
              </div>
            </div>
            <div className="relative mx-auto flex min-h-[280px] w-full max-w-[470px] items-center justify-center sm:min-h-[340px]">
              <div className="absolute bottom-5 left-4 right-4 h-12 rounded-full bg-[#eab65c]/20 blur-2xl" />
              <div className="absolute bottom-8 left-6 right-6 flex items-end justify-center gap-3 opacity-70">
                {[38, 65, 92, 124, 158, 194].map((height, index) => <span key={index} className="w-7 rounded-t-md border border-[#e9bd70]/30 bg-gradient-to-t from-[#a56a26]/35 to-[#f3c76d]/80" style={{ height }} />)}
              </div>
              <div className="relative z-10 flex h-56 w-56 items-center justify-center rounded-full border border-[#f2d39a]/35 bg-[radial-gradient(circle,#f4d99f_0%,#d39a3b_36%,#7e5424_68%,rgba(16,26,43,.1)_70%)] shadow-[0_0_70px_rgba(227,172,80,.32)] sm:h-64 sm:w-64">
                <div className="flex h-40 w-40 items-center justify-center rounded-full border border-white/40 bg-gradient-to-br from-[#fff0c8] via-[#e9b957] to-[#a56c28] shadow-inner sm:h-48 sm:w-48">
                  <Trophy size={112} strokeWidth={1.15} className="text-[#64431f] drop-shadow-[0_5px_2px_rgba(75,42,8,.22)] sm:h-32 sm:w-32" />
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#ffe2a2] bg-gradient-to-r from-[#f9d57e] to-[#c58b32] px-5 py-2 text-[10px] font-black tracking-[.16em] text-[#34230f] shadow-lg sm:text-xs">GROW · ACHIEVE · WIN</span>
              </div>
              <div className="absolute right-1 top-7 rounded-2xl border border-white/20 bg-white/10 p-3 text-[#f9d98f] shadow-lg backdrop-blur">
                <TrendingUp size={30} />
              </div>
              <div className="absolute bottom-3 left-2 rounded-xl border border-white/15 bg-[#15233a]/90 px-3 py-2 text-xs font-bold text-[#f5d58f] shadow-lg">
                Every milestone matters
              </div>
            </div>
          </div>
        </section>

        <section id="reward-journey" className="scroll-mt-28 bg-[linear-gradient(180deg,#fbfcfe_0%,#f3f6fa_100%)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1460px]">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#a36d21]">Your progress, celebrated</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#111c2e] sm:text-4xl">Your Reward Journey</h2>
              <p className="mt-3 text-sm leading-6 text-[#475569] sm:text-base">Grow your network, reach new milestones and unlock exciting rewards.</p>
            </div>
            <div className="relative mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
              <div className="absolute left-[7%] right-[7%] top-5 hidden h-0.5 bg-gradient-to-r from-[#e7bb65] via-[#c98b2b] to-[#e7bb65] xl:block" />
              {rewardMilestones.map((milestone, index) => (
                <article key={milestone.target} className="group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#e8dcc8] bg-white shadow-[0_8px_24px_rgba(32,42,58,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(32,42,58,.13)]">
                  <div className="relative z-10 flex justify-center pt-0 xl:pt-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-[#ffe29a] to-[#d99b38] text-sm font-black text-[#2a251d] shadow-md">{index + 1}</span>
                  </div>
                  <div className="mt-2 bg-[#17253a] px-3 py-3 text-center text-white">
                    <p className="text-3xl font-black leading-none tracking-tight text-[#ffdfa0]">{milestone.target}</p>
                    <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[.1em] text-white">Eligible Shops</p>
                  </div>
                  <div className="bg-[#fbf6ed] px-2 pt-2">
                    <RewardArtwork kind={milestone.kind} label={milestone.imageLabel} />
                  </div>
                  <div className="flex flex-1 flex-col px-3 pb-4 pt-3 text-center">
                    <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#a27431]">Milestone {String(index + 1).padStart(2, '0')}</p>
                    <h3 className="mt-1 text-sm font-black leading-5 text-[#162238]">{milestone.reward}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#526075]">{milestone.description}</p>
                  </div>
                  <div className="h-1 w-full bg-gradient-to-r from-[#f5d991] via-[#d9a14a] to-[#f5d991]" />
                </article>
              ))}
            </div>
            <p className="mx-auto mt-7 max-w-4xl rounded-xl border border-[#ead9b7] bg-[#fffaf0] px-4 py-3 text-center text-xs leading-5 text-[#5f4b2d] sm:text-sm">
              Reward targets are shown as programme milestones. Qualifying shops, trigger events, collection periods and fulfilment are subject to verification and the current approved NEXORA programme terms.
            </p>
          </div>
        </section>

        <section className="px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1380px] rounded-[28px] border border-[#f0e5d5] bg-gradient-to-br from-[#fffaf2] via-[#fbf3e7] to-[#f5e7d4] px-4 py-9 shadow-[0_10px_28px_rgba(77,56,27,.06)] sm:px-8 sm:py-11">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#a36d21]">Beyond the milestones</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#172033] sm:text-4xl">Additional Recognition</h2>
              <p className="mt-3 text-sm leading-6 text-[#566174]">Stand out with extra recognition and partner visibility.</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recognitionItems.map((item) => (
                <article key={item.kind} className="overflow-hidden rounded-2xl border border-[#ead9bf] bg-white/85 p-3 text-center shadow-sm">
                  <RecognitionArtwork kind={item.kind} title={item.title} />
                  <h3 className="mt-2 text-sm font-extrabold text-[#19263a]">{item.title}</h3>
                  <p className="mt-1 text-xs text-[#5b6678]">{item.note}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 text-center text-xs leading-5 text-[#69563b]">Additional recognition is subject to programme eligibility, availability and approval. These items are not guaranteed rewards.</p>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1320px]">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#a36d21]">A clear and fair process</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#111c2e] sm:text-4xl">Verification &amp; Fulfilment Process</h2>
              <p className="mt-3 text-sm text-[#526075] sm:text-base">A transparent process for a rewarding journey.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {verificationSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="relative rounded-2xl border border-[#e6eaf0] bg-[#fbfcfe] px-5 pb-6 pt-7 text-center shadow-[0_6px_18px_rgba(23,32,51,.05)]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#14233a] text-[#f3c66e] shadow-md"><Icon size={25} /></div>
                    <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#a36d21]">Step {index + 1}</p>
                    <h3 className="mt-2 text-base font-extrabold text-[#172033]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#526075]">{step.detail}</p>
                  </article>
                );
              })}
            </div>
            <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-5 text-[#647084]">Final eligibility, timing and reward delivery are determined by the approved programme policy and completion of the required checks.</p>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-[#101a2b] px-5 py-14 text-white sm:py-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_88%_45%,rgba(221,164,71,.22),transparent_26%),linear-gradient(110deg,#0c1524,#1b2940_70%,#282039)]" />
          <div className="mx-auto grid max-w-[1320px] items-center gap-8 md:grid-cols-[1.2fr_.8fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#f0c878]">Your next milestone starts here</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">Your Growth. Your Achievement.<span className="block text-[#f3bd58]">Your NEXORA Rewards.</span></h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#dce3ec] sm:text-base">Start building your salon network and take the next step towards your growth milestones.</p>
              <a href="/login" className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffdc85] to-[#d9972e] px-6 py-3.5 text-sm font-extrabold text-[#172033] shadow-lg transition hover:-translate-y-0.5">
                Become a Nexora Growth Partner <ArrowRight size={17} />
              </a>
            </div>
            <div className="relative mx-auto flex h-48 w-full max-w-sm items-end justify-center gap-3 rounded-3xl border border-white/10 bg-white/[.04] p-6">
              {[36, 56, 78, 108, 136].map((height, index) => <span key={index} className="w-10 rounded-t-lg bg-gradient-to-t from-[#a56a2b] to-[#f8d17e] shadow-[0_0_18px_rgba(224,172,86,.18)]" style={{ height }} />)}
              <TrendingUp size={76} strokeWidth={1.5} className="absolute right-7 top-5 text-[#ffe0a0] drop-shadow-lg" />
              <Award size={30} className="absolute bottom-4 left-5 text-[#ffe0a0]" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e7e9ee] bg-white px-5 py-7">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4">
          <a href="/" className="text-sm font-black tracking-[.16em] text-[#18243a]">NEXORA <span className="font-semibold tracking-normal text-[#6a7485]">SALON OS</span></a>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#566174]">
            <a className="hover:text-[#a36d21]" href="/">Home</a>
            <a className="hover:text-[#a36d21]" href="/salon-onboarding">Templates</a>
            <a className="hover:text-[#a36d21]" href="/salon-growth">Salon Growth</a>
            <a className="hover:text-[#a36d21]" href="/pricing">Plans</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RewardArtwork({ kind, label }: { kind: RewardKind; label: string }) {
  const gradientId = 'reward-metal-' + kind;
  const screenId = 'reward-screen-' + kind;
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#f7eedf] via-[#fdfaf5] to-[#efe1ca]">
      <svg className="h-[132px] w-full sm:h-[145px]" viewBox="0 0 320 180" role="img" aria-label={label}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4b5665" />
            <stop offset="52%" stopColor="#172334" />
            <stop offset="100%" stopColor="#090f18" />
          </linearGradient>
          <linearGradient id={screenId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#74a6db" />
            <stop offset="48%" stopColor="#6d79c8" />
            <stop offset="100%" stopColor="#b38bd5" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" rx="16" fill="#f7f0e5" />
        <circle cx="258" cy="30" r="44" fill="#e8d5b7" opacity=".42" />
        <ellipse cx="160" cy="157" rx="103" ry="11" fill="#b7a58b" opacity=".24" />
        {kind === 'shirt' && <>
          <path d="M118 26 146 16h28l28 10 32 26-24 31-18-14v81H102V69L84 83 60 52l32-26Z" fill={`url(#${gradientId})`} stroke="#101725" strokeWidth="2" />
          <path d="m145 17 15 23 15-23 15 11-17 22h-26l-17-22Z" fill="#252e3d" />
          <path d="m144 17 16 16 16-16-8-3h-16Z" fill="#e8e8e5" />
          <path d="M160 43v37" stroke="#77808d" strokeWidth="2" opacity=".55" />
          <path d="M180 68h18v17h-18Z" fill="#c89a4c" opacity=".18" />
          <text x="189" y="65" fill="#e9bd6b" fontSize="11" fontWeight="900" textAnchor="middle">N</text>
          <text x="189" y="75" fill="#f8e5bb" fontSize="5.5" fontWeight="800" textAnchor="middle" letterSpacing="1">NEXORA</text>
        </>}
        {kind === 'tablet' && <>
          <rect x="76" y="10" width="168" height="158" rx="17" fill="#111a28" stroke="#687384" strokeWidth="3" />
          <rect x="83" y="18" width="154" height="140" rx="10" fill={`url(#${screenId})`} />
          <circle cx="124" cy="73" r="45" fill="#ee91d2" opacity=".76" />
          <circle cx="194" cy="104" r="47" fill="#79d4ec" opacity=".85" />
          <circle cx="174" cy="53" r="24" fill="#fdc45d" opacity=".78" />
          <circle cx="160" cy="162" r="2.5" fill="#aeb8c4" />
        </>}
        {kind === 'laptop' && <>
          <rect x="80" y="17" width="160" height="112" rx="8" fill="#283647" stroke="#8e98a4" strokeWidth="3" />
          <rect x="88" y="25" width="144" height="96" rx="3" fill="#1d4e88" />
          <rect x="88" y="25" width="144" height="96" rx="3" fill={`url(#${screenId})`} opacity=".72" />
          <circle cx="160" cy="73" r="23" fill="#f5f7fa" opacity=".95" />
          <text x="160" y="81" textAnchor="middle" fontSize="23" fontWeight="900" fill="#245b98">hp</text>
          <path d="M57 133h206l-18 15H75Z" fill="#aeb6c1" stroke="#707d8c" strokeWidth="2" />
          <path d="M132 135h56l-4 5h-48Z" fill="#748091" />
        </>}
        {kind === 'scooter' && <>
          <circle cx="91" cy="143" r="24" fill="#202a34" /><circle cx="91" cy="143" r="12" fill="#aeb8c2" />
          <circle cx="238" cy="143" r="24" fill="#202a34" /><circle cx="238" cy="143" r="12" fill="#aeb8c2" />
          <path d="m93 140 28-38 38 3 24 29-61 5-18-18" fill="none" stroke="#374657" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M128 101q9-18 35-18h36q15 0 22 15l15 14-8 13-69 0-24-15Z" fill={`url(#${gradientId})`} stroke="#111a25" strokeWidth="3" />
          <path d="M152 84h47q11 0 16 8l7 13h-72l-10-10Z" fill="#313f50" />
          <path d="m190 83 14-28h18l-7 30" fill="none" stroke="#263341" strokeWidth="6" strokeLinecap="round" />
          <path d="M214 55h18" stroke="#202c3a" strokeWidth="5" strokeLinecap="round" />
          <path d="M117 100 96 77" stroke="#303d4c" strokeWidth="6" strokeLinecap="round" />
          <path d="M108 116h-27" stroke="#d8a34c" strokeWidth="4" strokeLinecap="round" />
          <path d="M167 118h30" stroke="#9ba6b3" strokeWidth="4" strokeLinecap="round" />
        </>}
        {kind === 'phone' && <>
          <rect x="91" y="21" width="82" height="142" rx="16" fill="#1b2535" stroke="#8994a2" strokeWidth="3" />
          <rect x="98" y="28" width="68" height="128" rx="11" fill="#d7d9e3" />
          <rect x="185" y="21" width="82" height="142" rx="16" fill="#111a28" stroke="#8792a0" strokeWidth="3" />
          <rect x="192" y="28" width="68" height="128" rx="11" fill={`url(#${screenId})`} />
          <circle cx="226" cy="84" r="34" fill="#8a68d1" opacity=".72" />
          <circle cx="239" cy="104" r="23" fill="#d6a4ed" opacity=".8" />
          <circle cx="218" cy="59" r="18" fill="#7bd1ec" opacity=".8" />
          <circle cx="112" cy="44" r="7" fill="#344254" /><circle cx="132" cy="44" r="7" fill="#344254" /><circle cx="151" cy="44" r="7" fill="#344254" />
          <rect x="209" y="24" width="34" height="5" rx="2.5" fill="#090f18" />
        </>}
        {kind === 'motorcycle' && <>
          <circle cx="89" cy="137" r="29" fill="#17202b" /><circle cx="89" cy="137" r="16" fill="#b5bdc6" /><circle cx="89" cy="137" r="7" fill="#566170" />
          <circle cx="247" cy="137" r="29" fill="#17202b" /><circle cx="247" cy="137" r="16" fill="#b5bdc6" /><circle cx="247" cy="137" r="7" fill="#566170" />
          <path d="m89 137 48-54 51 4 59 50-67 0-25-35-32 35Z" fill="none" stroke="#434f5f" strokeWidth="6" strokeLinejoin="round" />
          <path d="M134 85q18-24 49-22l31 22-9 28-56-3-22-11Z" fill={`url(#${gradientId})`} stroke="#131d2a" strokeWidth="3" />
          <path d="M127 73h-27l-17 8" fill="none" stroke="#323d4a" strokeWidth="6" strokeLinecap="round" />
          <path d="m211 83 21-28 21 2" fill="none" stroke="#353f4d" strokeWidth="6" strokeLinecap="round" />
          <path d="m227 57 16 0" stroke="#e0b86e" strokeWidth="4" strokeLinecap="round" />
          <path d="M144 113h43l-7 24h-35Z" fill="#697584" stroke="#222d3a" strokeWidth="3" />
          <path d="M172 125h35" stroke="#bdc4ca" strokeWidth="6" strokeLinecap="round" />
          <path d="M130 67q22-12 52-7" fill="none" stroke="#141d29" strokeWidth="10" strokeLinecap="round" />
          <path d="m180 70 15 10" stroke="#d6a04a" strokeWidth="3" />
        </>}
        {kind === 'suv' && <>
          <circle cx="101" cy="140" r="25" fill="#121a26" /><circle cx="101" cy="140" r="13" fill="#aeb8c4" /><circle cx="101" cy="140" r="5" fill="#566272" />
          <circle cx="236" cy="140" r="25" fill="#121a26" /><circle cx="236" cy="140" r="13" fill="#aeb8c4" /><circle cx="236" cy="140" r="5" fill="#566272" />
          <path d="M42 124 57 91q5-12 21-17l38-25h76q20 0 35 19l27 28 24 9 8 23-7 15h-28a25 25 0 0 0-50 0h-74a25 25 0 0 0-50 0H40Z" fill={`url(#${gradientId})`} stroke="#101827" strokeWidth="3" />
          <path d="m124 57-26 38h88l-22-39Z" fill="#b8c8d8" opacity=".82" />
          <path d="M169 56h21q14 0 24 15l18 24h-58Z" fill="#91a9bd" opacity=".78" />
          <path d="M53 105h216" stroke="#d3a45d" strokeWidth="3" opacity=".78" />
          <path d="M46 117h18" stroke="#f7e4b5" strokeWidth="6" strokeLinecap="round" />
          <path d="M264 115h10" stroke="#e9cf9b" strokeWidth="5" strokeLinecap="round" />
          <path d="M141 112h31" stroke="#aab4bf" strokeWidth="4" />
          <rect x="143" y="116" width="25" height="10" rx="2" fill="#1d2734" />
        </>}
      </svg>
    </div>
  );
}

function RecognitionArtwork({ kind, title }: { kind: 'sign' | 'shirts' | 'promotion' | 'trophy'; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#f6eddf] to-[#e8d3b1]">
      <svg className="h-[142px] w-full" viewBox="0 0 320 170" role="img" aria-label={title}>
        <rect width="320" height="170" rx="14" fill="#f4eadb" />
        {kind === 'sign' && <>
          <rect x="33" y="28" width="254" height="112" rx="8" fill="#171a20" stroke="#9d712f" strokeWidth="5" />
          <rect x="42" y="37" width="236" height="94" rx="4" fill="#241b14" stroke="#e5b75c" strokeWidth="2" />
          <path d="M76 103V64l25 23 25-23v39" fill="none" stroke="#e8b95e" strokeWidth="9" strokeLinejoin="round" />
          <text x="194" y="78" textAnchor="middle" fill="#f6d27f" fontSize="22" fontWeight="900" letterSpacing="2">NEXORA</text>
          <text x="194" y="101" textAnchor="middle" fill="#f6d27f" fontSize="12" fontWeight="800" letterSpacing="3">SALON</text>
          <path d="M58 118h204" stroke="#d69a40" strokeWidth="2" opacity=".75" />
        </>}
        {kind === 'shirts' && <>
          <path d="M75 50 105 37h24l28 13 24 23-18 24-14-11v56H81V86l-14 11-18-24Z" fill="#172233" stroke="#0c1420" strokeWidth="3" />
          <path d="m105 37 12 20 12-20" fill="none" stroke="#d1a253" strokeWidth="4" />
          <text x="137" y="93" fill="#e9bd6b" fontSize="10" fontWeight="900" textAnchor="middle">N</text>
          <path d="M183 52 210 40h23l27 12 21 22-17 23-14-11v55h-67V86l-14 11-17-23Z" fill="#283748" stroke="#172232" strokeWidth="3" />
          <path d="m210 40 12 18 12-18" fill="none" stroke="#d1a253" strokeWidth="4" />
          <text x="244" y="94" fill="#e9bd6b" fontSize="10" fontWeight="900" textAnchor="middle">NEXORA</text>
        </>}
        {kind === 'promotion' && <>
          <path d="M48 137V52h224v85" fill="#fdfaf4" stroke="#566274" strokeWidth="7" />
          <path d="M62 65h196v61H62Z" fill="#14233b" />
          <path d="M76 114V80l18 15 18-15v34" fill="none" stroke="#e9bb64" strokeWidth="6" />
          <text x="180" y="91" textAnchor="middle" fill="#f7d17c" fontSize="17" fontWeight="900">NEXORA</text>
          <text x="180" y="108" textAnchor="middle" fill="#f7d17c" fontSize="10" fontWeight="800" letterSpacing="2">SALON</text>
          <path d="M160 137v17M92 154h136" stroke="#6c7787" strokeWidth="6" strokeLinecap="round" />
          <circle cx="258" cy="51" r="13" fill="#e1b45f" opacity=".75" />
        </>}
        {kind === 'trophy' && <>
          <path d="M104 35h112v34q0 54-56 61-56-7-56-61Z" fill="#d8a64a" stroke="#9a6a24" strokeWidth="4" />
          <path d="M104 47H67q0 48 45 50M216 47h37q0 48-45 50" fill="none" stroke="#c08b36" strokeWidth="13" strokeLinecap="round" />
          <path d="M150 121v20M124 145h72" stroke="#8c612a" strokeWidth="10" strokeLinecap="round" />
          <path d="M160 53 167 69l18 2-13 12 3 17-15-8-15 8 3-17-13-12 18-2Z" fill="#fff0bc" />
          <rect x="129" y="151" width="62" height="9" rx="3" fill="#64451e" />
        </>}
      </svg>
    </div>
  );
}
