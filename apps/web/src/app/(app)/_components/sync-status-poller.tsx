"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3000;

// No renderiza nada visible: solo refresca la página cada pocos segundos
// mientras el sync sigue en curso, para detectar cuándo termina sin que el usuario tenga que recargar a mano.
export function SyncStatusPoller({ syncInProgress }: { syncInProgress: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!syncInProgress) return;
    const intervalId = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [syncInProgress, router]);

  return null;
}
