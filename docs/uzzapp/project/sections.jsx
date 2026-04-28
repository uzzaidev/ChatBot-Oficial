/* global React */
var I = window.UzzIcons;
var { useState } = React;

window.Field = function Field({ label, hint, children, action }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--app-text)" }}>{label}</label>
        {action}
      </div>
      {children}
      {hint && <p style={{ fontSize: 12, color: "var(--app-text-dim)", marginTop: 6, margin: "6px 0 0" }}>{hint}</p>}
    </div>
  );
};

window.SectionCard = function SectionCard({ icon, title, desc, children, action }) {
  return (
    <section className="uzz-card" style={{ overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "20px 24px", borderBottom: "1px solid var(--app-border)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
                      background: "rgba(26,188,156,0.10)", color: "var(--uzz-mint)", flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="font-poppins" style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--app-text)" }}>{title}</h3>
          {desc && <p style={{ fontSize: 13, color: "var(--app-text-muted)", margin: "3px 0 0" }}>{desc}</p>}
        </div>
        {action}
      </header>
      <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
    </section>
  );
};

window.ToggleRow = function ToggleRow({ label, desc, on, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--app-text)" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--app-text-muted)", marginTop: 2 }}>{desc}</div>}
      </div>
      <div className={"switch" + (on ? " on" : "")} onClick={() => onChange(!on)}/>
    </div>
  );
};

// Perfil + Senha juntos
window.ProfileSection = function ProfileSection() {
  const [editing, setEditing] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  return (
    <SectionCard
      icon={I.user} title="Perfil do usuário" desc="Suas informações pessoais e segurança da conta"
      action={!editing
        ? <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Editar</button>
        : <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}>Salvar</button>
          </div>}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 4 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--grad-brand)",
                      display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 22 }}>LH</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--app-text)" }}>Luis Henrique Silva</div>
          <div style={{ fontSize: 13, color: "var(--app-text-muted)" }}>luis@umana.com.br · Plano Pro</div>
        </div>
        {editing && <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Trocar foto</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Field label="Nome completo">
          <input className="uzz-input" defaultValue="Luis Henrique Silva" disabled={!editing}/>
        </Field>
        <Field label="Email" hint="Não pode ser alterado">
          <input className="uzz-input" defaultValue="luis@umana.com.br" disabled/>
        </Field>
        <Field label="Telefone WhatsApp" hint="Configurado nas credenciais Meta">
          <input className="uzz-input" defaultValue="+55 11 98765-4321" disabled/>
        </Field>
        <Field label="Fuso horário">
          <select className="uzz-input" disabled={!editing} defaultValue="brt">
            <option value="brt">São Paulo (GMT-3)</option><option value="utc">UTC</option>
          </select>
        </Field>
      </div>
      <div style={{ height: 1, background: "var(--app-border)", margin: "4px 0" }}/>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--app-text)" }}>Senha</div>
            <div style={{ fontSize: 12, color: "var(--app-text-muted)", marginTop: 2 }}>Última alteração há 3 meses</div>
          </div>
          {!showPwd && <button className="btn btn-ghost btn-sm" onClick={() => setShowPwd(true)}>Alterar senha</button>}
        </div>
        {showPwd && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, alignItems: "end" }}>
            <Field label="Senha atual"><input className="uzz-input" type="password" placeholder="••••••••"/></Field>
            <Field label="Nova senha" hint="Mínimo 8 caracteres"><input className="uzz-input" type="password" placeholder="••••••••"/></Field>
            <Field label="Confirmar"><input className="uzz-input" type="password" placeholder="••••••••"/></Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPwd(false)}>Cancelar</button>
              <button className="btn btn-primary btn-sm">Atualizar senha</button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

window.WhatsAppSection = function WhatsAppSection() {
  return (
    <SectionCard icon={I.whatsapp} title="WhatsApp Business" desc="Conexão com a Meta Business Platform"
      action={<span className="chip chip-mint"><span className="dot" style={{ background: "var(--uzz-mint)" }}/>Conectado</span>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div><div className="section-label">Número</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, color: "var(--app-text)" }}>+55 11 98765-4321</div></div>
        <div><div className="section-label">Display name</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, color: "var(--app-text)" }}>Umana Cosméticos</div></div>
        <div><div className="section-label">Quality rating</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, color: "var(--uzz-mint)" }}>● High</div></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost btn-sm">{I.link} Reautenticar Meta</button>
        <button className="btn btn-danger btn-sm">{I.unplug} Desconectar</button>
      </div>
    </SectionCard>
  );
};

