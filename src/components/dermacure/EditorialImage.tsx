import { useState, type ImgHTMLAttributes } from "react";
export const NEUTRAL_CLINIC_IMAGE = "/templates/dermacure/care-neutral.svg";
type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: string;
  fallbackAlt?: string;
  onPrimaryError?: () => void;
};
/** Each URL is attempted once per mounted image. Even a missing local asset
 * terminates in inline SVG, never an external fallback or repeated error loop. */
export function EditorialImage({
  src,
  fallback,
  alt,
  fallbackAlt,
  onPrimaryError,
  onError,
  className = "",
  ...props
}: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const primary = typeof src === "string" && src.trim() ? src : undefined;
  const safeFallback =
    typeof fallback === "string" && fallback.startsWith("/") && !fallback.startsWith("//")
      ? fallback
      : NEUTRAL_CLINIC_IMAGE;
  const chosen = [primary, safeFallback].find(
    (url) => url && !failed.includes(url),
  );
  const label =
    chosen && chosen === primary
      ? alt
      : fallbackAlt || `${alt || "Clinic image"} — neutral illustration`;
  if (!chosen)
    return (
      <svg
        className={`${className} dc-image-terminal`}
        style={props.style}
        width={props.width}
        height={props.height}
        role={alt === "" ? "presentation" : "img"}
        aria-label={alt === "" ? undefined : label}
        aria-hidden={alt === "" ? true : undefined}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="800" height="600" fill="#E6E6E6" />
        <circle cx="400" cy="300" r="180" fill="#FAFAFA" />
        <circle
          cx="400"
          cy="300"
          r="205"
          fill="none"
          stroke="#A0A09F"
          strokeWidth="2"
        />
        <path
          d="M400 170c-30 60-80 100-80 150a80 80 0 0 0 160 0c0-50-50-90-80-150Z"
          fill="none"
          stroke="#000000"
          strokeWidth="5"
        />
      </svg>
    );
  return (
    <img
      {...props}
      className={className || undefined}
      src={chosen}
      srcSet={chosen === primary ? props.srcSet : undefined}
      alt={label}
      onError={(event) => {
        setFailed((urls) => (urls.includes(chosen) ? urls : [...urls, chosen]));
        if (chosen === primary) onPrimaryError?.();
        onError?.(event);
      }}
    />
  );
}
