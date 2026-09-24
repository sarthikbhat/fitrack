"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { ThemeSync } from "@/components/ThemeSync";
import { HydrationGate } from "@/components/HydrationGate";
import { AuthOverlay } from "@/components/AuthOverlay";
import { ExerciseModalProvider } from "@/components/exercise/ExerciseModalProvider";
import { PickerProvider } from "@/components/PickerProvider";
import { SwitchProvider } from "@/components/SwitchProvider";
import { SettingsProvider, useSettings } from "@/components/SettingsProvider";
import { AccountControl } from "@/components/AccountControl";
import { RestBar } from "@/components/RestBar";
import { Onboarding } from "@/components/Onboarding";
import { SyncManager } from "@/components/SyncManager";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { Icon } from "@/data/icons";
import { useStore } from "@/lib/store";

function HeaderBar() {
  const { openSettings } = useSettings();
  return (
    <header className="top">
      <span className="brand">Fitrack</span>
      <div className="top-actions">
        <button className="gearbtn" aria-label="Settings" onClick={openSettings}>
          <Icon name="gear" />
        </button>
        <AccountControl variant="header" />
      </div>
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <ExerciseModalProvider>
      <PickerProvider>
        <SwitchProvider>
          <SettingsProvider>
            <SyncManager />
            <div className="app">
              <Sidebar />
              <div className="wrap">
                <HeaderBar />
                <div id="view">{children}</div>
                <RestBar />
                <BottomNav />
              </div>
            </div>
          </SettingsProvider>
        </SwitchProvider>
      </PickerProvider>
    </ExerciseModalProvider>
  );
}

function Gate({ children }: { children: ReactNode }) {
  // Fresh install (no profile yet) → run the onboarding wizard instead of the app.
  // Exception: public pages (a profile /u/<username>, people search) must be viewable
  // by logged-out / data-less visitors, so they render inside the Shell without the
  // onboarding redirect.
  const profile = useStore((s) => s.profile);
  const pathname = usePathname();
  const isPublic = pathname?.startsWith("/u/") || pathname === "/people";
  if (profile === null && !isPublic) return <Onboarding />;
  return <Shell>{children}</Shell>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Public shared-plan pages (/p/<code>) are standalone: they render their own
  // header + content server-side and must show for logged-out, data-less visitors.
  // Bypass HydrationGate (so the SSR content paints immediately) and the onboarding
  // Gate (so a brand-new visitor sees the shared plan, not the onboarding wizard).
  // ThemeSync + ConfirmProvider stay so the page respects theme and the clone flow
  // can use the confirm dialog; both no-op gracefully before the store hydrates.
  // Legal pages (/legal/*) are standalone too: they ship their own header/footer
  // and must render for logged-out, data-less visitors (e.g. from the OAuth consent
  // screen). Bypass the HydrationGate and onboarding Gate like /p/*.
  if (pathname?.startsWith("/p/") || pathname?.startsWith("/legal")) {
    return (
      <>
        <ThemeSync />
        <ConfirmProvider>{children}</ConfirmProvider>
      </>
    );
  }

  return (
    <HydrationGate>
      <ThemeSync />
      <ConfirmProvider>
        <AuthOverlay />
        <Gate>{children}</Gate>
      </ConfirmProvider>
    </HydrationGate>
  );
}
