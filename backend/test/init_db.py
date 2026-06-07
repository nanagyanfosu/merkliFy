import _bootstrap  # noqa: F401

from backend.database import Base, engine
from backend.models.user import User
from backend.models.certificate import CertificateRecord
# from backend.models.batch import Batch
from backend.models.university import University

print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("DONE: Tables created successfully")