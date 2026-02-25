import functions_framework
import snowflake.connector
import firebase_admin
from firebase_admin import app_check
from datetime import datetime, timezone
from flask import Request, Response
from typing import Optional
import os
import logging

# ---------------------------------------------------------------
# Configure structured logging — shows up clearly in GCP Cloud Logging
# ---------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)

# Initialize Firebase once (uses the function's service account automatically)
log.info("Initializing Firebase Admin SDK...")
firebase_admin.initialize_app()
log.info("Firebase Admin SDK initialized successfully.")


def get_secret() -> str:
    log.info("Fetching Snowflake password from environment variables...")
    
    # If this env var contains the actual password string rather than a secret name,
    # we just return it directly! No need to call the Secret Manager API.
    password = os.environ.get('SNOWFLAKE_PASS_SECRET')
    
    if not password:
        raise ValueError("Env var SNOWFLAKE_PASS_SECRET is missing or empty.")

    log.info("Password fetched successfully from environment.")
    return password


def ms_to_timestamp(ms: Optional[int | float]) -> Optional[datetime]:
    """
    WatermelonDB stores dates as Unix milliseconds (integers).
    Snowflake TIMESTAMP_NTZ expects a Python datetime.
    Returns None if the value is None or 0 (optional fields).
    """
    if ms is None or ms == 0:
        return None
    return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).replace(tzinfo=None)


