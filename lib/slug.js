// Slug rules for contact.aibp.sg
//
// A slug is PERMANENT. Once a QR code carrying /<slug> has been printed on a
// name card or an event badge, that URL must keep resolving to the same person
// forever. Everything below exists to protect that promise.

export function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Column B wins when filled. Otherwise derive from the email local part, which
// is unique by definition and does not move when someone's name is re-recorded.
export function deriveSlug(row) {
  if (row.slug) return slugify(row.slug);
  if (row.email) return slugify(row.email.split('@')[0]);
  return slugify(row.displayName || row.firstName || '');
}

// Two people resolving to one URL is the failure mode that sends a scanned
// badge to the wrong colleague. Fail the build loudly instead of picking one.
export function assertUniqueSlugs(people) {
  const seen = new Map();
  const clashes = [];
  for (const p of people) {
    if (!p.slug) {
      clashes.push(`Row for "${p.displayName || p.email || 'unknown'}" produced an empty slug — set column B or add an email.`);
      continue;
    }
    if (seen.has(p.slug)) {
      clashes.push(`Slug "${p.slug}" is claimed by both "${seen.get(p.slug)}" and "${p.displayName || p.email}".`);
    } else {
      seen.set(p.slug, p.displayName || p.email);
    }
  }
  if (clashes.length) {
    throw new Error(
      'Roster slug conflict — refusing to build:\n  ' + clashes.join('\n  ') +
      '\nFix column B in the roster sheet, then redeploy.'
    );
  }
  return people;
}
