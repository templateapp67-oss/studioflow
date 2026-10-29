import { useState } from "react";

export function GalleryImage({
  src,
  alt,
  className,
  onError,
}: {
  src: string;
  alt: string;
  className: string;
  onError?: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`${className} ${!isLoaded ? "is-loading" : ""}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={onError}
      />
    </div>
  );
}
