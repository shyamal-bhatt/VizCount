"""
utils/icons.py
──────────────
Heroicon SVG constants, CSS injection, and sidebar state management.
"""

import streamlit as st
import streamlit.components.v1 as components

# ── SVG Icons (Heroicons outline, 22×22) ──────────────────────────────────────

ICON_BOX = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" '
    'fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 '
    '1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>'
    '<path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
)

ICON_STORE = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" '
    'fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>'
    '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>'
    '<path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>'
    '<path d="M2 7h20"/></svg>'
)

ICON_ALERT = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" '
    'fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>'
    '<path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
)

ICON_BRAND = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" '
    'fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<line x1="18" y1="20" x2="18" y2="10"/>'
    '<line x1="12" y1="20" x2="12" y2="4"/>'
    '<line x1="6" y1="20" x2="6" y2="14"/></svg>'
)

ICON_HEADER = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
    'fill="none" stroke="#475569" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 '
    '1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>'
    '<path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
)


# ── CSS injection ─────────────────────────────────────────────────────────────

def inject_css() -> None:
    st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

  /* Sidebar background & text */
  [data-testid="stSidebar"] { background-color: #0f1117; border-right: 1px solid #1e2130; }
  [data-testid="stSidebar"] * { color: #e2e8f0 !important; }

  /* Hide both collapse controls (JS handles the actual transform below) */
  [data-testid="stSidebarCollapseButton"] { display: none !important; }
  [data-testid="collapsedControl"]        { display: none !important; }

  /* Hide deploy toolbar and decoration strip; keep header transparent */
  [data-testid="stToolbar"]        { display: none !important; }
  [data-testid="stDecoration"]     { display: none !important; }
  [data-testid="stToolbarActions"] { display: none !important; }
  header[data-testid="stHeader"]   { background: transparent; border-bottom: none; }

  /* KPI card */
  .kpi-card {
    background: #ffffff; border: 1px solid #e8ecf1; border-radius: 14px;
    padding: 20px 22px; display: flex; align-items: center; gap: 18px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06); min-height: 100px;
  }
  .kpi-icon { width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .kpi-icon.blue  { background: #dbeafe; }
  .kpi-icon.green { background: #dcfce7; }
  .kpi-icon.red   { background: #fee2e2; }
  .kpi-label { font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px; }
  .kpi-value { font-size: 30px; font-weight: 700; color: #0f172a; line-height: 1; }
  .kpi-sub   { font-size: 12px; color: #94a3b8; margin-top: 4px; }

  /* Section titles */
  .section-title { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .section-sub   { font-size: 13px; color: #64748b; margin-bottom: 14px; }

  /* Expiry alert boxes */
  .alert-expired { background:#fee2e2; border-left:4px solid #ef4444; border-radius:8px; padding:12px 16px; }
  .alert-today   { background:#fef9c3; border-left:4px solid #eab308; border-radius:8px; padding:12px 16px; }
  .alert-soon    { background:#dbeafe; border-left:4px solid #3b82f6; border-radius:8px; padding:12px 16px; }
  .alert-text    { font-size:13px; font-weight:600; color:#0f172a; }
  .alert-sub     { font-size:11px; color:#64748b; margin-top:2px; }

  /* Sidebar radio nav items */
  div[data-testid="stRadio"] label {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 10px;
    cursor: pointer; transition: background .15s;
    font-size: 14px; font-weight: 500;
  }
  div[data-testid="stRadio"] label:hover { background: #1e2130; }

  /* Live dot */
  .live-dot {
    display: inline-block; width: 8px; height: 8px;
    background: #22c55e; border-radius: 50%;
    margin-right: 6px; animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

  .block-container { padding-top: 1.2rem !important; }
</style>
""", unsafe_allow_html=True)


def force_sidebar_open() -> None:
    """
    Inject JavaScript (zero-height iframe) to permanently force the sidebar open.

    Why JS and not CSS:
      Streamlit sets `transform: translateX(-300px)` as an *inline style* on
      the <section> element. CSS `!important` cannot override inline styles.
      Only JavaScript can directly mutate element.style.transform.

    What this does:
      1. Clears any localStorage keys that store the collapsed state, so
         a page reload won't restore it.
      2. Sets sidebar.style.transform = 'translateX(0px)' immediately.
      3. Installs a MutationObserver on the parent document to re-apply the
         fix whenever Streamlit tries to re-collapse the sidebar.
    """
    components.html(
        """
        <script>
        (function keepSidebarOpen() {
            var parent = window.parent;

            // 1. Clear localStorage sidebar state so it doesn't restore on reload
            try {
                Object.keys(parent.localStorage).forEach(function(k) {
                    if (k.toLowerCase().indexOf("sidebar") !== -1) {
                        parent.localStorage.removeItem(k);
                    }
                });
            } catch (e) {}

            // 2. Force the sidebar translateX to 0
            function forceOpen() {
                try {
                    var sb = parent.document.querySelector(
                        'section[data-testid="stSidebar"]'
                    );
                    if (sb) {
                        sb.style.transform  = "translateX(0px)";
                        sb.style.visibility = "visible";
                    }
                } catch (e) {}
            }

            forceOpen();

            // 3. Re-apply if Streamlit ever mutates the style attribute
            try {
                var observer = new parent.MutationObserver(forceOpen);
                observer.observe(parent.document.body, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ["style"]
                });
            } catch (e) {}
        })();
        </script>
        """,
        height=0,
    )
