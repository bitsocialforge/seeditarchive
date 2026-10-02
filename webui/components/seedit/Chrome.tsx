import Link from 'next/link';
import type { ReactNode } from 'react';
import { getCommunities } from '@/lib/api';
import type { Tab } from '@/lib/listing';
import { codePath, directories, DIRECTORY_INDEX_PATH, directoryForAddress } from '@/lib/directories';
import { communityPath } from '@/lib/paths';
import { getCompactCommunityName } from '@/lib/seedit';
import { siteName } from '@/lib/site';
import ax from '@/styles/archive.module.css';
import accountBar from '@/styles/seedit/components/account-bar.module.css';
import header from '@/styles/seedit/components/header.module.css';
import topbar from '@/styles/seedit/components/topbar.module.css';

/**
 * Seedit's TopBar (src/components/topbar/topbar.tsx): the "my communities"
 * dropdown (a <details> here, so it opens without JavaScript) and the
 * community bar. Like Seedit's, the bar names its short routes (s/news…) in
 * reverse default-subscription order, then any archived community no route
 * covers; "edit »" is the directory index.
 */
async function TopBar({ active }: { active?: string }) {
  const communities = (await getCommunities())?.communities ?? [];
  const routes = directories.filter((d) => d.boards.length > 0).reverse();
  const uncovered = communities.filter((c) => !directoryForAddress(c.address));
  const items = [
    ...routes.map((d) => ({ key: d.code, href: codePath(d.code), label: d.code })),
    ...uncovered.map((c) => ({ key: c.address, href: communityPath(c.address), label: getCompactCommunityName(c.address) })),
  ];
  return (
    <div className={topbar.headerArea}>
      <div className={topbar.widthClip}>
        <details className={`${topbar.dropdown} ${topbar.subsDropdown}`}>
          <summary className={`${topbar.selectedTitle} ${ax.summary}`}>my communities</summary>
          <div className={`${topbar.dropChoices} ${topbar.subsDropChoices}`}>
            {communities.map((community) => (
              <Link key={community.address} href={communityPath(community.address)} className={topbar.dropdownItem}>
                {getCompactCommunityName(community.address)}
              </Link>
            ))}
          </div>
        </details>
        <div className={topbar.srList}>
          <ul className={topbar.srBar}>
            <li>
              <Link href="/" className={`${topbar.homeButton} ${active === 'home' ? topbar.selected : topbar.choice}`}>
                home
              </Link>
            </li>
            <li>
              <span className={topbar.separator}>-</span>
              <Link href="/" className={topbar.choice}>
                all
              </Link>
            </li>
            {items.length > 0 && (
              <li>
                <span className={topbar.separator}> | </span>
              </li>
            )}
            {items.map((item, index) => (
              <li key={item.key}>
                {index !== 0 && <span className={topbar.separator}>-</span>}
                <Link href={item.href} className={active === item.key ? topbar.selected : topbar.choice}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <Link className={topbar.editLink} href={DIRECTORY_INDEX_PATH}>
          edit »
        </Link>
      </div>
    </div>
  );
}

/** Takes the place of Seedit's AccountBar: there are no accounts in a read-only archive. */
function ArchiveBar() {
  return (
    <div className={accountBar.content}>
      <span className={accountBar.user}>
        <Link href="/legal">read-only archive</Link>
      </span>
      <span className={accountBar.separator}>|</span>
      <Link href="/search" className={accountBar.textButton}>
        search
      </Link>
    </div>
  );
}

function TabItems({ tabs }: { tabs: Tab[] }) {
  return tabs.map((tab) => (
    <li key={tab.label} className={tab.selected ? header.selected : undefined}>
      <Link href={tab.href} aria-current={tab.selected ? 'page' : undefined}>
        {tab.label}
      </Link>
    </li>
  ));
}

interface ChromeProps {
  /** Top bar selection: 'home', a short route's code, or a community address. */
  active?: string;
  /** Seedit's span.pageName beside the logo. */
  pageName?: ReactNode;
  /** Render the page name as the page's h1 (community, search and legal pages). */
  pageNameIsHeading?: boolean;
  tabs?: Tab[];
}

/**
 * Seedit's page chrome: TopBar, the account-bar slot and Header
 * (src/components/header/header.tsx). Seedit picks the desktop or mobile tab
 * row in JavaScript at 640px; both are rendered here and one is hidden by CSS.
 */
export function Chrome({ active, pageName, pageNameIsHeading = false, tabs = [] }: ChromeProps) {
  const PageName = pageNameIsHeading ? 'h1' : 'span';
  return (
    <>
      <TopBar active={active} />
      <ArchiveBar />
      <div className={header.header}>
        <div className={header.container}>
          <div className={header.logoContainer}>
            <Link href="/" className={header.logoLink} aria-label={`${siteName} home`}>
              {/* Intrinsic sizes reserve the logo's space before the images load, as in Seedit. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={header.logo} src="/assets/sprout/sprout.png" width={61} height={100} alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={header.logoText} src="/assets/sprout/seedit-text-light.svg" width={1028} height={320} alt="" />
              <span className={ax.archiveTag}>archive</span>
            </Link>
          </div>
          {pageName ? <PageName className={`${header.pageName} ${header.soloPageName}`}>{pageName}</PageName> : null}
          {tabs.length > 0 && (
            <ul className={`${header.tabMenu} ${ax.desktopOnly}`}>
              <TabItems tabs={tabs} />
            </ul>
          )}
        </div>
        {tabs.length > 0 && (
          <ul className={`${header.tabMenu} ${ax.mobileOnly}`}>
            <TabItems tabs={tabs} />
          </ul>
        )}
      </div>
    </>
  );
}
