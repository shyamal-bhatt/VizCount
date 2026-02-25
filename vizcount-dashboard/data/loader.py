"""
data/loader.py
──────────────
Data loading layer. Currently returns reproducible mock data.

To switch to live Snowflake data:
  1. Copy .streamlit/secrets.toml.example → .streamlit/secrets.toml and fill credentials.
  2. Uncomment the `_load_from_snowflake()` function below.
  3. Replace the `return _mock_data(category)` call with `return _load_from_snowflake(category)`.

When deployed on Snowflake, `st.secrets` is populated automatically
from Snowflake's Secrets Manager — no secrets.toml needed.
"""

import random
from datetime import datetime, timedelta

import pandas as pd
import streamlit as st

from config.settings import PRODUCTS, EXPIRY_OFFSETS

# Reproducible seed so mock data matches reference screenshots
_SEED = 42
today = datetime.today().date()


# ── Mock data (active) ────────────────────────────────────────────────────────

def _mock_data(category: str) -> pd.DataFrame:
    random.seed(_SEED)
    rows = []
    for product in PRODUCTS[category]:
        offset = random.choice(EXPIRY_OFFSETS)
        expiry = today + timedelta(days=offset)
        rows.append({
            "product":        product,
            "cooler_count":   random.randint(8, 80),
            "floor_count":    random.randint(2, 25),
            "expiry_date":    expiry,
            "days_to_expiry": (expiry - today).days,
        })
    df = pd.DataFrame(rows)
    df["total_count"] = df["cooler_count"] + df["floor_count"]
    return df


# ── Snowflake (stub — uncomment when ready) ───────────────────────────────────
#
# import snowflake.connector
#
# @st.cache_resource
# def _get_connection():
#     creds = st.secrets["connections"]["vizcount_dashboard"]
#     return snowflake.connector.connect(
#         account   = creds["account"],
#         user      = creds["user"],
#         password  = creds["password"],
#         role      = creds["role"],
#         warehouse = creds["warehouse"],
#         database  = creds["database"],
#         schema    = creds["schema"],
#     )
#
# @st.cache_data(ttl=300)
# def _load_from_snowflake(category: str) -> pd.DataFrame:
#     conn = _get_connection()
#     query = """
#         SELECT
#             p.name                                             AS product,
#             s.count                                            AS cooler_count,
#             f.count                                            AS floor_count,
#             s.count + f.count                                  AS total_count,
#             f.expiry_date,
#             DATEDIFF('day', CURRENT_DATE(), f.expiry_date)     AS days_to_expiry
#         FROM defined_products p
#         LEFT JOIN scanned_items s ON p.pid = s.pid
#         LEFT JOIN sales_floor   f ON p.pid = f.pid
#         WHERE p.type = %(category)s
#     """
#     return pd.read_sql(query, conn, params={"category": category.lower()})


# ── Public API ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=60)
def load_category_data(category: str) -> pd.DataFrame:
    """Return inventory DataFrame for the given category."""
    return _mock_data(category)


@st.cache_data(ttl=60)
def load_all_data() -> pd.DataFrame:
    """Return combined inventory DataFrame for all categories (used by sidebar quick stats)."""
    frames = [_mock_data(cat) for cat in PRODUCTS]
    return pd.concat(frames, ignore_index=True)
