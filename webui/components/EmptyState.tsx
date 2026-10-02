import ax from '@/styles/archive.module.css';
import home from '@/styles/seedit/views/home.module.css';

/** No communities configured: Seedit's empty front page ("no subscriptions") layout with the operator instructions. */
export function EmptyState() {
  return (
    <section className={home.noSubscriptions}>
      <br />
      <h1>No communities indexed yet</h1>
      <div className={home.squash}>
        <p>
          This is a neutral Bitsocial indexer. It ships empty — the operator chooses which communities to crawl and make
          searchable.
        </p>
      </div>
      <div className={ax.emptyCode}>
        <p>To start indexing</p>
        <pre>
          COMMUNITIES=art.bso,technology.bso{'\n'}# …or point at a directory of communities:{'\n'}
          COMMUNITIES_SOURCE=https://example.com/communities.json
        </pre>
      </div>
      <p className={home.squash}>
        Just exploring? Run <code>npm run seed</code> in <code>server/</code> to load demo content.
      </p>
    </section>
  );
}
