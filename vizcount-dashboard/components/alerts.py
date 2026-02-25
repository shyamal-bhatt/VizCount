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
        a1, a2, a3 = st.columns(3)

        with a1:
            if not expired.empty:
                names = ", ".join(expired["product"].tolist())
                st.markdown(
                    f'<div class="alert-expired">'
                    f'<div class="alert-text">Already Expired &nbsp;({expired.shape[0]})</div>'
                    f'<div class="alert-sub">{names}</div></div>',
                    unsafe_allow_html=True,
                )

        with a2:
            if not today.empty:
                names = ", ".join(today["product"].tolist())
                st.markdown(
                    f'<div class="alert-today">'
                    f'<div class="alert-text">Expiring Today &nbsp;({today.shape[0]})</div>'
                    f'<div class="alert-sub">{names}</div></div>',
                    unsafe_allow_html=True,
                )

        with a3:
            if not tomorrow.empty:
                names = ", ".join(tomorrow["product"].tolist())
                st.markdown(
                    f'<div class="alert-soon">'
                    f'<div class="alert-text">Expiring Tomorrow &nbsp;({tomorrow.shape[0]})</div>'
                    f'<div class="alert-sub">{names}</div></div>',
                    unsafe_allow_html=True,
                )
