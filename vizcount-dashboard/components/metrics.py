"""
components/metrics.py
─────────────────────
Three KPI cards: In Cooler, On Floor, Expiring Soon.
"""

import pandas as pd
import streamlit as st

from utils.icons import ICON_BOX, ICON_STORE, ICON_ALERT


def _card(svg: str, cls: str, label: str, value: str, sub: str) -> str:
    return f"""
    <div class="kpi-card">
      <div class="kpi-icon {cls}">{svg}</div>
      <div>
        <div class="kpi-label">{label}</div>
        <div class="kpi-value">{value}</div>
        <div class="kpi-sub">{sub}</div>
      </div>
    </div>
    """


def render_kpi_row(df: pd.DataFrame) -> None:
    total_cooler  = int(df["cooler_count"].sum())
    total_floor   = int(df["floor_count"].sum())
    expiring_soon = int(df[df["days_to_expiry"].between(0, 2)].shape[0])
    more_in_2days = int(df[df["days_to_expiry"].between(1, 2)].shape[0])
    unique_prods  = int(df.shape[0])

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(
            _card(ICON_BOX,   "blue",  "In Cooler",     f"{total_cooler:,}", f"{unique_prods} unique products"),
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            _card(ICON_STORE, "green", "On Floor",      f"{total_floor:,}",  f"{unique_prods} unique products"),
            unsafe_allow_html=True,
        )
    with c3:
        st.markdown(
            _card(ICON_ALERT, "red",   "Expiring Soon", f"{expiring_soon}",  f"{more_in_2days} more within 2 days"),
            unsafe_allow_html=True,
        )
