import { SidebarTrigger } from '@/components/ui/sidebar';

type AppHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="font-headline text-2xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </header>
  );
}
