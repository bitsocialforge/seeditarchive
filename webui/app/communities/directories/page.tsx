import type { Metadata } from 'next';
import Link from 'next/link';
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
  const communities = (await getCommunities())?.communities ?? [];
  return (
    <>
      <Chrome pageNameIsHeading pageName={<Link href={DIRECTORY_INDEX_PATH}>directories</Link>} />
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
