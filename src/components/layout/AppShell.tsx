import { ConfirmHost } from '@/components/common/ConfirmDialog';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastViewport } from '@/components/common/Toast';
import { OrdersPage } from '@/components/orders/OrdersPage';
import { POSLayout } from '@/components/pos/POSLayout';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { ShiftPage } from '@/components/shift/ShiftPage';
import { TablesPage } from '@/components/tables/TablesPage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSystemThemeSync } from '@/hooks/useSystemThemeSync';
import { useUIStore, type PageId } from '@/store/uiStore';
import { Header } from './Header';
import { ModalHost } from './ModalHost';
import { Sidebar } from './Sidebar';

function Page({ page }: { page: PageId }) {
  switch (page) {
    case 'pos':
      return <POSLayout />;
    case 'tables':
      return <TablesPage />;
    case 'orders':
      return <OrdersPage />;
    case 'reports':
      return <ReportsPage />;
    case 'shift':
      return <ShiftPage />;
    case 'settings':
      return <SettingsPage />;
  }
}

export function AppShell() {
  const activePage = useUIStore((state) => state.activePage);
  useKeyboardShortcuts();
  useSystemThemeSync();

  return (
    <div className="flex h-full flex-col bg-bg text-fg">
      <Header />
      {/*
       * The navigation comes first in the document so it is reached before the
       * page content. `flex-col-reverse` draws it under the page on phones (a
       * bottom bar); from `md` up it is the side rail again.
       */}
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <Sidebar />
        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <ErrorBoundary compact key={activePage}>
            <Page page={activePage} />
          </ErrorBoundary>
        </main>
      </div>
      <ModalHost />
      <ConfirmHost />
      <ToastViewport />
    </div>
  );
}
