import { SidebarTrigger } from '@/components/ui/sidebar';

const PT = {
  bg:      '#ffffff',
  fog:     '#f6f6f3',
  sand:    '#e5e5e0',
  heading: '#211922',
  body:    '#62625b',
  muted:   '#91918c',
  border:  '#e5e5e0',
  borderH: '#bcbcb3',
  red:     '#e60023',
  redH:    '#ad081b',
  redL:    'rgba(230,0,35,0.08)',
  dark:    '#33332e',
} as const;

type AppHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between px-3 sm:px-4 md:px-6"
      style={{ backgroundColor: PT.bg, borderBottom: `1px solid ${PT.border}` }}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="font-headline text-lg md:text-2xl font-bold" style={{ color: PT.heading }}>{title}</h1>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2 md:gap-4">
        {children}
      </div>
    </header>
  );
}
