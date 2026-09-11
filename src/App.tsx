import { AppShell } from '@/components/layout/AppShell';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { StartupError } from '@/components/layout/StartupError';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';

export default function App() {
  const { state, retry } = useAppBootstrap();

  if (state === 'loading') return <SplashScreen />;
  if (state === 'error') return <StartupError onRetry={retry} />;
  return <AppShell />;
}
