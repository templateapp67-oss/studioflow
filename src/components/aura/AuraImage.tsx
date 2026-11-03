import React, { useState } from 'react';

/** Keep the original URL intact; a failed image is replaced only in the view. */
export function AuraImage({ fallbackSrc, fallbackAlt = 'Sample salon photograph', src, srcSet, alt, onError, onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc: string; fallbackAlt?: string }) {
  // A keyed child resets failures when an editor replaces the source.
  return <AuraImageView key={`${src || ''}|${srcSet || ''}|${fallbackSrc}`} {...props} src={src} srcSet={srcSet} alt={alt} fallbackSrc={fallbackSrc} fallbackAlt={fallbackAlt} onError={onError} onLoad={onLoad} />;
}

function AuraImageView({ fallbackSrc, fallbackAlt, src, srcSet, alt, onError, onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc: string; fallbackAlt: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'fallback' | 'unavailable'>(src ? 'loading' : 'fallback');
  const fallback = state === 'fallback' || state === 'unavailable';
  return <img {...props} data-aura-image-state={state} src={state === 'unavailable' ? undefined : fallback ? fallbackSrc : src} srcSet={fallback ? undefined : srcSet} alt={fallback ? (state === 'unavailable' ? 'Image unavailable' : fallbackAlt) : alt} onLoad={(event) => { if (!fallback) setState('loaded'); onLoad?.(event); }} onError={(event) => { setState(fallback ? 'unavailable' : 'fallback'); onError?.(event); }} />;
}
