from pydantic import BaseModel
from typing import Optional


class BatchUploadResponse(BaseModel):
    batch_id:            int
    batch_name:          str
    academic_year:       int
    total_certificates:  int
    message:             str


class BatchSummaryResponse(BaseModel):
    batch_id:            int
    batch_name:          str
    academic_year:       int
    total_certificates:  int
    created_at:          str

    model_config = {"from_attributes": True}

class CertificateRowInput(BaseModel):
    serial_number: str
    fullname: str
    program: str
    graduation_year: int
    issuer: str