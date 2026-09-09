// vCard 3.0 builder. 3.0 rather than 4.0 because iOS Contacts, Android and
// Outlook all import it without complaint; 4.0 is still patchy on older Android.

const esc = (v) => String(v || '')
  .replace(/\\/g, '\\\\')
  .replace(/\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

// RFC 2426 asks for a 75-octet line limit, continuation lines starting with a
// space. Matters most for the base64 photo, which is thousands of characters.
function fold(line) {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    out.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) out.push(' ' + rest);
  return out.join('\r\n');
}

export function buildVCard(person, opts = {}) {
  const { photoBase64 = null, photoType = 'JPEG', siteUrl = 'https://contact.aibp.sg' } = opts;
  const L = [];

  L.push('BEGIN:VCARD');
  L.push('VERSION:3.0');
  L.push(`N:${esc(person.lastName)};${esc(person.firstName)};;;`);
  L.push(`FN:${esc(person.displayName || [person.firstName, person.lastName].filter(Boolean).join(' '))}`);
  L.push(`ORG:${esc('Industry Platform Pte Ltd')};${esc(person.team || 'AIBP')}`);

  if (person.jobTitle)    L.push(`TITLE:${esc(person.jobTitle)}`);
  if (person.mobile)      L.push(`TEL;TYPE=CELL,VOICE:${esc(person.mobile)}`);
  if (person.officePhone) L.push(`TEL;TYPE=WORK,VOICE:${esc(person.officePhone)}`);
  if (person.email)       L.push(`EMAIL;TYPE=WORK,INTERNET:${esc(person.email)}`);

  // Column R is free text and varies by market, so it goes in the street
  // component whole rather than being guessed apart into street/city/postcode.
  if (person.officeAddress) {
    L.push(`ADR;TYPE=WORK:;;${esc(person.officeAddress)};;;;`);
    L.push(`LABEL;TYPE=WORK:${esc(person.officeAddress)}`);
  }

  if (person.linkedin) L.push(`URL;TYPE=LinkedIn:${esc(person.linkedin)}`);
  L.push(`URL;TYPE=WORK:${esc(`${siteUrl}/${person.slug}`)}`);

  if (photoBase64) L.push(`PHOTO;ENCODING=b;TYPE=${photoType}:${photoBase64}`);

  L.push(`NOTE:${esc('AIBP — ASEAN Innovation Business Platform. Saved from ' + siteUrl + '/' + person.slug)}`);
  L.push(`REV:${new Date().toISOString().replace(/\.\d{3}/, '')}`);
  L.push('END:VCARD');

  return L.map(fold).join('\r\n') + '\r\n';
}

// Squarespace serves large originals; anything past this goes in as a URL
// reference instead of bloating the .vcf beyond what Contacts will accept.
export const MAX_EMBEDDED_PHOTO_BYTES = 500 * 1024;

export async function fetchPhotoBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_EMBEDDED_PHOTO_BYTES) return null;
    const ct = res.headers.get('content-type') || '';
    const type = ct.includes('png') ? 'PNG' : 'JPEG';
    return { base64: buf.toString('base64'), type };
  } catch {
    return null;
  }
}
