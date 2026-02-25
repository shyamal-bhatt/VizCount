"""
components/charts.py
────────────────────
Two equal-width charts side by side:
  - Inventory by Product (grouped bar: cooler vs floor)
  - Expiry Timeline      (bar bucketed by days-to-expiry)
"""

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from config.settings import BUCKET_ORDER, BUCKET_COLORS, CHART_LAYOUT


def _expiry_bucket(days: int) -> str:
    if days < 0:  return "Expired"
    if days == 0: return "Today"
    if days == 1: return "1 Day"
    if days == 2: return "2 Days"
    return "5+ Days"


def render_charts_row(df: pd.DataFrame) -> None:
    """Render two equal-width, equal-height charts side by side."""

    col_left, col_right = st.columns(2)          # strict 1:1 split

    # ── Inventory by Product ──────────────────────────────────────────────────
    with col_left:
        st.markdown('<div class="section-title">Inventory by Product</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">Cooler vs. sales floor item counts</div>', unsafe_allow_html=True)

        fig = go.Figure()
        fig.add_trace(go.Bar(
            name="In Cooler",
            x=df["product"], y=df["cooler_count"],
            marker_color="#3b82f6", marker_line_width=0,
            hovertemplate="<b>%{x}</b><br>Cooler: %{y}<extra></extra>",
        ))
        fig.add_trace(go.Bar(
            name="On Floor",
            x=df["product"], y=df["floor_count"],
            marker_color="#22c55e", marker_line_width=0,
            hovertemplate="<b>%{x}</b><br>Floor: %{y}<extra></extra>",
        ))
        fig.update_layout(**CHART_LAYOUT, barmode="group", xaxis_tickangle=-35)
        st.plotly_chart(fig, width='stretch', config={"displayModeBar": False})

    # ── Expiry Timeline ───────────────────────────────────────────────────────
    with col_right:
        st.markdown('<div class="section-title">Expiry Timeline</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">Item counts grouped by days until expiry</div>', unsafe_allow_html=True)

        df = df.copy()
        df["bucket"] = df["days_to_expiry"].apply(_expiry_bucket)
        bucket_df = (
            df.groupby("bucket")["total_count"]
            .sum()
            .reindex(BUCKET_ORDER, fill_value=0)
            .reset_index()
        )
        bucket_df.columns = ["bucket", "count"]
        bucket_df["color"] = bucket_df["bucket"].map(BUCKET_COLORS)

        fig2 = go.Figure(go.Bar(
            x=bucket_df["bucket"],
            y=bucket_df["count"],
            marker_color=bucket_df["color"],
            marker_line_width=0,
            hovertemplate="<b>%{x}</b><br>Items: %{y}<extra></extra>",
        ))
        fig2.update_layout(**CHART_LAYOUT, showlegend=False)
        st.plotly_chart(fig2, width='stretch', config={"displayModeBar": False})
