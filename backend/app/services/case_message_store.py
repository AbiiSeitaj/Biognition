"""In-memory case chat — user comments persist for the life of the API process."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock

_lock = Lock()
_next_id = 1_000_000
_messages: dict[int, list["MemoryCaseMessage"]] = {}


@dataclass
class MemoryCaseMessage:
    id: int
    study_id: int
    user_id: int
    body: str
    created_at: datetime


def add_message(study_id: int, user_id: int, body: str) -> MemoryCaseMessage:
    global _next_id
    with _lock:
        msg = MemoryCaseMessage(
            id=_next_id,
            study_id=study_id,
            user_id=user_id,
            body=body,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        _next_id += 1
        _messages.setdefault(study_id, []).append(msg)
        return msg


def list_messages(study_id: int) -> list[MemoryCaseMessage]:
    with _lock:
        return list(_messages.get(study_id, []))


def count_messages(study_id: int) -> int:
    with _lock:
        return len(_messages.get(study_id, []))
