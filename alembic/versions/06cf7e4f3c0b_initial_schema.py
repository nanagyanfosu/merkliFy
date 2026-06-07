"""initial_schema

Revision ID: 06cf7e4f3c0b
Revises:
Create Date: 2026-05-28 00:53:25.743018

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '06cf7e4f3c0b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

trust_status_enum = postgresql.ENUM('PENDING', 'TRUSTED', 'REVOKED', name='truststatus', create_type=False)
user_role_enum = postgresql.ENUM('ADMIN', 'ISSUER', name='userrole', create_type=False)
certificate_lifecycle_status_enum = postgresql.ENUM('ACTIVE', 'REVOKED', 'SUSPENDED', name='certificatelifecyclestatus', create_type=False)


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    trust_status_enum.create(bind, checkfirst=True)
    user_role_enum.create(bind, checkfirst=True)
    certificate_lifecycle_status_enum.create(bind, checkfirst=True)

    op.create_table(
        'university_registry',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('university_code', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('university_name', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('location', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('contact', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('domain', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('public_key', sa.Text(), autoincrement=False, nullable=True),
        sa.Column('encrypted_private_key', sa.Text(), autoincrement=False, nullable=True),
        sa.Column('trust_status', trust_status_enum, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('university_registry_pkey')),
    )
    op.create_index(op.f('ix_university_registry_id'), 'university_registry', ['id'], unique=False)
    op.create_index(op.f('ix_university_registry_university_code'), 'university_registry', ['university_code'], unique=True)

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('password_hash', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('role', user_role_enum, nullable=False),
        sa.Column('university_id', sa.Integer(), autoincrement=False, nullable=True),
        sa.Column('issuer_name', sa.String(length=255), autoincrement=False, nullable=True),
        sa.Column('department', sa.String(length=255), autoincrement=False, nullable=True),
        sa.Column('department_code', sa.String(length=20), autoincrement=False, nullable=True),
        sa.Column('is_temp_password', sa.Boolean(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['university_id'], ['university_registry.id'], name=op.f('users_university_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('users_pkey')),
        sa.UniqueConstraint('department_code', name=op.f('users_department_code_key')),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'verification_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('serial_number', sa.String(length=100), autoincrement=False, nullable=False),
        sa.Column('fullname', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('verification_result', sa.String(length=50), autoincrement=False, nullable=False),
        sa.Column('ip_address', sa.String(length=50), autoincrement=False, nullable=True),
        sa.Column('timestamp', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('verification_logs_pkey')),
    )
    op.create_index(op.f('ix_verification_logs_id'), 'verification_logs', ['id'], unique=False)

    op.create_table(
        'certificate_batches',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('university_id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('batch_name', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('academic_year', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('merkle_root', sa.String(length=64), autoincrement=False, nullable=False),
        sa.Column('signed_root', sa.Text(), autoincrement=False, nullable=False),
        sa.Column('total_certificates', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('uploaded_by', sa.Integer(), autoincrement=False, nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['university_id'], ['university_registry.id'], name=op.f('certificate_batches_university_id_fkey')),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], name=op.f('certificate_batches_uploaded_by_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('certificate_batches_pkey')),
    )
    op.create_index(op.f('ix_certificate_batches_id'), 'certificate_batches', ['id'], unique=False)

    op.create_table(
        'certificate_records',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('batch_id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('university_id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('serial_number', sa.String(length=100), autoincrement=False, nullable=False),
        sa.Column('fullname', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('program', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('graduation_year', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('issuer', sa.String(length=255), autoincrement=False, nullable=False),
        sa.Column('student_id', sa.String(length=100), autoincrement=False, nullable=True),
        sa.Column('classification', sa.String(length=100), autoincrement=False, nullable=True),
        sa.Column('issue_date', sa.String(length=20), autoincrement=False, nullable=True),
        sa.Column('certificate_hash', sa.String(length=64), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['certificate_batches.id'], name=op.f('certificate_records_batch_id_fkey')),
        sa.ForeignKeyConstraint(['university_id'], ['university_registry.id'], name=op.f('certificate_records_university_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('certificate_records_pkey')),
        sa.UniqueConstraint('serial_number', 'university_id', name=op.f('uq_serial_university')),
    )
    op.create_index(op.f('ix_certificate_records_id'), 'certificate_records', ['id'], unique=False)
    op.create_index(op.f('ix_certificate_records_serial_number'), 'certificate_records', ['serial_number'], unique=False)
    op.create_index(op.f('ix_certificate_records_university_id'), 'certificate_records', ['university_id'], unique=False)

    op.create_table(
        'merkle_proofs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('certificate_id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('proof_path', postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=False),
        sa.Column('leaf_index', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['certificate_id'], ['certificate_records.id'], name=op.f('merkle_proofs_certificate_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('merkle_proofs_pkey')),
        sa.UniqueConstraint('certificate_id', name=op.f('merkle_proofs_certificate_id_key')),
    )
    op.create_index(op.f('ix_merkle_proofs_id'), 'merkle_proofs', ['id'], unique=False)

    op.create_table(
        'certificate_status',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('certificate_id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('current_status', certificate_lifecycle_status_enum, nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['certificate_id'], ['certificate_records.id'], name=op.f('certificate_status_certificate_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('certificate_status_pkey')),
        sa.UniqueConstraint('certificate_id', name=op.f('certificate_status_certificate_id_key')),
    )
    op.create_index(op.f('ix_certificate_status_id'), 'certificate_status', ['id'], unique=False)

    op.create_table(
        'certificate_status_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('certificate_id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('old_status', sa.String(length=20), autoincrement=False, nullable=False),
        sa.Column('new_status', sa.String(length=20), autoincrement=False, nullable=False),
        sa.Column('changed_by', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('reason', sa.Text(), autoincrement=False, nullable=True),
        sa.Column('changed_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['certificate_id'], ['certificate_records.id'], name=op.f('certificate_status_history_certificate_id_fkey')),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], name=op.f('certificate_status_history_changed_by_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('certificate_status_history_pkey')),
    )
    op.create_index(op.f('ix_certificate_status_history_id'), 'certificate_status_history', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_certificate_status_history_id'), table_name='certificate_status_history')
    op.drop_table('certificate_status_history')

    op.drop_index(op.f('ix_certificate_status_id'), table_name='certificate_status')
    op.drop_table('certificate_status')

    op.drop_index(op.f('ix_merkle_proofs_id'), table_name='merkle_proofs')
    op.drop_table('merkle_proofs')

    op.drop_index(op.f('ix_certificate_records_university_id'), table_name='certificate_records')
    op.drop_index(op.f('ix_certificate_records_serial_number'), table_name='certificate_records')
    op.drop_index(op.f('ix_certificate_records_id'), table_name='certificate_records')
    op.drop_table('certificate_records')

    op.drop_index(op.f('ix_certificate_batches_id'), table_name='certificate_batches')
    op.drop_table('certificate_batches')

    op.drop_index(op.f('ix_verification_logs_id'), table_name='verification_logs')
    op.drop_table('verification_logs')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')

    op.drop_index(op.f('ix_university_registry_university_code'), table_name='university_registry')
    op.drop_index(op.f('ix_university_registry_id'), table_name='university_registry')
    op.drop_table('university_registry')

    certificate_lifecycle_status_enum.drop(op.get_bind(), checkfirst=True)
    user_role_enum.drop(op.get_bind(), checkfirst=True)
    trust_status_enum.drop(op.get_bind(), checkfirst=True)
