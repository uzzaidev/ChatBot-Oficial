/* global React */
var I = window.UzzIcons;

// Sidebar fiel à UzzApp — Logo + ThemeToggle, seções, items com active state mint
window.UzzSidebar = function UzzSidebar({ active = "settings", theme, onToggleTheme }) {
  const Icon = ({ d }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
  const ic = {
    dash:    <Icon d={<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>}/>,
    msg:     <Icon d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}/>,
    users:   <Icon d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>}/>,
    kanban:  <Icon d={<><rect x="5" y="3" width="4" height="14" rx="1"/><rect x="11" y="3" width="4" height="9" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></>}/>,
    file:    <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>}/>,
    book:    <Icon d={<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>}/>,
    bot:     <Icon d={<><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/></>}/>,
    flow:    <Icon d={<><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8M12 14v2"/></>}/>,
    cal:     <Icon d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>}/>,
    chart:   <Icon d={<><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></>}/>,
    sett:    <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1A7 7 0 0 0 14.4 5l-.4-2.6h-4l-.4 2.6A7 7 0 0 0 7 6.8l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 4.5 13l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2.2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></>}/>,
    sun:     <Icon d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.4 1.4M17.6 17.6L19 19M2 12h2M20 12h2M5 19l1.4-1.4M17.6 6.4L19 5"/></>}/>,
    moon:    <Icon d={<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>}/>,
  };

  const items = [
    { group: "Principal" },
    { id: "dashboard", label: "Dashboard", icon: ic.dash },
    { id: "conversas", label: "Conversas", icon: ic.msg, badge: "12" },
    { group: "Gestão" },
    { id: "contatos", label: "Contatos", icon: ic.users },
    { id: "crm", label: "CRM", icon: ic.kanban },
    { id: "templates", label: "Templates", icon: ic.file },
    { id: "docs", label: "Documentos", icon: ic.book },
    { id: "agentes", label: "Agentes IA", icon: ic.bot },
    { id: "flows", label: "Flows", icon: ic.flow },
    { id: "calendar", label: "Calendário", icon: ic.cal },
    { group: "Análise" },
    { id: "analytics", label: "Analytics", icon: ic.chart },
    { group: "Conta" },
    { id: "settings", label: "Configurações", icon: ic.sett },
  ];

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: "var(--app-sidebar)",
      borderRight: "1px solid var(--app-border)",
      display: "flex", flexDirection: "column", height: "100%"
    }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--app-border)",
                    display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1, letterSpacing: "-0.01em" }}>
          <span style={{ fontFamily: "Poppins", color: "var(--uzz-mint)" }}>Uzz</span>
          <span style={{ fontFamily: "Poppins", color: "var(--uzz-blue)" }}>Ai</span>
        </h1>
        <button onClick={onToggleTheme} title="Toggle theme"
                style={{ background: "transparent", border: "1px solid var(--app-border)",
                         color: "var(--app-text-muted)", borderRadius: 8, padding: 6,
                         cursor: "pointer", display: "grid", placeItems: "center" }}>
          {theme === "dark" ? ic.sun : ic.moon}
        </button>
      </div>
      <nav className="scroll-mint" style={{ flex: 1, overflow: "auto", padding: "12px 10px" }}>
        {items.map((it, i) => {
          if (it.group) return (
            <div key={"g"+i} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--app-text-dim)",
              padding: "14px 10px 6px"
            }}>{it.group}</div>
          );
          const isActive = it.id === active;
          return (
            <div key={it.id} style={{
              display: "flex", alignItems: "center", gap: 11,
              padding: "8px 10px", borderRadius: 8, marginBottom: 1,
              background: isActive ? "rgba(26,188,156,0.13)" : "transparent",
              color: isActive ? "var(--uzz-mint)" : "var(--app-text)",
              fontSize: 13.5, fontWeight: isActive ? 600 : 500,
              borderLeft: isActive ? "3px solid var(--uzz-mint)" : "3px solid transparent",
              paddingLeft: 7, cursor: "pointer"
            }}>
              <span style={{ display: "inline-flex", color: isActive ? "var(--uzz-mint)" : "var(--app-text-muted)" }}>{it.icon}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge && <span style={{
                background: "var(--uzz-mint)", color: "white", fontSize: 10,
                fontWeight: 700, padding: "1px 7px", borderRadius: 999
              }}>{it.badge}</span>}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--app-border)",
                    display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%",
                      background: "linear-gradient(135deg,#1ABC9C,#3498DB)",
                      display: "grid", placeItems: "center", color: "white",
                      fontWeight: 600, fontSize: 12 }}>LH</div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: "var(--app-text)", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Luis Henrique</div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 11 }}>Plano Pro</div>
        </div>
      </div>
    </aside>
  );
};
