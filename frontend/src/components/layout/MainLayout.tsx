import Sidebar from './Sidebar';
import { useSidebarStore } from '@/store/sidebar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { collapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-64', // Dynamic sidebar width
          'pt-16 lg:pt-0' // Top padding for mobile menu button
        )}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
