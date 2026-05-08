"""
utils/logger.py
───────────────
Centralised logging for the VizCount dashboard.

How it works
────────────
• All vizcount.* loggers write to:
    1. LOG_RECORDS  — in-memory list → rendered in the sidebar debug panel
    2. Python root logger → captured by Snowflake SiS into SNOWFLAKE.TELEMETRY.EVENTS
    3. stderr        → visible in local terminal / snow CLI output

For SiS event-table capture to work, run this SQL once in Snowflake:

    ALTER STREAMLIT VIZCOUNT_DB.INVENTORY_SCHEMA.VIZCOUNT_DASHBOARD
        SET LOG_LEVEL = DEBUG;

Then query logs with:

    SELECT
        TIMESTAMP,
        RECORD['severity_text']::STRING  AS level,
        VALUE::STRING                    AS message
    FROM SNOWFLAKE.TELEMETRY.EVENTS
    WHERE RESOURCE_ATTRIBUTES['snow.streamlit.name']::STRING = 'VIZCOUNT_DASHBOARD'
    ORDER BY TIMESTAMP DESC
    LIMIT 200;

Usage
─────
    from utils.logger import get_logger
    log = get_logger(__name__)
    log.info("Something happened")
    log.warning("Something went wrong: %s", exc)
    log.error("Fatal: %s", exc, exc_info=True)
"""

import logging
import traceback
from datetime import datetime
from typing import List


# ── In-memory log store (thread-safe enough for single-process Streamlit) ─────

class _MemoryHandler(logging.Handler):
    """Appends formatted log records to a shared list for UI display."""

    def __init__(self, store: List[dict]):
        super().__init__()
        self._store = store

    def emit(self, record: logging.LogRecord) -> None:
        entry = {
            "ts":      datetime.now().strftime("%H:%M:%S"),
            "level":   record.levelname,
            "module":  record.name.split(".")[-1],   # last segment only
            "message": self.format(record),
        }
        if record.exc_info:
            entry["traceback"] = "".join(traceback.format_exception(*record.exc_info))
        self._store.append(entry)
        # Keep the last 200 entries to avoid unbounded growth
        if len(self._store) > 200:
            self._store.pop(0)


# Shared store — module-level so it persists across Streamlit reruns
LOG_RECORDS: List[dict] = []

_MEMORY_HANDLER = _MemoryHandler(LOG_RECORDS)
_MEMORY_HANDLER.setFormatter(logging.Formatter("%(levelname)-8s [%(name)s] %(message)s"))

# ── stderr handler (local terminal + snow CLI) ────────────────────────────────
_STDERR_HANDLER = logging.StreamHandler()
_STDERR_HANDLER.setFormatter(
    logging.Formatter("%(asctime)s %(levelname)-8s [%(name)s] %(message)s")
)
_STDERR_HANDLER.setLevel(logging.DEBUG)

# ── vizcount namespace logger ─────────────────────────────────────────────────
_ROOT = logging.getLogger("vizcount")
_ROOT.setLevel(logging.DEBUG)
_ROOT.addHandler(_MEMORY_HANDLER)
_ROOT.addHandler(_STDERR_HANDLER)

# IMPORTANT: propagate = True  (the default)
# Snowflake SiS intercepts Python's root logger to write into the event table.
# Setting propagate = False would silently drop all events from TELEMETRY.EVENTS.
_ROOT.propagate = True


def get_logger(name: str) -> logging.Logger:
    """Return a child logger under the 'vizcount' namespace."""
    return _ROOT.getChild(name)
