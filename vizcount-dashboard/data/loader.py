"""
data/loader.py
──────────────
Data loading layer — pulls live inventory data from Snowflake.

Connection strategy (tried in order)
─────────────────────────────────────
1. st.connection("snowflake")
   → Streamlit-in-Snowflake (SiS): the platform provides this implicitly.
     NO @st.cache_resource wrapper — SiS manages the session lifecycle itself.

2. st.connection("vizcount_dashboard", type="snowflake")
   → Local dev: reads .streamlit/secrets.toml.

If both fail the loader falls back to reproducible mock data so the dashboard
stays functional while the DB is being set up.

Schema notes
────────────
• scanned_items.best_before_date  – BIGINT Unix-ms  →  cooler inventory
• sales_floor.expiry_date         – BIGINT Unix-ms  →  floor inventory
• defined_products.type           – VARCHAR matching PRODUCTS keys in settings.py
"""

import random
import traceback
from datetime import datetime, date, timedelta

import pandas as pd
import streamlit as st

from config.settings import PRODUCTS, EXPIRY_OFFSETS
from utils.logger import get_logger

log = get_logger("loader")

# ── Constants ─────────────────────────────────────────────────────────────────

_DB  = "VIZCOUNT_DB"
_SCH = "INVENTORY_SCHEMA"

# ── Mock fallback ─────────────────────────────────────────────────────────────

_SEED  = 42
_today = datetime.today().date()


def _mock_data(category: str) -> pd.DataFrame:
    """Reproducible mock inventory data — used when Snowflake is unreachable."""
    random.seed(_SEED)
    rows = []
    for product in PRODUCTS[category]:
        offset = random.choice(EXPIRY_OFFSETS)
        expiry = _today + timedelta(days=offset)
        rows.append({
            "product":        product,
            "cooler_count":   random.randint(8, 80),
            "floor_count":    random.randint(2, 25),
            "expiry_date":    expiry,
            "days_to_expiry": (expiry - _today).days,
        })
    df = pd.DataFrame(rows)
    df["total_count"] = df["cooler_count"] + df["floor_count"]
    return df


# ── Snowflake connection ──────────────────────────────────────────────────────


class _SnowparkConn:
    """
    Thin wrapper around a Snowpark Session so callers can use conn.query(sql)
    uniformly whether the underlying object is a Snowpark Session or a
    Streamlit st.connection object.
    """
    def __init__(self, session):
        self._session = session

    def query(self, sql: str) -> "pd.DataFrame":
        return self._session.sql(sql).to_pandas()


def _get_conn():
    """
    Return a connection object that exposes a .query(sql) method.

    Connection strategy (tried in order):

    1. snowflake.snowpark.context.get_active_session()
       Works in ALL Streamlit-in-Snowflake (SiS) runtimes, including those
       running Streamlit < 1.28 (which lack st.connection entirely).
       The platform injects the active session automatically — no credentials
       needed.

    2. st.connection("vizcount_dashboard", type="snowflake")
       Local dev path — reads .streamlit/secrets.toml.
       Only attempted when st.connection is available (Streamlit >= 1.28).

    NOTE: deliberately NOT wrapped in @st.cache_resource — the platform-managed
    SiS session handles its own lifecycle; wrapping it breaks that.
    """
    # 1️⃣  Snowflake-native (SiS) via Snowpark session — works on ALL SiS runtimes
    try:
        from snowflake.snowpark.context import get_active_session
        session = get_active_session()
        log.info("Connected via Snowpark get_active_session() (SiS native)")
        return _SnowparkConn(session)
    except Exception as e:
        log.warning(
            "SiS Snowpark session unavailable (%s: %s) — trying st.connection.",
            type(e).__name__, e,
        )

    # 2️⃣  Local dev — st.connection (Streamlit >= 1.28 only)
    st_connection = getattr(st, "connection", None)
    if st_connection is not None:
        try:
            conn = st_connection("vizcount_dashboard", type="snowflake")
            log.info("Connected via st.connection ('vizcount_dashboard')")
            return conn
        except Exception as e:
            log.error("st.connection failed: %s", e)
    else:
        log.warning(
            "st.connection is not available (Streamlit %s) — skipping local fallback.",
            st.__version__,
        )

    raise RuntimeError(
        "Could not establish any Snowflake connection. "
        "Check .streamlit/secrets.toml for local dev, or verify the SiS "
        "app has warehouse/database access."
    )


# ── SQL query ─────────────────────────────────────────────────────────────────

