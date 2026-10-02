/** Archive routes (unchanged URL structure) and the matching live Seedit URLs. */
export const communityPath = (address: string) => `/p/${encodeURIComponent(address)}`;
export const postPath = (cid: string) => `/c/${encodeURIComponent(cid)}`;

/** The same thread in the live Seedit app (hash-routed). */
export const seeditPostUrl = (address: string, cid: string) =>
  `https://seedit.app/#/s/${encodeURIComponent(address)}/comments/${encodeURIComponent(cid)}`;
export const seeditCommunityUrl = (address: string) => `https://seedit.app/#/s/${encodeURIComponent(address)}`;
