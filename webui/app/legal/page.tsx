import type { Metadata } from 'next';
import { Chrome } from '@/components/seedit/Chrome';
import { brandText, brandUrl, contactEmail, siteName, siteTitle } from '@/lib/site';
import ax from '@/styles/archive.module.css';
import header from '@/styles/seedit/components/header.module.css';
import staticPage from '@/styles/seedit/components/static-page.module.css';

// Render at request time so the operator's env (CONTACT_EMAIL, branding) is
// read live instead of being baked into the build — same as the home page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: `Legal · ${siteTitle}` },
  description: 'Archive policy and content-removal contact for this instance.',
  alternates: { canonical: '/legal' },
  openGraph: { url: '/legal' },
};

export default function LegalPage() {
  // Seedit's static-page (about/FAQ) layout: its wiki-style prose column.
  return (
    <>
      <Chrome pageNameIsHeading pageName={<span className={header.lowercase}>Legal</span>} />
      <div className={staticPage.content}>
        <article className={`${staticPage.about} ${ax.legal}`}>
          <p>Archive policy for this instance.</p>

          <section>
            <h2>What this site is</h2>
            <p>
              {siteName} is an independent public archive and search index of publicly published
              communities on the Bitsocial network. It stores searchable copies of public posts and
              serves them even after they are no longer live on the network.
              {brandText ? (
                <>
                  {' '}This instance is operated by{' '}
                  {brandUrl ? <a href={brandUrl} rel="noopener noreferrer">{brandText}</a> : brandText}.
                </>
              ) : null}
            </p>
          </section>

          <section>
            <h2>Content policy</h2>
            <p>
              Only public communities explicitly configured by the operator of this instance are
              indexed, and those communities are already moderated on the Bitsocial network — content
              pending moderator approval is never indexed here. When a moderator removes a post or its
              author deletes it, the archived copy is redacted: the content is no longer served, and a
              placeholder tombstone is kept in its place so thread structure stays intact.
            </p>
          </section>

          <section>
            <h2>Content removal / takedown requests</h2>
            {contactEmail ? (
              <p>
                To request the removal of content from this archive — for example a copyright (DMCA)
                claim, illegal content, or personal information — email{' '}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a> with the page URLs (and/or the
                CIDs) of the content in question and the reason for the request. Honored requests are
                redacted from serving and shown as tombstones marked as removed by takedown request.
              </p>
            ) : (
              <p>
                Content-removal requests — for example a copyright (DMCA) claim, illegal content, or
                personal information — are handled by the operator of this instance. Honored requests
                are redacted from serving and shown as tombstones marked as removed by takedown
                request.
              </p>
            )}
          </section>

          <section>
            <h2>Media</h2>
            <p>
              This site does not host or serve media. Archived posts are text; any images or video
              that appear are embedded from third-party hosts. Requests about a media file itself
              should be directed to the host serving it.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
