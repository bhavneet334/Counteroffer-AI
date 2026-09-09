import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "counteroffer.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at       TEXT NOT NULL,
                scenario         TEXT NOT NULL,
                transcript       TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL DEFAULT 0
            )
            """
        )


def create_session(scenario: dict, transcript: list, duration_seconds: int) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO sessions (created_at, scenario, transcript, duration_seconds) VALUES (?, ?, ?, ?)",
            (
                datetime.now(timezone.utc).isoformat(),
                json.dumps(scenario),
                json.dumps(transcript),
                duration_seconds,
            ),
        )
        return cur.lastrowid


def _row_to_dict(row: sqlite3.Row, include_transcript: bool) -> dict:
    d = {
        "id": row["id"],
        "createdAt": row["created_at"],
        "scenario": json.loads(row["scenario"]),
        "durationSeconds": row["duration_seconds"],
    }
    transcript = json.loads(row["transcript"])
    d["turns"] = len(transcript)
    if include_transcript:
        d["transcript"] = transcript
    return d


def list_sessions() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM sessions ORDER BY id DESC LIMIT 100").fetchall()
        return [_row_to_dict(r, include_transcript=False) for r in rows]


def get_session(session_id: int) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return _row_to_dict(row, include_transcript=True) if row else None


def delete_session(session_id: int) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        return cur.rowcount > 0
