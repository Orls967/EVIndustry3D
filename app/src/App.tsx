import React, { useCallback, useEffect, useRef, useState } from "react";
import { UI_STRINGS } from "./content/strings";
import { useWorkspaceStore } from "./state/workspaceStore";
import { LandingPage } from "./routes/LandingPage";
import { SelectArchitecturePage } from "./routes/SelectArchitecturePage";
import { WorkspacePage } from "./routes/WorkspacePage";
import { ComparePage, MethodologyPage } from "./routes/SecondaryRoutes";
import { ConfirmModal } from "./ui/Primitives";
import { TopNavBar } from "./ui/TopNavBar";

function normalizeHash(raw: string): string {
  if (!raw || raw === "#") return "#/";
  return raw;
}

function getTitleForHash(hash: string): string {
  if (hash === "#/simulator") return "Select Architecture — EV Pack Twin";
  if (hash === "#/simulator/lfp") return "LFP Blade Workspace — EV Pack Twin";
  if (hash === "#/simulator/nmc") return "NMC 4680 Workspace — EV Pack Twin";
  if (hash === "#/compare") return "Compare Architectures — EV Pack Twin";
  if (hash === "#/methodology") return "Methodology & Sources — EV Pack Twin";
  return "EV Battery Pack Digital Twin";
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ padding: "var(--space-12) var(--space-4)" }}>
          <div className="inline-banner inline-banner--danger">
            Application error: {this.state.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App(): React.ReactElement {
  const [currentHash, setCurrentHash] = useState<string>(() => normalizeHash(window.location.hash));
  const mainRef = useRef<HTMLElement>(null);

  const pendingSwitchArch = useWorkspaceStore((s) => s.pendingSwitchArch);
  const confirmArchitectureSwitch = useWorkspaceStore((s) => s.confirmArchitectureSwitch);
  const cancelArchitectureSwitch = useWorkspaceStore((s) => s.cancelArchitectureSwitch);

  const navigate = useCallback((nextHash: string) => {
    window.location.hash = nextHash;
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = normalizeHash(window.location.hash);
      setCurrentHash(next);
      document.title = getTitleForHash(next);
      mainRef.current?.focus();
    };
    document.title = getTitleForHash(currentHash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [currentHash]);

  const handleConfirmSwitch = () => {
    const target = pendingSwitchArch;
    confirmArchitectureSwitch();
    if (target) {
      navigate(target === "LFP_BLADE" ? "#/simulator/lfp" : "#/simulator/nmc");
    }
  };

  let routeContent: React.ReactElement;
  if (currentHash === "#/simulator") {
    routeContent = <SelectArchitecturePage onNavigate={navigate} />;
  } else if (currentHash === "#/simulator/lfp") {
    routeContent = <WorkspacePage routeArch="LFP_BLADE" />;
  } else if (currentHash === "#/simulator/nmc") {
    routeContent = <WorkspacePage routeArch="NMC_4680" />;
  } else if (currentHash === "#/compare") {
    routeContent = <ComparePage />;
  } else if (currentHash === "#/methodology") {
    routeContent = <MethodologyPage />;
  } else {
    routeContent = <LandingPage />;
  }

  return (
    <AppErrorBoundary>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <TopNavBar currentHash={currentHash} />
      <main id="main-content" ref={mainRef} tabIndex={-1} style={{ outline: "none" }}>
        {routeContent}
      </main>
      <ConfirmModal
        open={pendingSwitchArch !== null}
        title="Switch battery architecture?"
        body={UI_STRINGS.switchConfirmPrompt}
        confirmLabel="Switch and clear results"
        onConfirm={handleConfirmSwitch}
        onCancel={cancelArchitectureSwitch}
      />
    </AppErrorBoundary>
  );
}

export default App;
