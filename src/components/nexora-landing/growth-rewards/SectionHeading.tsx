interface SectionHeadingProps {
  /** Id of the heading, referenced by the section's `aria-labelledby`. */
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
}

/** Centred section heading: gold-ink eyebrow, title between two gold rules, optional lead. */
export function SectionHeading({ id, eyebrow, title, lead }: SectionHeadingProps) {
  return (
    <div className="ngr-heading">
      <p className="ngr-eyebrow">{eyebrow}</p>
      <h2 id={id} className="ngr-heading__title">
        <span>{title}</span>
      </h2>
      {lead ? <p className="ngr-heading__lead">{lead}</p> : null}
    </div>
  );
}
