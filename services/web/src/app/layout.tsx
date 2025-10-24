import type { Metadata } from 'next';
import './bootstrap.css';

export const metadata: Metadata = {
  title: 'HailMary Direct Search Platform | LeadAdvantage Global',
  description: 'Advanced customer search and management platform powered by LeadAdvantage Global. Find and connect with your ideal customers through our comprehensive B2B lead generation platform.',
  keywords: ['customer search', 'CRM', 'business intelligence', 'lead generation', 'B2B marketing', 'customer data'],
  authors: [{ name: 'LeadAdvantage Global' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'HailMary Direct Search Platform',
    description: 'Advanced customer search and management platform',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="h-full font-sans antialiased">
        <div id="root" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
