'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Seedit swaps a thumbnail whose image fails to load for the link icon
 * (thumbnail.tsx `isNotFound`). Archived links outlive their hosts, so the
 * archive keeps that behavior; an image that broke before hydration is caught
 * on mount.
 */
export function ThumbnailImage({ src, fallbackClassName }: { src: string; fallbackClassName: string }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth === 0) setBroken(true);
  }, []);

  if (broken) return <span className={fallbackClassName} data-broken-thumbnail="" />;
  // eslint-disable-next-line @next/next/no-img-element -- third-party archived media, not optimizable
  return <img ref={ref} src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
}
