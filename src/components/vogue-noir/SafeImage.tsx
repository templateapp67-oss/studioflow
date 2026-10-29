import React, { useEffect, useState } from 'react';

export interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  fallback: string;
  alt: string;
  width: number;
  height: number;
}

export function SafeImage({
  src,
  fallback,
  alt,
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: SafeImageProps) {
  const candidate = (src || '').trim() || fallback;
  const [failedSrc, setFailedSrc] = useState<string>('');

  useEffect(() => {
    setFailedSrc('');
  }, [candidate]);

  const activeSrc = failedSrc === candidate ? fallback : candidate;

  return (
    <img
      {...rest}
      src={activeSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      onError={() => {
        if (activeSrc !== fallback) {
          setFailedSrc(candidate);
        }
      }}
    />
  );
}
