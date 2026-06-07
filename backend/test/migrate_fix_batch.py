"""
Fixes all existing batches in the database.

What this does:
  1. Rebuilds every Merkle tree using the corrected algorithm.
  2. Updates proof paths for every certificate in every batch.
  3. Re-signs each Merkle Root with the university's private key.
  4. Normalises the issuer field on every certificate to match the
     university's registered name (lowercase).

Why this is necessary:
  - The old build_merkle_tree_clean() had a proof path bug.
    Any leaf at index 1, 3, 5... had a truncated proof path,
    causing BATCH_TAMPER_DETECTED for ~50% of certificates.
  - The issuer field in certificate_records was taken from the CSV
    and might not match the university's registered name.

Run with:
    python migrate_fix_batches.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal
from backend.models.batch import CertificateBatch
from backend.models.certificate import CertificateRecord
from backend.models.merkle import MerkleProof
from backend.models.university import University
from backend.services.hashing_service import hash_certificate
from backend.services.merkle_service import build_merkle_tree
from backend.services.signature_service import sign_merkle_root


def run_migration(dry_run: bool = False):
    db = SessionLocal()
    errors = []

    try:
        batches = db.query(CertificateBatch).order_by(CertificateBatch.id).all()
        print(f"\nFound {len(batches)} batch(es) to process.\n")

        for batch in batches:
            print(f"  Batch #{batch.id} — '{batch.batch_name}' ({batch.academic_year})")

            university = db.query(University).filter(
                University.id == batch.university_id
            ).first()

            if not university:
                msg = f"    ⚠ University {batch.university_id} not found — skipped"
                print(msg)
                errors.append(msg)
                continue

            canonical_issuer = university.university_name.strip().lower()

            certs = (
                db.query(CertificateRecord)
                .filter(CertificateRecord.batch_id == batch.id)
                .order_by(CertificateRecord.id)   # insertion order = leaf order
                .all()
            )

            if not certs:
                print(f"    ⚠ No certificates found — skipped")
                continue

            # Recompute leaf hashes with enforced university issuer
            leaf_hashes = []
            for cert in certs:
                h = hash_certificate(
                    serial_number=cert.serial_number,
                    fullname=cert.fullname,
                    program=cert.program,
                    graduation_year=cert.graduation_year,
                    issuer=canonical_issuer,
                )
                leaf_hashes.append(h)

            # Rebuild Merkle tree with the correct algorithm
            new_root, new_proof_paths = build_merkle_tree(leaf_hashes)

            # Re-sign the root
            try:
                new_signed_root = sign_merkle_root(new_root, university)
            except Exception as e:
                msg = f"    ✗ Could not re-sign (no private key?): {e}"
                print(msg)
                errors.append(msg)
                continue

            if dry_run:
                print(f"    [DRY RUN] Would update root to {new_root[:24]}…")
                print(f"    [DRY RUN] {len(certs)} proof paths would be rebuilt")
                continue

            # Apply changes
            batch.merkle_root = new_root
            batch.signed_root = new_signed_root

            for cert, new_hash, new_proof in zip(certs, leaf_hashes, new_proof_paths):
                cert.issuer           = canonical_issuer
                cert.certificate_hash = new_hash

                proof_record = db.query(MerkleProof).filter(
                    MerkleProof.certificate_id == cert.id
                ).first()

                if proof_record:
                    proof_record.proof_path = new_proof
                else:
                    db.add(MerkleProof(
                        certificate_id=cert.id,
                        proof_path=new_proof,
                        leaf_index=certs.index(cert),
                    ))

            db.flush()
            print(f"    ✓ Rebuilt — new root: {new_root[:24]}…  ({len(certs)} certs)")

        if not dry_run:
            db.commit()
            print(f"\n{'='*55}")
            if errors:
                print(f"✅ Migration completed with {len(errors)} warning(s):")
                for e in errors: print(f"  {e}")
            else:
                print("✅ Migration completed successfully. All batches fixed.")
        else:
            print("\n[DRY RUN complete — no changes written]")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration failed and was rolled back: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("="*55)
    print("  merkliFy — Batch Merkle Tree Migration")
    print("="*55)
    print("\nThis will rebuild all Merkle trees, proof paths, and")
    print("re-sign all batch roots. Existing hashes will change.\n")

    mode = input("Run mode — type 'dry' to preview, 'run' to apply: ").strip().lower()

    if mode == "dry":
        run_migration(dry_run=True)
    elif mode == "run":
        confirm = input("\nType 'confirm' to proceed: ").strip().lower()
        if confirm == "confirm":
            run_migration(dry_run=False)
        else:
            print("Aborted.")
    else:
        print("Invalid input. Aborted.")