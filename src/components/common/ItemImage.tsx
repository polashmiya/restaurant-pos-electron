import { useState, type ReactNode } from 'react';

/**
 * Menu photo with a graceful fallback: if the file is missing or cannot be
 * decoded, the fallback (category icon) is shown instead of a broken image.
 */
export function ItemImage({ src, className, fallback }: { src?: string; className?: string; fallback: ReactNode }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!src || failedSrc === src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
