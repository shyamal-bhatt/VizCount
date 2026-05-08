"""
components/sidebar.py
─────────────────────
Left navigation: category selector + global quick stats + debug log panel.
"""

from datetime import datetime

import streamlit as st

from config.settings import PRODUCTS
from data.loader import load_all_data, load_category_data
from utils.icons import ICON_BRAND
from utils.logger import LOG_RECORDS, get_logger

log = get_logger("sidebar")


def render_sidebar() -> str:
    """Render the sidebar and return the selected category name."""
    with st.sidebar:
        # Brand header
        st.markdown(
            f"""
            <div style="padding:0 0 24px 0;display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;background:#1e2130;border-radius:8px;
                          display:flex;align-items:center;justify-content:center;flex-shrink:0">
                {ICON_BRAND}
              </div>
              <div>
                <div style="font-size:15px;font-weight:700;color:#f1f5f9">Meat Department</div>
                <div style="font-size:11px;color:#64748b">Inventory Dashboard</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown(
            '<div style="font-size:10px;letter-spacing:1px;color:#475569;'
            'font-weight:600;margin-bottom:8px">CATEGORIES</div>',
            unsafe_allow_html=True,
        )

        # Per-category expiry badge counts
        expiry_counts: dict[str, int] = {}
        for cat in PRODUCTS:
            df_tmp = load_category_data(cat)
            expiry_counts[cat] = int(df_tmp[df_tmp["days_to_expiry"] <= 1].shape[0])

        selected_category = st.radio(
            label="Category",
            options=list(PRODUCTS.keys()),
            format_func=lambda c: f"{c}  —  {expiry_counts[c]} expiring",
            label_visibility="collapsed",
        )

        st.divider()

        # Quick stats (all categories)
        st.markdown(
            '<div style="font-size:10px;letter-spacing:1px;color:#475569;'
            'font-weight:600;margin-bottom:8px">QUICK STATS</div>',
            unsafe_allow_html=True,
        )

        all_df = load_all_data()
        expiring_today  = int(all_df[all_df["days_to_expiry"] == 0].shape[0])
        already_expired = int(all_df[all_df["days_to_expiry"] < 0].shape[0])

        st.markdown(
            f"""
            <div style="margin-bottom:14px">
              <div style="font-size:10px;letter-spacing:.5px;color:#eab308;
                          font-weight:700;text-transform:uppercase">Expiring Today</div>
              <div style="font-size:22px;font-weight:700;color:#fef08a">{expiring_today} items</div>
            </div>
            <div>
              <div style="font-size:10px;letter-spacing:.5px;color:#f87171;
                          font-weight:700;text-transform:uppercase">Already Expired</div>
              <div style="font-size:22px;font-weight:700;color:#fca5a5">{already_expired} items</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.divider()
        st.markdown(
            f'<div style="font-size:10px;color:#475569">Last updated: '
            f'{datetime.now().strftime("%I:%M:%S %p")}</div>',
            unsafe_allow_html=True,
        )

        # ── Debug logs panel ───────────────────────────────────────────────────
        _render_debug_logs()

    return selected_category


# Level → colour mapping
_LEVEL_STYLE = {
    "ERROR":   "background:#ef4444;color:#fff",
    "WARNING": "background:#f59e0b;color:#000",
    "INFO":    "background:#22c55e;color:#fff",
    "DEBUG":   "background:#475569;color:#fff",
}


def _render_debug_logs() -> None:
    """Render the collapsible Debug Logs panel at the bottom of the sidebar."""
    recent = LOG_RECORDS[-50:]          # last 50 entries
    errors = sum(1 for r in recent if r["level"] == "ERROR")
    warns  = sum(1 for r in recent if r["level"] == "WARNING")

    label = "🪲 Debug Logs"
    if errors:
        label += f"  🔴 {errors} error{'s' if errors > 1 else ''}"
    elif warns:
        label += f"  🟡 {warns} warning{'s' if warns > 1 else ''}"

    with st.expander(label, expanded=bool(errors)):
        if not recent:
            st.markdown(
                '<div style="font-size:11px;color:#64748b">No log entries yet.</div>',
                unsafe_allow_html=True,
            )
            return

        for entry in reversed(recent):
            style = _LEVEL_STYLE.get(entry["level"], _LEVEL_STYLE["DEBUG"])
            badge = (
                f'<span style="{style};font-size:9px;font-weight:700;'
                f'padding:1px 5px;border-radius:3px;letter-spacing:.5px">'
                f'{entry["level"]}</span>'
            )
            st.markdown(
                f'<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #1e293b">'
                f'<span style="color:#64748b">{entry["ts"]}</span> '
                f'{badge} '
                f'<span style="color:#94a3b8;font-size:9px">[{entry["module"]}]</span> '
                f'<span style="color:#e2e8f0">{entry["message"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
            if "traceback" in entry:
                st.code(entry["traceback"], language="python")
