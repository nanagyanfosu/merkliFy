import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from backend.config import settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

from backend.database import Base             # noqa: F401
from backend.models.university    import University          # noqa: F401
from backend.models.user          import User                # noqa: F401
from backend.models.batch         import CertificateBatch    # noqa: F401
from backend.models.certificate   import CertificateRecord   # noqa: F401
from backend.models.merkle        import MerkleProof         # noqa: F401
from backend.models.status        import (                   # noqa: F401
    CertificateStatus, CertificateStatusHistory,
)
from backend.models.verification_log import VerificationLog  # noqa: F401

target_metadata = Base.metadata


def _remove_drop_ops(context, revision, directives):
    """
    Safety hook: strips any auto-generated DROP TABLE operations
    from the migration before it is written.

    Prevents accidental data loss when a model is temporarily
    unimported or when Alembic detects unexpected tables.

    To intentionally drop a table, write op.drop_table() manually
    in the migration file after generation.
    """
    if not directives or not directives[0].upgrade_ops:
        return

    from alembic.operations import ops as alembic_ops

    script = directives[0]
    if script.upgrade_ops:
        script.upgrade_ops.ops = [
            op for op in script.upgrade_ops.ops
            if not isinstance(op, alembic_ops.DropTableOp)
        ]


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        process_revision_directives=_remove_drop_ops,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            process_revision_directives=_remove_drop_ops,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()