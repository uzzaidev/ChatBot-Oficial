/* global React */
var { useState, useMemo } = React;
var I = window.UzzIcons;

// ── Variation B: Tabs no topo ────────────────────────────────────────
const B_TABS = [
  { id: "general",   label: "Geral",      icon: I.user },
  { id: "whatsapp",  label: "WhatsApp",   icon: I.whatsapp },
  { id: "outras",    label: "Apps & IA",  icon: I.sparkles },
  { id: "system",    label: "Sistema",    icon: I.settings },
  { id: "advanced",  label: "Avançado",   icon: I.key, danger: true },
];

window.SettingsTabs = function SettingsTabs() {
  const [active, setActive] = useState("general");
  const [query, setQuery] = useState("");

  const renderContent = () => {
    switch (active) {
      case "general":  return <><ProfileSection/><PasswordSection/><PreferencesSection/></>;
      case "whatsapp": return <><WhatsAppSection/></>;
      case "outras":   return <><QuickLinks/></>;
      case "system":   return <><SupportSection/></>;
      case "advanced": return <AdvancedSection/>;
    }
  };

  // simple search: when querying, show all + highlight
  const filteredTabs = useMemo(() => B_TABS, []);

  return (
    <div className="scroll-mint" style={{ height: "100%", overflow: "auto", background: "var(--uzz-bg)" }}>
      {/* Header band */}
      <div style={{
        background: "linear-gradient(180deg, rgba(26,188,156,0.06) 0%, transparent 100%)",
        borderBottom: "1px solid var(--uzz-border)"
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 48px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--uzz-mint)", marginBottom: 6 }}>
                Conta · UzzApp
              </div>
              <h1 className="font-poppins" style={{
                fontSize: 32, fontWeight: 700, margin: 0,
                background: "var(--grad-brand)", WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent", backgroundClip: "text"
              }}>
                Configurações
              </h1>
              <p style={{ fontSize: 14, color: "var(--uzz-text-muted)", margin: "6px 0 0" }}>
                Gerencie seu perfil, integrações e preferências.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", width: 320 }}>
                <span style={{ position: "absolute", left: 12, top: 10, color: "var(--uzz-text-dim)" }}>{I.search}</span>
                <input className="uzz-input" placeholder="Buscar configuração..." value={query}
                       onChange={e => setQuery(e.target.value)}
                       style={{ paddingLeft: 36, paddingRight: 56 }}/>
                <kbd style={{ position: "absolute", right: 8, top: 8 }}>⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {filteredTabs.map(t => {
              const isActive = t.id === active;
              return (
                <button key={t.id} onClick={() => setActive(t.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8,
                          padding: "12px 18px", border: "none", background: "transparent",
                          color: isActive ? "var(--uzz-text)" : "var(--uzz-text-muted)",
                          fontSize: 14, fontWeight: isActive ? 600 : 500,
                          cursor: "pointer", fontFamily: "inherit",
                          borderBottom: isActive ? "2px solid var(--uzz-mint)" : "2px solid transparent",
                          marginBottom: -1,
                          transition: "all 0.15s ease",
                          position: "relative"
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--uzz-text)"; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--uzz-text-muted)"; }}>
                  <span style={{ display: "inline-flex", color: isActive ? "var(--uzz-mint)" : "currentColor" }}>{t.icon}</span>
                  {t.label}
                  {t.danger && isActive && <span className="dot" style={{ background: "var(--uzz-gold)" }}/>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 48px 80px" }}>
        {/* Quick stats row — only on Geral */}
        {active === "general" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            <StatCard icon={I.whatsapp} label="WhatsApp" value="Conectado" tone="mint"/>
            <StatCard icon={I.bot} label="Agente IA" value="UZZ Assistant" tone="purple"/>
            <StatCard icon={I.shield} label="Plano" value="Pro · Mensal" tone="blue"/>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

function StatCard({ icon, label, value, tone }) {
  const tones = {
    mint:   { bg: "rgba(26,188,156,0.10)", c: "#1ABC9C" },
    purple: { bg: "rgba(155,89,182,0.10)", c: "#9B59B6" },
    blue:   { bg: "rgba(52,152,219,0.10)", c: "#3498DB" },
  }[tone];
  return (
    <div className="uzz-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: tones.bg, color: tones.c,
                    display: "grid", placeItems: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: "var(--uzz-text-muted)", textTransform: "uppercase",
                      letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}
