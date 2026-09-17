import { ImageResponse } from 'next/og';
import { getPerson } from '../../lib/sheet.js';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AIBP contact card';
export const runtime = 'nodejs';

const GOLD = '#A8A583';
const INK = '#3C3838';
const RED = '#B42024';

// The lockup is colocated with this route so the bundler ships it into the
// function; reading it from /public would not survive the build.
async function lockup() {
  const res = await fetch(new URL('./logo-colour.png', import.meta.url));
  return res.arrayBuffer();
}

// Satori cannot fetch remote images itself, so the headshot is inlined. A
// photo that will not load (Google Photos share links often refuse a
// server-side fetch) must not take the whole card down with it — the layout
// drops to the lockup and the name instead.
async function headshot(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    return `data:${type};base64,${b64}`;
  } catch {
    return null;
  }
}

// Lato is not bundled, so it comes from Google Fonts at render time and the
// result is cached with the image. Both this and the headshot fetch get a hard
// timeout: without one, a host that hangs rather than refusing takes the whole
// build or request down with it. Failure here is cosmetic — the card renders
// in the default face.
async function lato() {
  const wanted = [
    ['https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjxAwXiWtFCfQ7A.ttf', 400],
    ['https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh50XSwiPGQ3q5d0N7w.ttf', 900],
  ];
  const out = [];
  for (const [url, weight] of wanted) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (res.ok) out.push({ name: 'Lato', data: await res.arrayBuffer(), weight, style: 'normal' });
    } catch { /* fall back to the built-in face */ }
  }
  return out;
}

export default async function Image({ params }) {
  const { slug } = await params;
  const p = await getPerson(slug);

  const [logo, photo, fonts] = await Promise.all([
    lockup(),
    headshot(p?.photo),
    lato(),
  ]);

  const logoSrc = `data:image/png;base64,${Buffer.from(logo).toString('base64')}`;
  const name = p?.displayName || 'AIBP';
  const role = p?.jobTitle || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', background: '#FFFFFF', display: 'flex',
          alignItems: 'center', justifyContent: 'center', position: 'relative',
          fontFamily: 'Lato, sans-serif',
        }}
      >
        {photo ? (
          <>
            <img
              src={photo}
              width={300}
              height={300}
              style={{
                width: 300, height: 300, borderRadius: 300, objectFit: 'cover',
                objectPosition: `center ${p.photoPosition || '25%'}`,
                border: `6px solid ${GOLD}`,
              }}
            />
            <div style={{ width: 2, height: 300, background: 'rgba(60,56,56,.18)', margin: '0 62px' }} />
          </>
        ) : null}

        <img src={logoSrc} height={118} style={{ height: 118 }} />

        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 44,
            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14,
          }}
        >
          <div style={{ fontSize: 31, fontWeight: 900, color: INK, letterSpacing: '-0.01em' }}>{name}</div>
          {role ? <div style={{ fontSize: 23, fontWeight: 700, color: '#8C8A6E' }}>{role}</div> : null}
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: RED }} />
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
