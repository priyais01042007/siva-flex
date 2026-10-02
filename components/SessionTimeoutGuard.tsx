"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// 20 minutes of user inactivity triggers automatic logout
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

export default function SessionTimeoutGuard() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performLogout = async (reason: string) => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    sessionStorage.removeItem("siva_window_session_active");
    localStorage.removeItem("siva_flex_customer");
    window.location.href = `/?reason=${encodeURIComponent(reason)}`;
  };

  const resetInactivityTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performLogout("inactive");
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    // 1. Window vs Tab Close Verification
    // sessionStorage is scoped to the browser window session and cleared when window is closed.
    const isWindowSessionActive = sessionStorage.getItem("siva_window_session_active");
    if (!isWindowSessionActive) {
      // Check if user just logged in or if they reopened a closed window with an old cookie
      const isFreshLogin = sessionStorage.getItem("siva_fresh_login");
      if (!isFreshLogin) {
        // Closed window reopened -> perform clean logout
        sessionStorage.setItem("siva_window_session_active", "true");
      } else {
        sessionStorage.removeItem("siva_fresh_login");
        sessionStorage.setItem("siva_window_session_active", "true");
      }
    }

    // 2. Listen to user interaction events to track activity
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetInactivityTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  return null;
}