window.QuickLinks = function QuickLinks() {
  const links = [
    { icon: I.bot,  title: "Agentes IA",        desc: "Prompts, modelos, comportamento e timing", tag: "Multi-agente", color: "#9B59B6" },
    { icon: I.mic,  title: "Text-to-Speech",    desc: "Vozes, velocidade e qualidade de áudio",   tag: "6 vozes",       color: "#3498DB" },
    { icon: I.bell, title: "Notificações push", desc: "Categorias, som, vibração e DND",          tag: "5 categorias",  color: "#F39C12" },
  ];
  return (
    <SectionCard icon={I.sparkles} title="Outras configurações" desc="Acesso rápido a páginas dedicadas">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {links.map((l, i) => (
          <a key={i} href="#" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16,
              background: "var(--app-card-2)", border: "1px solid var(--app-border)",
              borderRadius: 12, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center",
                            background: l.color + "22", color: l.color }}>{l.icon}</div>
              <span style={{ color: "var(--app-text-dim)" }}>{I.arrowRight}</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--app-text)" }}>{l.title}</div>
              <div style={{ fontSize: 12, color: "var(--app-text-muted)", marginTop: 3 }}>{l.desc}</div>
            </div>
            <span className="chip" style={{ alignSelf: "flex-start" }}>{l.tag}</span>
          </a>
        ))}
      </div>
    </SectionCard>
  );
};

window.PreferencesSection = function PreferencesSection({ theme, setTheme }) {
  const [compact, setCompact] = useState(false);
  return (
    <SectionCard icon={I.settings} title="Preferências" desc="Aparência e idioma">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Tema">
          <div style={{ display: "flex", gap: 8 }}>
            {["dark","light"].map(t => (
              <button key={t} onClick={() => setTheme(t)}
                      className={theme === t ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                      style={{ flex: 1, justifyContent: "center", textTransform: "capitalize" }}>
                {t === "dark" ? "Escuro" : "Claro"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Idioma">
          <select className="uzz-input" defaultValue="pt-BR">
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es">Español</option>
          </select>
        </Field>
      </div>
      <ToggleRow label="Densidade compacta" desc="Reduz espaçamentos para caber mais informação" on={compact} onChange={setCompact}/>
    </SectionCard>
  );
};

window.SupportSection = function SupportSection() {
  const [on, setOn] = useState(false);
  return (
    <SectionCard icon={I.alert} title="Modo Suporte / Bugs" desc="Registra sinais de suporte para triagem">
      <ToggleRow label={on ? "Ativo" : "Inativo"} desc="Casos detectados aparecem na aba de Suporte/Bugs" on={on} onChange={setOn}/>
    </SectionCard>
  );
};

window.AdvancedSection = function AdvancedSection() {
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState({});
  const toggle = k => setShow(s => ({ ...s, [k]: !s[k] }));
  const Secret = ({ k, label, placeholder, hint }) => (
    <Field label={label} hint={hint}>
      <div style={{ position: "relative" }}>
        <input className="uzz-input" type={show[k] ? "text" : "password"}
               disabled={!editing} placeholder={placeholder}
               style={{ paddingRight: 40, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}/>
        <button onClick={() => toggle(k)}
                style={{ position: "absolute", right: 8, top: 8, background: "transparent",
                         border: "none", color: "var(--app-text-muted)", cursor: "pointer", padding: 4 }}>
          {show[k] ? I.eyeOff : I.eye}
        </button>
      </div>
    </Field>
  );
  return (
    <>
      <div style={{ display: "flex", gap: 12, padding: "14px 18px", marginBottom: 16,
                    background: "rgba(241,196,15,0.08)", border: "1px solid rgba(241,196,15,0.3)", borderRadius: 12 }}>
        <span style={{ color: "var(--uzz-gold)" }}>{I.alert}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--uzz-gold)" }}>Configurações avançadas</div>
          <div style={{ fontSize: 12, color: "var(--app-text-muted)", marginTop: 2 }}>
            Cuidado ao editar. Credenciais incorretas podem desconectar seu bot.
          </div>
        </div>
      </div>
      <SectionCard icon={I.key} title="Credenciais Meta / WhatsApp" desc="Tokens de acesso à Cloud API"
        action={<button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>
          {editing ? "Bloquear" : <>{I.lock} Editar</>}</button>}>
        <Secret k="meta_token" label="Meta Access Token" placeholder="EAAxxxxxx..." hint="Token gerado no Meta for Developers"/>
        <Secret k="meta_secret" label="Meta App Secret" placeholder="••••••••••••••"/>
        <Secret k="meta_verify" label="Meta Verify Token" placeholder="seu-verify-token"/>
        <Field label="Phone Number ID"><input className="uzz-input" disabled={!editing} placeholder="123456789012345" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}/></Field>
        <Field label="WhatsApp Business Account ID"><input className="uzz-input" disabled={!editing} placeholder="987654321098765" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}/></Field>
      </SectionCard>
      <div style={{ height: 16 }}/>
      <SectionCard icon={I.bot} title="Credenciais OpenAI" desc="Para geração de respostas e analytics">
        <Secret k="openai" label="OpenAI API Key" placeholder="sk-..."/>
        <Secret k="openai_admin" label="OpenAI Admin Key" hint="Opcional — habilita analytics" placeholder="sk-admin-..."/>
      </SectionCard>
      <div style={{ height: 16 }}/>
      <SectionCard icon={I.shield} title="Sessão & Segurança">
        <ToggleRow label="Logout em todos os dispositivos" desc="Encerra todas as sessões ativas" on={false} onChange={() => {}}/>
        <div>
          <button className="btn btn-danger">{I.trash} Apagar minha conta</button>
          <p style={{ fontSize: 12, color: "var(--app-text-dim)", marginTop: 8 }}>Esta ação é irreversível.</p>
        </div>
      </SectionCard>
    </>
  );
};
