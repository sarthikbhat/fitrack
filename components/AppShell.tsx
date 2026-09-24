"use client";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { ThemeSync } from "@/components/ThemeSync";
import { HydrationGate } from "@/components/HydrationGate";
import { ExerciseModalProvider } from "@/components/exercise/ExerciseModalProvider";
import { PickerProvider } from "@/components/PickerProvider";
import { SwitchProvider } from "@/components/SwitchProvider";
import { SettingsProvider, useSettings } from "@/components/SettingsProvider";
import { RestBar } from "@/components/RestBar";
import { Onboarding } from "@/components/Onboarding";
import { SyncManager } from "@/components/SyncManager";
import { Icon } from "@/data/icons";
import { useStore } from "@/lib/store";

function HeaderBar() {
  const { openSettings } = useSettings();
  return (
    <header className="top">
      <span className="brand">Fitrack</span>
      <button className="gearbtn" aria-label="Settings" onClick={openSettings}>
        <Icon name="gear" />
      </button>
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
  const profile = useStore((s) => s.profile);
  if (profile === null) return <Onboarding />;
  return <Shell>{children}</Shell>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <HydrationGate>
      <ThemeSync />
      <Gate>{children}</Gate>
    </HydrationGate>
  );
}
