import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://contact.aibp.sg'),
  title: { default: 'AIBP Contact', template: '%s · AIBP' },
  description: 'Digital contact cards for the AIBP team.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&family=Lato:wght@300;400;700;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
