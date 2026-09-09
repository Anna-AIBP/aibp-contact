export const COMPANY = {
  legalName: 'Industry Platform Pte Ltd',
  brand: 'AIBP',
  website: 'aibp.sg',
  websiteUrl: 'https://aibp.sg',
  upcomingUrl: 'https://aibp.sg/upcoming',
  blurb:
    'The ASEAN Innovation Business Platform (AIBP) is an initiative focused on enabling innovation and strategic partnerships across public and private organisations in Southeast Asia. Through curated engagement activities, AIBP supports the growth of regional government agencies, enterprises and solution providers in navigating key themes such as innovation, digital transformation, and sustainability.',
  pillars: 'Access · Assess · Advocate',
};

// Country secondary palette from the AIBP brand book. Keyed off column M.
export const MARKET_COLOURS = {
  malaysia: '#EE963A',
  indonesia: '#4B64AE',
  jakarta: '#4B64AE',
  philippines: '#854C9D',
  thailand: '#834924',
  bangkok: '#834924',
  vietnam: '#F37346',
};
export const DEFAULT_MARKET_COLOUR = '#A8A583'; // brand gold for Singapore / elsewhere

export function marketColour(basedIn) {
  const key = String(basedIn || '').trim().toLowerCase();
  return MARKET_COLOURS[key] || DEFAULT_MARKET_COLOUR;
}
