import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  wide?: boolean;
}

export function Layout({ children, wide = false }: LayoutProps) {
  return (
    <div className={`ts-layout${wide ? ' ts-layout--wide' : ''}`}>
      <main className="ts-layout__main">{children}</main>
    </div>
  );
}
