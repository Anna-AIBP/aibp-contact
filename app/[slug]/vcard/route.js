import { getPerson } from '../../../lib/sheet.js';
import { buildVCard, fetchPhotoBase64 } from '../../../lib/vcard.js';

export const revalidate = 60;

export async function GET(_req, { params }) {
  const { slug } = await params;
  const person = await getPerson(slug);
  if (!person) return new Response('Not found', { status: 404 });

  const photo = await fetchPhotoBase64(person.photo);
  const vcf = buildVCard(person, {
    photoBase64: photo?.base64 || null,
    photoType: photo?.type || 'JPEG',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://contact.aibp.sg',
  });

  return new Response(vcf, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.vcf"`,
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
