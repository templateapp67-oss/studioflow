import type { ReactNode } from 'react';

/** Original NEXORA wordmark: red monogram tile plus the NEXORA SALONOS lockup. */
export function NexoraMark({ size = 34, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  return (
    <span className={`sl-brand sl-brand--${tone}`}>
      <svg className="sl-brand__mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="9" fill="#FF2323" />
        <path d="M9.5 23.5v-15l13 15v-15" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sl-brand__text">
        <span className="sl-brand__name">NEXORA</span>
        <span className="sl-brand__suffix">SALONOS</span>
      </span>
    </span>
  );
}

export function Eyebrow({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <p className={`sl-eyebrow sl-eyebrow--${tone}`}>
      <span className="sl-eyebrow__dot" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  tone = 'light',
  align = 'center',
  headingLevel = 2,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  tone?: 'light' | 'dark';
  align?: 'center' | 'left';
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <header className={`sl-section-head sl-section-head--${align} sl-section-head--${tone}`}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <Heading id={id}>{title}</Heading>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
