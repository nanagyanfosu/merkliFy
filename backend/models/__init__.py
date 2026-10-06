# Import all models here so Alembic can discover them for migrations.
from .university import University, TrustStatus
from .user import User, UserRole
from .batch import CertificateBatch
from .certificate import CertificateRecord
from .merkle import MerkleProof
from .status import CertificateStatus, CertificateStatusHistory, CertificateLifecycleStatus
from .verification_log import VerificationLog
from .activity_event import ActivityEvent