import QRCode from 'qrcode';
import { getPerson } from '../../../lib/sheet.js';

export const revalidate = 86400;

// /<slug>/qr            -> SVG, for print (vector, scales to any card size)
// /<slug>/qr?format=png -> PNG, for email signatures
// &size=600             -> PNG pixel size
// Error correction M: tolerates a little print wear without inflating the
// module count the way H would.
export async function GET(req, { params }) {
  const { slug } = await params;
  const person = await getPerson(slug);
  if (!person) return new Response('Not found', { status: 404 });

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://contact.aibp.sg'}/${person.slug}`;
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'svg').toLowerCase();
  const size = Math.min(2000, Math.max(120, parseInt(searchParams.get('size') || '600', 10)));

  const opts = {
    errorCorrectionLevel: 'M',
    margin: 2,                          // quiet zone — scanners need it
    color: { dark: '#3C3838', light: '#FFFFFF' },
  };

  if (format === 'png') {
    const buf = await QRCode.toBuffer(url, { ...opts, type: 'png', width: size });
    return new Response(buf, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
    });
  }

  const svg = await QRCode.toString(url, { ...opts, type: 'svg' });
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
}
