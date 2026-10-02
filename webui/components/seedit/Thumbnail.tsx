import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { MediaInfo } from '@/lib/media';
import { UGC_REL } from '@/lib/seedit';
import ax from '@/styles/archive.module.css';
import styles from '@/styles/seedit/components/thumbnail.module.css';
import { ThumbnailImage } from './ThumbnailImage';

interface ThumbnailProps {
  media?: MediaInfo;
  /** Internal page the thumbnail opens (the thread); webpage thumbnails open the link itself, as in Seedit. */
  href: string;
  /**
   * A reply's thumbnail is its only link to the media, so it opens `href` in a
   * new tab and stays focusable; a post's duplicates its title link and is
   * hidden from assistive technology.
   */
  isReply?: boolean;
  isLink: boolean;
  isText: boolean;
  isNsfw: boolean;
  isSpoiler: boolean;
  linkWidth?: number;
  linkHeight?: number;
}

const icon = (name: 'textIcon' | 'linkIcon' | 'imageIcon' | 'spoilerIcon' | 'nsfwIcon') => (
  <span className={`${styles.iconThumbnail} ${styles[name]}`} />
);

const image = (src: string) => <ThumbnailImage src={src} fallbackClassName={`${styles.iconThumbnail} ${styles.linkIcon}`} />;

/** Seedit's choice of media for the thumbnail box, before placeholder icons. */
function mediaElement(media: MediaInfo | undefined, isReply: boolean): { element: ReactNode; isIcon: boolean } {
  switch (media?.type) {
    case 'image':
      return { element: image(media.url), isIcon: false };
    case 'video':
      return {
        element: media.thumbnail ? image(media.thumbnail) : <video src={`${media.url}#t=0.001`} preload="metadata" muted playsInline aria-hidden />,
        isIcon: false,
      };
    case 'webpage':
      return { element: media.thumbnail ? image(media.thumbnail) : null, isIcon: false };
    case 'iframe': {
      const thumbnail = media.patternThumbnailUrl || media.thumbnail;
      return { element: thumbnail ? image(thumbnail) : icon('linkIcon'), isIcon: false };
    }
    case 'gif':
      // Replies show the gif itself; feeds show the image icon, as Seedit does in Chromium.
      return isReply ? { element: image(media.url), isIcon: false } : { element: icon('imageIcon'), isIcon: true };
    default:
      return { element: null, isIcon: false };
  }
}

/** Seedit's placeholder icons (the last one it applies wins), which also switch the box to 50px. */
function placeholderIcon({ media, isLink, isText, isNsfw, isSpoiler }: ThumbnailProps): ReactNode | undefined {
  if (isNsfw) return icon('nsfwIcon');
  if (isSpoiler) return icon('spoilerIcon');
  if (media?.type === 'pdf') return icon('imageIcon');
  if (isLink) return icon('linkIcon');
  if (isText) return icon('textIcon');
  return undefined;
}

/** Fit to 70px from the link's dimensions; icons are 50px. Without either, Seedit's gray 70px box. */
function boxStyle(linkWidth: number | undefined, linkHeight: number | undefined, isIcon: boolean): CSSProperties | undefined {
  if (isIcon) return { '--width': '50px', '--height': '50px' } as CSSProperties;
  if (!linkWidth || !linkHeight) return undefined;
  const scale = Math.min(1, 70 / Math.max(linkWidth, linkHeight));
  return { '--width': `${linkWidth * scale}px`, '--height': `${linkHeight * scale}px` } as CSSProperties;
}

/**
 * Server port of Seedit's Thumbnail (src/components/thumbnail/thumbnail.tsx):
 * the same sizing (fit to 70px from the link's dimensions, 50px icons) and
 * placeholder icons. Seedit's JavaScript-only parts are left out: a gif shows
 * the image icon (what Chromium shows, since it can't extract a first frame),
 * and a video without a thumbnail shows its first frame without the duration
 * overlay.
 */
export function Thumbnail(props: ThumbnailProps) {
  const { media, href, isReply = false, isNsfw, isSpoiler, linkWidth, linkHeight } = props;
  const placeholder = placeholderIcon(props);
  const chosen = mediaElement(media, isReply);
  const style = boxStyle(linkWidth, linkHeight, placeholder !== undefined || chosen.isIcon);
  const frameClass = `${styles.thumbnail} ${styles.thumbnailVisible} ${ax.thumbFrame}`;
  const wrapperClass = `${style ? styles.transparentThumbnailWrapper : styles.thumbnailWrapper} ${ax.thumbWrapper}`;
  const content = placeholder ?? chosen.element;

  if (isReply) {
    return (
      <span className={frameClass} style={style}>
        <span className={wrapperClass}>
          <a href={href} target="_blank" rel={UGC_REL} aria-label="open linked media">
            {content}
          </a>
        </span>
      </span>
    );
  }

  const opensLink = media?.type === 'webpage' && !isNsfw && !isSpoiler;
  return (
    <span className={frameClass} style={style} aria-hidden>
      <span className={wrapperClass}>
        {opensLink ? (
          <a href={media.url} target="_blank" rel={UGC_REL} tabIndex={-1}>
            {content}
          </a>
        ) : (
          <Link href={href} tabIndex={-1}>
            {content}
          </Link>
        )}
      </span>
    </span>
  );
}
