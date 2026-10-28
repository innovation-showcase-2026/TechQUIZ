import type { ReactNode } from 'react';
import { EventBanner } from './EventBanner';

interface LayoutProps {
  children: ReactNode;
  wide?: boolean;
}

export function Layout({ children, wide = false }: LayoutProps) {
  return (
    <div className={`ts-layout${wide ? ' ts-layout--wide' : ''}`}>
      <main className="ts-layout__main">
        <EventBanner />
        {children}
      </main>
    </div>
  );
}