@functions_framework.http
def stream_to_snowflake(request: Request) -> tuple[dict, int]:
    log.info("=== Incoming request received ===")
    log.info(f"Method: {request.method} | Content-Type: {request.content_type}")

    # ---------------------------------------------------------------
    # 1. SECURITY: Verify App Check Token
    # ⚠️  TEMPORARILY DISABLED FOR TESTING — re-enable before production!
    # ---------------------------------------------------------------
    # app_check_token = request.headers.get('X-Firebase-AppCheck')
    # log.info(f"App Check token present: {bool(app_check_token)}")
    # try:
    #     app_check.verify_token(app_check_token)
    #     log.info("App Check token verified successfully.")
    # except Exception as e:
    #     log.warning(f"App Check verification FAILED: {e}")
    #     return {"error": "Device verification failed"}, 401

    # ---------------------------------------------------------------
    # 2. GET DATA: Parse the JSON body sent from the app
    # Expected payload shape (keys match WatermelonDB field names):
    # {
    #   "scanned_items": [
    #     { "pid": 1234, "sn": 5678, "name": "...", "best_before_date": 1700000000000,
    #       "packed_on_date": 1700000000000, "net_kg": 2.5, "count": 10 }
    #   ],
    #   "sales_floor": [
    #     { "pid": 1234, "name": "...", "count": 10, "weight": 25.0, "expiry_date": 1700000000000 }
    #   ]
    # }
    # ---------------------------------------------------------------
    log.info("Parsing request body...")
    data = request.get_json(silent=True)
    if not data:
        log.error("Request body is missing or not valid JSON.")
        return {"error": "Invalid or missing JSON body"}, 400

    scanned_items = data.get('scanned_items', [])
    sales_floor   = data.get('sales_floor', [])
    log.info(f"Received {len(scanned_items)} scanned_items and {len(sales_floor)} sales_floor rows.")

    # ---------------------------------------------------------------
    # 3. CONNECT to Snowflake
    # ---------------------------------------------------------------
    sf_user    = os.environ.get('SNOWFLAKE_USER')
    sf_account = os.environ.get('SNOWFLAKE_ACCOUNT')

    log.info(f"Connecting to Snowflake — user: '{sf_user}', account: '{sf_account}'")
    if not sf_user or not sf_account:
        log.error("SNOWFLAKE_USER or SNOWFLAKE_ACCOUNT env var is missing!")
        return {"error": "Server misconfiguration: missing Snowflake credentials."}, 500

    try:
        password = get_secret()
    except Exception as e:
        log.exception(f"Failed to retrieve Snowflake password from Secret Manager: {e}")
        return {"error": f"Secret Manager error: {str(e)}"}, 500

    try:
        conn = snowflake.connector.connect(
            user=sf_user,
            account=sf_account,
            password=password,
            warehouse='COMPUTE_WH',
            database='VIZCOUNT_DB',
            schema='PUBLIC'
        )
        log.info("Snowflake connection established successfully.")
    except Exception as e:
        log.exception(f"Failed to connect to Snowflake: {e}")
        return {"error": f"Snowflake connection error: {str(e)}"}, 500

    try:
        cur = conn.cursor()

        # -----------------------------------------------------------
        # 4a. INSERT into SCANNED_ITEMS
        # Maps WatermelonDB field names → Snowflake column names:
        #   pid              → PID
        #   sn               → SN
        #   name             → NAME
        #   best_before_date → BEST_BEFORE_DATE  (ms → TIMESTAMP_NTZ)
        #   packed_on_date   → PACKED_ON_DATE    (ms → TIMESTAMP_NTZ)
        #   net_kg           → NET_KG
        #   count            → ITEM_COUNT
        # -----------------------------------------------------------
        if scanned_items:
            log.info(f"Preparing {len(scanned_items)} rows for SCANNED_ITEMS insert...")
            scanned_rows = [
                (
                    row['pid'],
                    row['sn'],
                    row['name'],
                    ms_to_timestamp(row.get('best_before_date')),
                    ms_to_timestamp(row.get('packed_on_date')),
                    row.get('net_kg'),
                    row.get('count'),
                )
                for row in scanned_items
            ]
            log.info(f"Sample row to insert: {scanned_rows[0]}")
            cur.executemany(
                """
                INSERT INTO SCANNED_ITEMS
                    (PID, SN, NAME, BEST_BEFORE_DATE, PACKED_ON_DATE, NET_KG, ITEM_COUNT)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s)
                """,
                scanned_rows
            )
            log.info(f"Successfully inserted {len(scanned_rows)} rows into SCANNED_ITEMS.")
        else:
            log.info("No scanned_items to insert, skipping.")

        # -----------------------------------------------------------
        # 4b. UPSERT into SALES_FLOOR
        # Maps WatermelonDB field names → Snowflake column names:
        #   pid          → PID
        #   name         → NAME
        #   count        → CURRENT_COUNT
        #   weight       → TOTAL_WEIGHT
        #   expiry_date  → LATEST_EXPIRY      (ms → TIMESTAMP_NTZ)
        # Uses MERGE so re-scanning the same PID updates, not duplicates.
        # -----------------------------------------------------------
        if sales_floor:
            log.info(f"Processing {len(sales_floor)} rows for SALES_FLOOR upsert (MERGE)...")
            for i, row in enumerate(sales_floor):
                log.info(f"  Upserting SALES_FLOOR row {i+1}/{len(sales_floor)}: pid={row.get('pid')}, name={row.get('name')}")
                cur.execute(
                    """
                    MERGE INTO SALES_FLOOR AS target
                    USING (
                        SELECT %s AS PID, %s AS NAME, %s AS CURRENT_COUNT,
                               %s AS TOTAL_WEIGHT, %s AS LATEST_EXPIRY
                    ) AS source
                    ON target.PID = source.PID
                    WHEN MATCHED THEN UPDATE SET
                        NAME          = source.NAME,
                        CURRENT_COUNT = source.CURRENT_COUNT,
                        TOTAL_WEIGHT  = source.TOTAL_WEIGHT,
                        LATEST_EXPIRY = source.LATEST_EXPIRY,
                        UPDATED_AT    = CURRENT_TIMESTAMP()
                    WHEN NOT MATCHED THEN INSERT
                        (PID, NAME, CURRENT_COUNT, TOTAL_WEIGHT, LATEST_EXPIRY)
                    VALUES
                        (source.PID, source.NAME, source.CURRENT_COUNT,
                         source.TOTAL_WEIGHT, source.LATEST_EXPIRY)
                    """,
                    (
                        row['pid'],
                        row['name'],
                        row.get('count'),
                        row.get('weight'),
                        ms_to_timestamp(row.get('expiry_date')),
                    )
                )
            log.info(f"Successfully upserted {len(sales_floor)} rows into SALES_FLOOR.")
        else:
            log.info("No sales_floor rows to upsert, skipping.")

        result = {
            "status": "success",
            "scanned_items_written": len(scanned_items),
            "sales_floor_upserted": len(sales_floor)
        }
        log.info(f"=== Request completed successfully: {result} ===")
        return result, 200

    except Exception as e:
        log.exception(f"Error during Snowflake write operations: {e}")
        return {"error": str(e)}, 500

    finally:
        cur.close()
        conn.close()
        log.info("Snowflake connection closed.")