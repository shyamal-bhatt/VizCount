"""
components/alerts.py
────────────────────
Expiry alert expander: groups items into expired / today / tomorrow buckets.
Only renders if there is at least one affected item.
"""

import pandas as pd
import streamlit as st


def render_alerts(df: pd.DataFrame) -> None:
    expired = df[df["days_to_expiry"] < 0]
    today   = df[df["days_to_expiry"] == 0]
    tomorrow = df[df["days_to_expiry"] == 1]

    if expired.empty and today.empty and tomorrow.empty:
        return

    with st.expander("Expiry Alerts — action required", expanded=True):
        active_alerts = []
        if not expired.empty: active_alerts.append(("expired", expired))
        if not today.empty: active_alerts.append(("today", today))
        if not tomorrow.empty: active_alerts.append(("tomorrow", tomorrow))

        cols = st.columns(len(active_alerts))
        
        for i, (a_type, df_alert) in enumerate(active_alerts):
            with cols[i]:
                names = ", ".join(df_alert["product"].tolist())
                if a_type == "expired":
                    st.markdown(
                        f'<div class="alert-expired">'
                        f'<div class="alert-text">Already Expired &nbsp;({df_alert.shape[0]})</div>'
                        f'<div class="alert-sub">{names}</div></div>',
                        unsafe_allow_html=True,
                    )
                elif a_type == "today":
                    st.markdown(
                        f'<div class="alert-today">'
                        f'<div class="alert-text">Expiring Today &nbsp;({df_alert.shape[0]})</div>'
                        f'<div class="alert-sub">{names}</div></div>',
                        unsafe_allow_html=True,
                    )
                elif a_type == "tomorrow":
                    st.markdown(
                        f'<div class="alert-soon">'
                        f'<div class="alert-text">Expiring Tomorrow &nbsp;({df_alert.shape[0]})</div>'
                        f'<div class="alert-sub">{names}</div></div>',
                        unsafe_allow_html=True,
                    )
