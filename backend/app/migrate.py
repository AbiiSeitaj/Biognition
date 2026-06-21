"""Lightweight schema migrations for additive columns."""

from sqlalchemy import inspect, text

from app.database import engine


def run_migrations() -> None:
    inspector = inspect(engine)
    dialect = engine.dialect.name
    _migrate_user_role_enum(dialect)

    tables = set(inspector.get_table_names())

    if "reports" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("reports")}
    with engine.begin() as conn:
        if "approved" not in cols:
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE reports ADD COLUMN approved BOOLEAN DEFAULT FALSE"))
            else:
                conn.execute(text("ALTER TABLE reports ADD COLUMN approved BOOLEAN DEFAULT 0"))
        if "approved_at" not in cols:
            col_type = "TIMESTAMP" if dialect == "postgresql" else "DATETIME"
            conn.execute(text(f"ALTER TABLE reports ADD COLUMN approved_at {col_type}"))
        if "approved_by" not in cols:
            conn.execute(text("ALTER TABLE reports ADD COLUMN approved_by VARCHAR(128)"))
        if "ai_findings" not in cols:
            conn.execute(text("ALTER TABLE reports ADD COLUMN ai_findings TEXT"))
        if "ai_impression" not in cols:
            conn.execute(text("ALTER TABLE reports ADD COLUMN ai_impression TEXT"))
        if "ai_recommendations" not in cols:
            conn.execute(text("ALTER TABLE reports ADD COLUMN ai_recommendations TEXT"))
        if "ai_risk_level" not in cols:
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE reports ADD COLUMN ai_risk_level risklevel"))
            else:
                conn.execute(text("ALTER TABLE reports ADD COLUMN ai_risk_level VARCHAR(16)"))
        conn.execute(
            text(
                "UPDATE reports SET ai_findings = findings WHERE ai_findings IS NULL OR ai_findings = ''"
            )
        )
        conn.execute(
            text(
                "UPDATE reports SET ai_impression = impression WHERE ai_impression IS NULL OR ai_impression = ''"
            )
        )
        conn.execute(
            text(
                "UPDATE reports SET ai_recommendations = recommendations "
                "WHERE ai_recommendations IS NULL OR ai_recommendations = ''"
            )
        )
        if dialect == "postgresql":
            conn.execute(
                text(
                    "UPDATE reports SET ai_risk_level = risk_level::risklevel "
                    "WHERE ai_risk_level IS NULL"
                )
            )
        else:
            conn.execute(
                text("UPDATE reports SET ai_risk_level = risk_level WHERE ai_risk_level IS NULL")
            )

    _migrate_users(inspector, dialect)
    _migrate_studies(inspector, dialect)
    _migrate_reports(inspector, dialect)
    _ensure_team_tables(inspector, dialect)


def _add_column(conn, dialect: str, table: str, column: str, col_type: str) -> None:
    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))


def _migrate_users(inspector, dialect: str) -> None:
    if "users" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "dept_id" not in cols:
            _add_column(conn, dialect, "users", "dept_id", "VARCHAR(32)")
        if "first_name" not in cols:
            _add_column(conn, dialect, "users", "first_name", "VARCHAR(64)")
        if "last_name" not in cols:
            _add_column(conn, dialect, "users", "last_name", "VARCHAR(64)")


def _migrate_user_role_enum(dialect: str) -> None:
    if dialect != "postgresql":
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMINISTRATOR'"))


def _migrate_studies(inspector, dialect: str) -> None:
    if "studies" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("studies")}
    with engine.begin() as conn:
        if "submitted_by_id" not in cols:
            _add_column(conn, dialect, "studies", "submitted_by_id", "INTEGER")
        if "submit_source" not in cols:
            _add_column(conn, dialect, "studies", "submit_source", "VARCHAR(256)")


def _migrate_reports(inspector, dialect: str) -> None:
    if "reports" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("reports")}
    with engine.begin() as conn:
        if "approved_by_id" not in cols:
            _add_column(conn, dialect, "reports", "approved_by_id", "INTEGER")


def _ensure_team_tables(inspector, dialect: str) -> None:
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "study_assignments" not in tables:
            conn.execute(
                text(
                    """
                    CREATE TABLE study_assignments (
                        id INTEGER PRIMARY KEY,
                        study_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        department VARCHAR(64) NOT NULL,
                        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                    if dialect != "postgresql"
                    else """
                    CREATE TABLE study_assignments (
                        id SERIAL PRIMARY KEY,
                        study_id INTEGER NOT NULL REFERENCES studies(id),
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        department VARCHAR(64) NOT NULL,
                        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
        if "case_messages" not in tables:
            conn.execute(
                text(
                    """
                    CREATE TABLE case_messages (
                        id INTEGER PRIMARY KEY,
                        study_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        body TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                    if dialect != "postgresql"
                    else """
                    CREATE TABLE case_messages (
                        id SERIAL PRIMARY KEY,
                        study_id INTEGER NOT NULL REFERENCES studies(id),
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        body TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
