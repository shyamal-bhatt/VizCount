"""
components/inventory_table.py
──────────────────────────────
Full-width product inventory table with row-level
conditional background color based on expiry status:

  Expired        → red   (#fee2e2)
  Expires Today  → amber (#fef9c3)
  1–2 Days       → blue  (#dbeafe)
  3+ Days        → white (default)
"""

import pandas as pd
import streamlit as st


# ── Row color helper ──────────────────────────────────────────────────────────

def _row_color(row: pd.Series) -> list[str]:
    days = row["days_to_expiry"]
    if days < 0:
        bg = "background-color: #fee2e2; color: #991b1b"
    elif days == 0:
        bg = "background-color: #fef9c3; color: #854d0e"
    elif days <= 2:
        bg = "background-color: #dbeafe; color: #1e40af"
    else:
        bg = ""
    return [bg] * len(row)


def _fmt_status(days: int) -> str:
    if days < 0:  return f"Expired {abs(days)}d ago"
    if days == 0: return "Expires Today"
    if days == 1: return "Tomorrow"
    return f"In {days} days"


# ── Public render function ────────────────────────────────────────────────────

def render_inventory_table(df: pd.DataFrame) -> None:
    st.markdown('<div class="section-title">Product Inventory Detail</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Full breakdown per product with expiry status</div>', unsafe_allow_html=True)

    display_df = df[["product", "cooler_count", "floor_count", "expiry_date", "days_to_expiry"]].copy()
    display_df["expiry_date"] = display_df["expiry_date"].astype(str)
    display_df["status"]      = display_df["days_to_expiry"].apply(_fmt_status)

    # Rename columns before styling so headers appear correctly
    display_df = display_df.rename(columns={
        "product":        "Product",
        "cooler_count":   "Cooler",
        "floor_count":    "Floor",
        "expiry_date":    "Expiry Date",
        "days_to_expiry": "Days",
        "status":         "Status",
    })

    # Apply row coloring — use a version of _row_color adapted to renamed columns
    def _row_color_renamed(row: pd.Series) -> list[str]:
        days = row["Days"]
        if days < 0:
            bg = "background-color: #fee2e2; color: #991b1b"
        elif days == 0:
            bg = "background-color: #fef9c3; color: #854d0e"
        elif days <= 2:
            bg = "background-color: #dbeafe; color: #1e40af"
        else:
            bg = ""
        return [bg] * len(row)

    styled = (
        display_df
        .style
        .apply(_row_color_renamed, axis=1)
        .hide(axis="index")
        .format({"Cooler": "{:d}", "Floor": "{:d}"})
    )

    st.dataframe(styled, width='stretch', hide_index=True)
