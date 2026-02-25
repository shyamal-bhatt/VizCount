"""
app.py
──────
Entry point for the VizCount Meat Department Dashboard.

Wires together:
  - Config   → config/settings.py
  - Data     → data/loader.py
  - UI       → components/*
  - Styling  → utils/icons.py + .streamlit/config.toml
"""

import streamlit as st

from config.settings import PAGE_CONFIG
from data.loader import load_category_data
from utils.icons import inject_css, force_sidebar_open, ICON_HEADER
from components.sidebar import render_sidebar
from components.metrics import render_kpi_row
from components.alerts import render_alerts
from components.charts import render_charts_row
from components.inventory_table import render_inventory_table
from utils.icons import ICON_HEADER

# ── Bootstrap ─────────────────────────────────────────────────────────────────
st.set_page_config(**PAGE_CONFIG)
inject_css()
force_sidebar_open()    # JS override: keeps sidebar translateX at 0 on every run

# ── Sidebar / navigation ───────────────────────────────────────────────────────
selected_category = render_sidebar()

# ── Load category data ─────────────────────────────────────────────────────────
df = load_category_data(selected_category)

# ── Page header ────────────────────────────────────────────────────────────────
col_hdr, col_live = st.columns([6, 1])
with col_hdr:
    st.markdown(
        f"""
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
          <div style="width:48px;height:48px;background:#f1f5f9;border-radius:12px;
                      display:flex;align-items:center;justify-content:center;border:1px solid #e2e8f0">
            {ICON_HEADER}
          </div>
          <div>
            <div style="font-size:26px;font-weight:700;color:#0f172a;line-height:1">
              {selected_category}
            </div>
            <div style="font-size:13px;color:#64748b;margin-top:3px">
              Inventory overview and expiry tracking
            </div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
with col_live:
    st.markdown(
        '<div style="text-align:right;padding-top:14px;font-size:13px;color:#22c55e">'
        '<span class="live-dot"></span>Live Data</div>',
        unsafe_allow_html=True,
    )

st.markdown("---")

# ── KPI cards ──────────────────────────────────────────────────────────────────
render_kpi_row(df)

st.markdown("<div style='margin-top:20px'></div>", unsafe_allow_html=True)

# ── Expiry alerts ──────────────────────────────────────────────────────────────
render_alerts(df)

st.markdown("<div style='margin-top:8px'></div>", unsafe_allow_html=True)

# ── Charts ─────────────────────────────────────────────────────────────────────
render_charts_row(df)

# ── Inventory table ────────────────────────────────────────────────────────────
st.markdown("---")
render_inventory_table(df)
