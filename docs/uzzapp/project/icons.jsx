/* global React */
var { useState, useMemo, useEffect, useRef } = React;

// ── Icons (lucide-style, hand-rolled to avoid deps) ──────────────────
const Ico = ({ d, size = 16, stroke = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
       stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
       strokeLinejoin="round">{d}</svg>
);
const I = {
  user: <Ico d={<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>}/>,
  lock: <Ico d={<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>}/>,
  bell: <Ico d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>}/>,
  mic: <Ico d={<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>}/>,
  bot: <Ico d={<><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/><path d="M2 14h2M20 14h2"/></>}/>,
  search: <Ico d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}/>,
  whatsapp: <Ico d={<><path d="M3 21l1.5-5.4A8.5 8.5 0 1 1 8.4 19.5L3 21z"/><path d="M8 10c.5 1.5 1.5 2.5 3 3l1.5-1.5c.5-.3 1-.3 1.4 0l1.6 1.6c.4.4.4 1 0 1.4-1.5 1.5-3.5 1-5.4-.4S6.5 11 8 9.5c.4-.4 1-.4 1.4 0l1.6 1.6c.4.4.4 1 0 1.4L9.5 14"/></>}/>,
  shield: <Ico d={<><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/></>}/>,
  settings: <Ico d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}/>,
  key: <Ico d={<><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 3 3M16 7l3 3"/></>}/>,
  arrowRight: <Ico d={<><path d="M5 12h14M13 5l7 7-7 7"/></>}/>,
  chevronRight: <Ico d={<><path d="m9 6 6 6-6 6"/></>}/>,
  check: <Ico d={<><path d="M5 13l4 4L19 7"/></>}/>,
  copy: <Ico d={<><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>}/>,
  eye: <Ico d={<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>}/>,
  eyeOff: <Ico d={<><path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.6 4.5M6.7 6.7C3.7 8.6 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.9M3 3l18 18"/></>}/>,
  alert: <Ico d={<><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></>}/>,
  unplug: <Ico d={<><path d="m19 5-7 7M9 8 5 12l4 4 4-4M2 22l3-3M14 17l4-4 5 5"/></>}/>,
  sparkles: <Ico d={<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>}/>,
  link: <Ico d={<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></>}/>,
  trash: <Ico d={<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>}/>,
  log: <Ico d={<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></>}/>,
};

window.UzzIcons = I;
