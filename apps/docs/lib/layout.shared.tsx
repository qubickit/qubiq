import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpenText, Cpu, Github, Map, Package } from 'lucide-react';
import type { ReactNode } from 'react';

export function baseOptions(): BaseLayoutProps {
  return {
    themeSwitch: {
      enabled: true,
      mode: 'light-dark-system',
    },
    githubUrl: 'https://github.com/qubickit/core',
    nav: {
      title: navTitle('QubicKit Docs'),
      url: '/',
    },
    links: [
      {
        type: 'main',
        text: 'Guides',
        description: 'End-to-end tutorials',
        url: '/guides',
        icon: <Map className="size-4" />,
      },
      {
        type: 'main',
        text: 'Core Library',
        description: '@qubiq/core modules & APIs',
        url: '/core',
        icon: <Cpu className="size-4" />,
      },
      {
        type: 'main',
        text: 'SDK Layer',
        description: 'High-level helpers for dApps',
        url: '/sdk',
        icon: <Package className="size-4" />,
      },
      {
        type: 'icon',
        icon: <BookOpenText className="size-4" />,
        text: 'Playground',
        label: 'Guides landing',
        url: '/guides',
        on: 'nav',
        secondary: true,
      },
      {
        type: 'icon',
        icon: <Github className="size-4" />,
        text: 'GitHub',
        label: 'GitHub repository',
        url: 'https://github.com/qubickit/core',
        external: true,
      },
    ],
  };
}

function navTitle(label: string): ReactNode {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <Package className="size-4" />
      {label}
    </span>
  );
}
