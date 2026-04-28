/* global React */
var { useState, useMemo, useEffect, useRef } = React;
var I = window.UzzIcons;

// ── Variation A: Sidebar à esquerda ──────────────────────────────────
const A_SECTIONS = [
  { id: "profile",    label: "Perfil",          icon: I.user,     group: "Conta" },
  { id: "password",   label: "Senha",           icon: I.lock,     group: "Conta" },
  { id: "preferences", label: "Preferências",   icon: I.settings, group: "Conta" },
  { id: "whatsapp",   label: "WhatsApp",        icon: I.whatsapp, group: "Integrações" },
  { id: "links",      label: "Outras configurações", icon: I.sparkles, group: "Integrações" },
  { id: "support",    label: "Suporte / Bugs",  icon: I.alert,    group: "Sistema" },
  { id: "advanced",   label: "Avançado",        icon: I.key,      group: "Sistema" },
];

window.SettingsSidebar = function SettingsSidebar() {
  const [active, setActive] = useState("profile");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return A_SECTIONS;
    const q = query.toLowerCase();
    return A_SECTIONS.filter(s => s.label.toLowerCase().includes(q) || s.group.toLowerCase().includes(q));
  }, [query]);

  const groups = useMemo(() => {
    const g = {};
    filtered.forEach(s => { (g[s.group] = g[s.group] || []).push(s); });
    return Object.entries(g);
  }, [filtered]);

  const renderContent = () => {
    switch (active) {
      case "profile": return <ProfileSection/>;
      case "password": return <PasswordSection/>;
      case "preferences": return <PreferencesSection/>;
      case "whatsapp": return <WhatsAppSection/>;
      case "links": return <QuickLinks/>;
      case "support": return <SupportSection/>;
      case "advanced": return <AdvancedSection/>;
    }
  };

  const activeMeta = A_SECTIONS.find(s => s.id === active);

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--uzz-bg)" }}>
      {/* Sidebar */}
      <aside style={{ width: 280, borderRight: "1px solid var(--uzz-border)", display: "flex",
                      flexDirection: "column", background: "var(--uzz-bg-2)", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--grad-brand)",
                          display: "grid", placeItems: "center", color: "white" }}>
              {I.settings}
            </div>
            <div>
              <h1 className="font-poppins" style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Configurações</h1>
              <div style={{ fontSize: 12, color: "var(--uzz-text-muted)" }}>Sua conta · UzzApp</div>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: 10, color: "var(--uzz-text-dim)" }}>{I.search}</span>
            <input className="uzz-input" placeholder="Buscar..." value={query}
                   onChange={e => setQuery(e.target.value)}
                   style={{ paddingLeft: 36, paddingRight: 50 }}/>
            <kbd style={{ position: "absolute", right: 8, top: 8 }}>⌘K</kbd>
          </div>
        </div>

        <nav className="scroll-mint" style={{ flex: 1, overflow: "auto", padding: "0 12px 20px" }}>
          {groups.map(([group, items]) => (
            <div key={group} style={{ marginBottom: 18 }}>
              <div className="section-label" style={{ padding: "6px 10px" }}>{group}</div>
              {items.map(s => {
                const isActive = s.id === active;
                return (
                  <button key={s.id} onClick={() => setActive(s.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, width: "100%",
                            padding: "9px 10px", border: "none", borderRadius: 8,
                            background: isActive ? "rgba(26,188,156,0.12)" : "transparent",
                            color: isActive ? "var(--uzz-mint)" : "var(--uzz-text)",
                            fontSize: 14, fontWeight: isActive ? 600 : 400,
                            cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                            borderLeft: isActive ? "3px solid var(--uzz-mint)" : "3px solid transparent",
                            paddingLeft: 7,
                            transition: "all 0.12s ease"
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ display: "inline-flex", color: isActive ? "var(--uzz-mint)" : "var(--uzz-text-muted)" }}>{s.icon}</span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--uzz-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--grad-brand)",
                        display: "grid", placeItems: "center", color: "white", fontWeight: 600, fontSize: 13 }}>LH</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Luis Henrique</div>
            <div style={{ fontSize: 11, color: "var(--uzz-text-muted)" }}>Plano Pro</div>
          </div>
          <button className="btn btn-ghost btn-icon" title="Sair" style={{ padding: 6 }}>{I.log}</button>
        </div>
      </aside>

      {/* Content */}
      <main className="scroll-mint" style={{ flex: 1, overflow: "auto" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 48px 80px" }}>
          <header style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: "var(--uzz-text-muted)", marginBottom: 6 }}>{activeMeta?.group}</div>
            <h2 className="font-poppins" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{activeMeta?.label}</h2>
          </header>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};
