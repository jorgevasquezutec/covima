import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar from './Sidebar';
import { useSidebarStore } from '@/store/sidebar';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { LevelUpModal } from '@/pages/gamificacion/components/LevelUpModal';
import { gamificacionApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface LevelUpData {
  nivel: { numero: number; nombre: string };
  insignias: Array<{ codigo: string; nombre: string; icono: string }>;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { collapsed } = useSidebarStore();
  const { user, token } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);
  const levelUpQueueRef = useRef<LevelUpData[]>([]);
  const isFirstTimeRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  // Check if onboarding should show
  useEffect(() => {
    if (user?.id) {
      const key = `onboarding_seen_${user.id}`;
      if (!localStorage.getItem(key)) {
        isFirstTimeRef.current = true;
        setShowOnboarding(true);
      }
    }
  }, [user?.id]);

  // Socket connection for level-up notifications
  useEffect(() => {
    if (!token || !user?.id) return;

    const getWsUrl = (): string => {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
      }
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return `http://${window.location.hostname}:3000`;
      }
      return 'http://localhost:3000';
    };

    const socket = io(`${getWsUrl()}/asistencia`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[MainLayout Socket] Connected for notifications');
    });

    socket.on('levelUp', (data: LevelUpData) => {
      console.log('[MainLayout Socket] LevelUp received:', data);
      // Queue it — will show after onboarding if needed
      levelUpQueueRef.current.push(data);
      processLevelUpQueue();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id]);

  // Process level-up queue (show next if nothing else is showing)
  const processLevelUpQueue = useCallback(() => {
    if (showOnboarding || showLevelUp) return;
    const next = levelUpQueueRef.current.shift();
    if (next) {
      setLevelUpData(next);
      setShowLevelUp(true);
    }
  }, [showOnboarding, showLevelUp]);

  // When modals close, try to show next queued level-up
  useEffect(() => {
    if (!showOnboarding && !showLevelUp) {
      processLevelUpQueue();
    }
  }, [showOnboarding, showLevelUp, processLevelUpQueue]);

  const handleCloseOnboarding = async () => {
    setShowOnboarding(false);
    if (user?.id) {
      localStorage.setItem(`onboarding_seen_${user.id}`, 'true');
    }

    // First-time user: show their current level as welcome
    if (isFirstTimeRef.current) {
      isFirstTimeRef.current = false;
      try {
        const progreso = await gamificacionApi.getMiProgreso();
        if (progreso.nivel?.actual) {
          setLevelUpData({
            nivel: {
              numero: progreso.nivel.actual.numero,
              nombre: progreso.nivel.actual.nombre,
            },
            insignias: [],
          });
          setShowLevelUp(true);
        }
      } catch {
        // Ignore — gamification may not be set up
      }
    }
  };

  const handleCloseLevelUp = () => {
    setShowLevelUp(false);
    setLevelUpData(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-64',
          'pt-16 lg:pt-0'
        )}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* FAB global - Onboarding */}
      <Button
        onClick={() => setShowOnboarding(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 z-40"
        size="icon"
        title="¿Cómo funciona el sistema de puntos?"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>

      <OnboardingModal open={showOnboarding} onClose={handleCloseOnboarding} />
      <LevelUpModal
        open={showLevelUp}
        onClose={handleCloseLevelUp}
        nivel={levelUpData?.nivel}
        insignias={levelUpData?.insignias}
      />
    </div>
  );
}
