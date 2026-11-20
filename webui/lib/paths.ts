import type { Comment } from './types';

/** Archive routes (unchanged URL structure) and the matching live Seedit URLs. */
export const communityPath = (address: string) => `/p/${encodeURIComponent(address)}`;
export const postPath = (cid: string) => `/c/${encodeURIComponent(cid)}`;

/**
 * The same thread in the live Seedit app (hash-routed). A reply cid works too:
 * Seedit opens it as a single-comment thread under its post.
 */
export const seeditPostUrl = (address: string, cid: string) =>
  `https://seedit.app/#/s/${encodeURIComponent(address)}/comments/${encodeURIComponent(cid)}`;
export const seeditCommunityUrl = (address: string) => `https://seedit.app/#/s/${encodeURIComponent(address)}`;

/**
 * Whether Seedit can still open a comment. The indexer flips `archived` once a
 * thread stops coming back from crawls (replies inherit their post's status),
 * and a p2p client sits on a fetch that never resolves for a comment nobody
 * serves anymore, so archived comments link to their community instead.
 */
export const isLiveUpstream = (comment: Pick<Comment, 'archived'>) => !comment.archived;

/**
 * Attributes for links into Seedit. The layout's page-wide `no-referrer` exists
 * for third-party media hosts; links to Seedit opt back in to sending the
 * archive's origin, so seedit.app can tell the reader came from here.
 */
export const SEEDIT_LINK = { target: '_blank', rel: 'noopener', referrerPolicy: 'origin' } as const;
