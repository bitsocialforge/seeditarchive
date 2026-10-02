import type { Flair as FlairData } from '@/lib/comment-meta';
import flairStyles from '@/styles/seedit/components/flair.module.css';
import labelStyles from '@/styles/seedit/components/label.module.css';

/** Seedit's Label stamp (src/components/label/label.tsx), as the first items of a buttons row. */
export function Label({ color, text, first = false, title }: { color: string; text: string; first?: boolean; title?: string }) {
  return (
    <li className={`${labelStyles.label} ${first ? labelStyles.firstInLine : ''}`} title={title}>
      <span className={`${labelStyles.stamp} ${labelStyles[color]}`}>{text}</span>
    </li>
  );
}

/** Seedit's Flair (src/components/flair/flair.tsx); colors are validated in lib/comment-meta.ts. */
export function Flair({ flair }: { flair: FlairData }) {
  return (
    <span className={flairStyles.wrapper}>
      <span className={flairStyles.flair} style={{ backgroundColor: flair.backgroundColor, color: flair.textColor }}>
        {flair.text}
      </span>
    </span>
  );
}
