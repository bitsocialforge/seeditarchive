import type { Metadata } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import Link from 'next/link';
import { ApiDown } from '@/components/Notice';
import { Chrome } from '@/components/seedit/Chrome';
import { DirectoryIndex } from '@/components/seedit/Directories';
import { CommunityList, Sidebar, SidebarSearch } from '@/components/seedit/Sidebar';
import { getCommunities } from '@/lib/api';
import { DIRECTORY_INDEX_PATH, directories } from '@/lib/directories';
import layout from '@/styles/seedit/components/feed-layout.module.css';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Directories',
  description: "Seedit's short routes (s/news, s/pics…) and every community that has competed for them.",
  alternates: { canonical: DIRECTORY_INDEX_PATH },
};

export default async function DirectoriesPage() {
  const res = await getCommunities();
  const chrome = <Chrome pageNameIsHeading pageName={<Link href={DIRECTORY_INDEX_PATH}>directories</Link>} />;

  // Without the API every route would read "0 posts archived". This page is cached and a failed
  // regeneration keeps the last good one, so only a build without the API (or dev) shows the notice.
  if (!res) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
      throw new Error('Indexer API unreachable: keeping the cached directory index');
    }
    return (
      <>
        {chrome}
        <div className={layout.content}>
          <ApiDown />
        </div>
      </>
    );
  }

  const { communities } = res;
  return (
    <>
      {chrome}
      <div className={layout.content}>
        <div className={layout.sidebar}>
          <Sidebar>
            <SidebarSearch />
            <CommunityList communities={communities} />
          </Sidebar>
        </div>
        <div className={layout.feed}>
          <DirectoryIndex directories={directories} communities={new Map(communities.map((c) => [c.address, c]))} />
        </div>
      </div>
    </>
  );
}
