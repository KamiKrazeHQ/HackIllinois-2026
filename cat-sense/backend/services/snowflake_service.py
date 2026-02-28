"""
Snowflake session logging service.
Logs each diagnostic session (image findings, audio findings, risk result).
Falls back silently if Snowflake is not configured.

Required .env vars:
  SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD,
  SNOWFLAKE_DATABASE, SNOWFLAKE_SCHEMA, SNOWFLAKE_WAREHOUSE
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_DDL = """
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
    session_id       VARCHAR(255),
    logged_at        TIMESTAMP_TZ,
    image_component  VARCHAR(500),
    image_issue      VARCHAR(2000),
    image_severity   VARCHAR(50),
    audio_anomaly    VARCHAR(500),
    audio_freq_hz    FLOAT,
    audio_severity   VARCHAR(50),
    risk_level       VARCHAR(50),
    risk_probability FLOAT,
    risk_cost_usd    FLOAT,
    risk_action      VARCHAR(1000),
    raw_json         VARIANT
);
"""


def _get_conn():
    import snowflake.connector
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        database=os.environ["SNOWFLAKE_DATABASE"],
        schema=os.environ["SNOWFLAKE_SCHEMA"],
        warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
    )


def _ensure_table(cur) -> None:
    cur.execute(_DDL)


def log_session(session_id: str, context: dict[str, Any]) -> bool:
    """
    Log a completed diagnostic session to Snowflake.
    Returns True on success, False on any failure (never raises).
    """
    required = ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_PASSWORD",
                "SNOWFLAKE_DATABASE", "SNOWFLAKE_SCHEMA", "SNOWFLAKE_WAREHOUSE"]
    if not all(os.environ.get(k) for k in required):
        logger.debug("Snowflake not configured — skipping session log")
        return False

    try:
        img = context.get("image_analysis") or {}
        aud = context.get("audio_analysis") or {}
        risk = context.get("risk_output") or {}

        conn = _get_conn()
        cur = conn.cursor()
        _ensure_table(cur)

        cur.execute(
            """
            INSERT INTO diagnostic_sessions (
                session_id, logged_at,
                image_component, image_issue, image_severity,
                audio_anomaly, audio_freq_hz, audio_severity,
                risk_level, risk_probability, risk_cost_usd, risk_action,
                raw_json
            ) VALUES (
                %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                PARSE_JSON(%s)
            )
            """,
            (
                session_id,
                datetime.now(timezone.utc).isoformat(),
                img.get("component", ""),
                img.get("issue", ""),
                img.get("severity", ""),
                aud.get("anomaly_type", ""),
                aud.get("dominant_frequency_hz", 0.0),
                aud.get("severity", ""),
                risk.get("risk_level", ""),
                risk.get("failure_probability_14_days", 0.0),
                risk.get("estimated_downtime_cost_usd", 0.0),
                risk.get("recommended_action_window", ""),
                json.dumps(context, default=str),
            ),
        )
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Session %s logged to Snowflake", session_id)
        return True

    except KeyError as e:
        logger.warning("Snowflake env var missing: %s", e)
        return False
    except Exception as e:
        logger.error("Snowflake log failed: %s", e)
        return False