# {db} / {sch} substituted first; {{category}} survives as {category} then
# replaced with the actual value — avoids f-string injection issues.
_SQL = """
SELECT
    p.name                                         AS product,
    COALESCE(SUM(s.count), 0)                      AS cooler_count,
    COALESCE(SUM(f.count), 0)                      AS floor_count,
    COALESCE(SUM(s.count), 0)
        + COALESCE(SUM(f.count), 0)                AS total_count,
    COALESCE(
        MIN(f.expiry_date),
        MIN(s.best_before_date)
    )                                              AS expiry_ts,
    DATEDIFF(
        'day',
        CURRENT_DATE(),
        TO_DATE(
            TO_TIMESTAMP_NTZ(
                COALESCE(MIN(f.expiry_date), MIN(s.best_before_date)) / 1000
            )
        )
    )                                              AS days_to_expiry
FROM   {db}.{sch}.defined_products  p
LEFT JOIN {db}.{sch}.scanned_items  s ON p.pid = s.pid
LEFT JOIN {db}.{sch}.sales_floor    f ON p.pid = f.pid
WHERE  p.type = '{{category}}'
GROUP  BY p.name
ORDER  BY days_to_expiry ASC NULLS LAST
"""


def _ms_to_date(ms_val) -> date:
    """Convert a Unix-ms BIGINT from Snowflake to a Python date.

    Snowflake NULL values arrive as float NaN in pandas (not Python None),
    so we guard against both None and NaN before calling int().
    """
    if ms_val is None or pd.isna(ms_val):
        return date.today()
    return datetime.utcfromtimestamp(int(ms_val) / 1000).date()


def _load_from_snowflake(category: str) -> pd.DataFrame:
    """
    Execute the aggregation query for one category and return a clean DataFrame.

    Not cached with @st.cache_data here — caching is applied at the public API
    layer (load_category_data) so that both live and fallback paths share the
    same TTL, and the connection object never leaks into cache storage.
    """
    log.info("Querying Snowflake for category='%s'", category)

    conn  = _get_conn()
    query = _SQL.format(db=_DB, sch=_SCH).replace("{category}", category)

    log.debug("SQL:\n%s", query)

    # DO NOT pass ttl= here — conn.query(ttl=...) is Streamlit's own cache
    # layer and conflicts with @st.cache_data on the caller.
    df = conn.query(query)
    log.info("Query returned %d row(s) for '%s'", len(df), category)

    if df.empty:
        log.warning("Empty result for '%s' — no matching products in DB.", category)
        return pd.DataFrame(columns=[
            "product", "cooler_count", "floor_count",
            "total_count", "expiry_date", "days_to_expiry",
        ])

    # Snowflake returns uppercase column names — normalise to lowercase
    df.columns = [c.lower() for c in df.columns]

    # Convert raw BIGINT Unix-ms → Python date
    df["expiry_date"] = df["expiry_ts"].apply(_ms_to_date)
    df = df.drop(columns=["expiry_ts"], errors="ignore")

    # Enforce correct dtypes
    for col in ("cooler_count", "floor_count", "total_count", "days_to_expiry"):
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    log.debug("Processed DataFrame columns: %s", list(df.columns))
    return df


# ── Public API ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=60)
def load_category_data(category: str) -> pd.DataFrame:
    """Return aggregated inventory DataFrame for *category*.

    Tries Snowflake first; on any failure logs the full traceback and falls
    back to reproducible mock data so the dashboard stays functional.
    """
    try:
        df = _load_from_snowflake(category)
        if not df.empty:
            log.info("'%s' loaded from Snowflake (%d products)", category, len(df))
            return df
        log.warning("'%s' returned 0 rows from Snowflake — showing mock data.", category)
    except Exception as exc:
        tb = traceback.format_exc()
        log.error(
            "Snowflake query FAILED for '%s': %s\n%s",
            category, exc, tb,
        )
        st.warning(
            f"⚠️ Could not load live data for **{category}** from Snowflake — "
            "showing demo data.  Check the **🪲 Debug Logs** panel in the sidebar.",
            icon="🔌",
        )

    return _mock_data(category)


@st.cache_data(ttl=60)
def load_all_data() -> pd.DataFrame:
    """Return combined inventory for all categories (used by sidebar quick stats)."""
    frames    = [load_category_data(cat) for cat in PRODUCTS]
    non_empty = [f for f in frames if not f.empty]
    if not non_empty:
        return pd.DataFrame(columns=[
            "product", "cooler_count", "floor_count",
            "total_count", "expiry_date", "days_to_expiry",
        ])
    return pd.concat(non_empty, ignore_index=True)
