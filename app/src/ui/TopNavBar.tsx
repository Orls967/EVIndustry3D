import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { UI_STRINGS } from "../content/strings";

export interface TopNavBarProps {
  currentHash: string;
}

export function TopNavBar({ currentHash }: TopNavBarProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentHash]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navItems = [
    { href: "#/", label: "Overview", active: currentHash === "#/" || currentHash === "" },
    { href: "#/simulator", label: "Architectures", active: currentHash.startsWith("#/simulator") },
    { href: "#/compare", label: "Compare", active: currentHash === "#/compare" },
    { href: "#/methodology", label: "Methodology", active: currentHash === "#/methodology" },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="#/" className="topbar-brand">
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              background: "var(--color-accent-primary)",
              borderRadius: "2px",
            }}
          />
          <span>{UI_STRINGS.brandName}</span>
        </a>

        <nav className="topbar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="topbar-actions">
          <a href="#/simulator" className="btn btn-primary btn-sm topbar-cta-desktop">
            {UI_STRINGS.hero.primaryCta}
          </a>
          <button
            type="button"
            className="btn btn-secondary btn-sm topbar-mobile-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu-drawer" role="dialog" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <a
            href="#/simulator"
            className="btn btn-primary"
            style={{ marginTop: "var(--space-2)", textAlign: "center" }}
            onClick={() => setMenuOpen(false)}
          >
            {UI_STRINGS.hero.primaryCta}
          </a>
        </div>
      )}
    </header>
  );
}

