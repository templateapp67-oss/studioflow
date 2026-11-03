import React, { useState } from 'react';
import { AuraImage } from './AuraImage';
import { AURA_UNISEX_IMAGES } from '../../lib/auraUnisex';

/** A missing/unsupported file is reported rather than leaving a broken player. */
export function AuraVideo({ src, poster, title }: { src: string; poster: string; title: string }) {
  return <AuraVideoView key={src} src={src} poster={poster} title={title} />;
}

function AuraVideoView({ src, poster, title }: { src: string; poster: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="au-video-external-fallback" role="status">
    <AuraImage src={poster} fallbackSrc={AURA_UNISEX_IMAGES.aboutInterior.src} alt={title} />
    <p>Video unavailable. Please try again later.</p>
    <a className="au-btn au-btn-outline-light" href={src} target="_blank" rel="noopener noreferrer">Open video file</a>
  </div>;
  return <video src={src} poster={poster} controls playsInline preload="metadata" onError={() => setFailed(true)} />;
}
