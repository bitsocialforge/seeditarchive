/**
 * Link media classification ported from Seedit (src/lib/utils/media-utils.ts,
 * src/lib/utils/embed-utils.ts and src/data/media-extensions.ts), so a link is
 * thumbnailed and previewed the way the Seedit feed does it.
 */
import { safeHttpUrl } from './seedit';

const MEDIA_EXTENSIONS = {
  image:
    '3ds apng avci avcs avif azv b16 bmp btf btif cgm cmx dds dib djv djvu dng dpx drle dwg dxf emf exr fbs fh fh4 fh5 fh7 fhc fits fpx fst g3 gif heic heics heif heifs hej2 ico ief jaii jais jfif jhc jls jng jp2 jpe jpeg jpf jpg jpg2 jph jpx jxl jxr jxra jxrs jxs jxsc jxsi jxss ktx ktx2 mdi mmr npx pbm pct pcx pgm pic png pnm ppm psd pti ras rgb rlc sgi sid svg svgz t38 tap tfx tga tif tiff uvg uvi uvvg uvvi vtf wbmp wdp webp wmf xbm xif xpm xwd',
  video:
    '3g2 3gp 3gpp asf asx avi dvb f4v fli flv fvt h261 h263 h264 jpgm jpgv jpm m1v m2t m2ts m2v m4s m4u m4v mj2 mjp2 mk3d mks mkv mng mov movie mp4 mp4v mpe mpeg mpg mpg4 mts mxu ogv pyv qt smv ts uvh uvm uvp uvs uvu uvv uvvh uvvm uvvp uvvs uvvu uvvv viv vob webm wm wmv wmx wvx',
  audio:
    'aac adp adts aif aifc aiff amr au caf dra dts dtshd ecelp4800 ecelp7470 ecelp9600 eol flac kar lvp m2a m3a m3u m4a m4b mid midi mka mp2 mp2a mp3 mp4a mpga mxmf oga ogg opus pya ra ram rip rmi rmp s3m sil snd spx uva uvva wav wax weba wma xm',
} as const;

const mediaTypeByExtension = new Map<string, string>(
  Object.entries(MEDIA_EXTENSIONS).flatMap(([type, extensions]) => extensions.split(' ').map((extension) => [extension, type])),
);

function getPathMediaType(pathname: string): string | undefined {
  const fileName = pathname.slice(pathname.lastIndexOf('/') + 1);
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return undefined;
  const extension = fileName.slice(dotIndex + 1);
  return extension === 'gif' ? 'gif' : mediaTypeByExtension.get(extension);
}

const youtubeHosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be', 'm.youtube.com', 'music.youtube.com', 'yewtu.be', 'inv.nadeko.net', 'yt.artemislena.eu', 'invidious.nerdvpn.de'];
const embedHosts = new Set<string>([
  ...youtubeHosts,
  'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
  'reddit.com', 'www.reddit.com', 'old.reddit.com',
  'twitch.tv', 'www.twitch.tv',
  'tiktok.com', 'www.tiktok.com',
  'instagram.com', 'www.instagram.com',
  'odysee.com', 'www.odysee.com',
  'bitchute.com', 'www.bitchute.com',
  'soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com', 'api.soundcloud.com', 'w.soundcloud.com',
  'streamable.com', 'www.streamable.com',
  'spotify.com', 'www.spotify.com', 'open.spotify.com',
]);
const redditHosts = new Set(['reddit.com', 'www.reddit.com', 'old.reddit.com']);

function canEmbed(url: URL): boolean {
  if (url.pathname.toLowerCase().endsWith('.pdf')) return true;
  if (redditHosts.has(url.host)) return url.pathname.includes('/comments/');
  return embedHosts.has(url.host) || (url.host.startsWith('yt.') && url.searchParams.has('v'));
}

function getYouTubeVideoId(url: URL): string | null {
  if (url.host.includes('youtu.be')) return url.pathname.slice(1);
  if (url.pathname.includes('/shorts/')) return url.pathname.split('/shorts/')[1].split('/')[0];
  if (url.searchParams.has('v')) return url.searchParams.get('v');
  return null;
}

function getPatternThumbnailUrl(url: URL): string | undefined {
  const videoId = getYouTubeVideoId(url);
  if (videoId && /^[\w-]{6,20}$/.test(videoId)) return `https://img.youtube.com/vi/${videoId}/0.jpg`;
  if (url.host.includes('streamable.com')) {
    const id = url.pathname.split('/')[1];
    if (id && /^\w+$/.test(id)) return `https://cdn-cf-east.streamable.com/image/${id}.jpg`;
  }
  return undefined;
}

export type MediaType = 'image' | 'gif' | 'video' | 'audio' | 'iframe' | 'pdf' | 'webpage';

export interface MediaInfo {
  url: string;
  type: MediaType;
  thumbnail?: string;
  patternThumbnailUrl?: string;
}

const THUMBNAIL_BLACKLISTED_DOMAINS = ['twitter.com', 'x.com'];

/** Seedit's getCommentMediaInfo for an archived row (link + thumbnail_url). */
export function getMediaInfo(link: string | null | undefined, thumbnailUrl: string | null | undefined): MediaInfo | undefined {
  const safeLink = safeHttpUrl(link);
  if (!safeLink) return undefined;
  const url = new URL(safeLink);
  let type: MediaType = 'webpage';
  let patternThumbnailUrl: string | undefined;
  if (url.pathname === '/_next/image' && url.search.startsWith('?url=')) {
    type = 'image';
  } else if (url.pathname.toLowerCase().endsWith('.pdf')) {
    type = 'pdf';
  } else {
    type = (getPathMediaType(url.pathname.toLowerCase()) as MediaType | undefined) ?? 'webpage';
    // Seedit's two branches both end here: any embeddable host is an iframe.
    if (canEmbed(url) || url.host.startsWith('yt.')) {
      type = 'iframe';
      patternThumbnailUrl = getPatternThumbnailUrl(url);
    }
  }
  const hostname = url.hostname.toLowerCase();
  const blacklisted = THUMBNAIL_BLACKLISTED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  if (blacklisted) return { url: safeLink, type };
  return { url: safeLink, type, patternThumbnailUrl, thumbnail: safeHttpUrl(thumbnailUrl) };
}

/** Seedit's getHasThumbnail. */
export function getHasThumbnail(info: MediaInfo | undefined): boolean {
  if (!info) return false;
  const iframeThumbnail = info.patternThumbnailUrl || info.thumbnail;
  return (
    info.type === 'image' ||
    info.type === 'video' ||
    info.type === 'gif' ||
    (info.type === 'webpage' && Boolean(info.thumbnail)) ||
    (info.type === 'iframe' && Boolean(iframeThumbnail)) ||
    info.type === 'pdf'
  );
}
