import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chrome } from '@/components/seedit/Chrome';
import { DirectoryCandidates } from '@/components/seedit/Directories';
import { DirectoryTitleBox, LargeButton, Sidebar, SidebarSearch } from '@/components/seedit/Sidebar';
import { getCommunities } from '@/lib/api';
import { type Directory, directoryListPath, getDirectory, seeditCodeUrl } from '@/lib/directories';
import layout from '@/styles/seedit/components/feed-layout.module.css';

export const revalidate = 300;

type Params = { params: Promise<{ code: string }> };

const resolve = async (params: Params['params']): Promise<Directory> => getDirectory(decodeURIComponent((await params).code)) ?? notFound();

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const dir = await resolve(params);
  const title = `s/${dir.code} - Directories`;
  const description = `Every community that has competed for Seedit's s/${dir.code}, in Seedit's rank order.`;
  return { title, description, alternates: { canonical: directoryListPath(dir.code) }, openGraph: { title, description } };
}

export default async function DirectoryPage({ params }: Params) {
  const dir = await resolve(params);
  const communities = new Map(((await getCommunities())?.communities ?? []).map((c) => [c.address, c]));
  return (
    <>
      <Chrome active={dir.code} pageNameIsHeading pageName={<Link href={directoryListPath(dir.code)}>directories</Link>} />
      <div className={layout.content}>
        <div className={layout.sidebar}>
          <Sidebar>
            <SidebarSearch />
            <LargeButton href={seeditCodeUrl(dir.code)}>Open in Seedit</LargeButton>
            <DirectoryTitleBox dir={dir} communities={communities} />
          </Sidebar>
        </div>
        <div className={layout.feed}>
          <DirectoryCandidates directory={dir} communities={communities} />
        </div>
      </div>
    </>
  );
}
