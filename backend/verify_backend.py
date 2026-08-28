"""
Gatekeeper Backend Comprehensive Verification Suite (Windows ASCII safe)
"""
import sys
import logging
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def run_verifications():
    print("=" * 60)
    print("GATEKEEPER BACKEND VERIFICATION RUNNER")
    print("=" * 60)

    # Test 1: App main import
    print("\n[TEST 1] Importing app.main...")
    try:
        from app.main import app
        print("  [OK] FASTAPI application imported successfully.")
    except Exception as e:
        print(f"  [FAIL] Failed to import app.main: {e}")
        return False

    # Test 2: Database models & initialization
    print("\n[TEST 2] Verifying database connection & models...")
    try:
        from app.database.connection import engine, Base, SessionLocal
        from app.database.models import Wallet, Media, Extraction, Case
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        db.query(Wallet).first()
        db.close()
        print("  [OK] SQL Database initialized and queried successfully.")
    except Exception as e:
        print(f"  [FAIL] Database verification failed: {e}")
        return False

    # Test 3: Wallet Detection & Validation
    print("\n[TEST 3] Testing Wallet Extraction & Validation Engine...")
    try:
        from app.core.wallet.detector import wallet_detector
        from app.core.wallet.validator import wallet_validator
        from app.core.scoring.engine import risk_engine

        sample_text = """
        Donate BTC to: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
        Send ETH to: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
        Solana Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
        """
        detected = wallet_detector.detect(sample_text)
        print(f"  Detected {len(detected)} wallets:")
        for w in detected:
            val = wallet_validator.validate(w)
            scored = risk_engine.calculate(val, source="file_upload")
            print(f"    - {scored['address'][:16]}... | Chain: {scored['chain']} | Valid: {scored['valid']} | Risk: {scored['risk_score']}/100 ({scored['risk_level']})")
        assert len(detected) >= 3, "Expected at least 3 detected wallets"
        print("  [OK] Wallet extraction, validation, and risk scoring passed.")
    except Exception as e:
        print(f"  [FAIL] Wallet extraction failed: {e}")
        return False

    # Test 4: PDF Report Generator
    print("\n[TEST 4] Testing Forensic PDF Report Generator...")
    try:
        from app.core.reports.pdf import pdf_generator
        class DummyWallet:
            address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
            chain = "ethereum"
            risk_score = 85
            risk_level = "HIGH"
            confidence = 95
            ocr_corrected = False

        pdf_bytes = pdf_generator.generate(
            title="Verification Test Report",
            wallets=[DummyWallet()],
            subtitle_lines=["Verification Test Run"],
            edges=[],
        )
        print(f"  [OK] PDF report generated successfully ({len(pdf_bytes):,} bytes).")
        assert len(pdf_bytes) > 1000, "PDF bytes should be non-empty"
    except Exception as e:
        print(f"  [FAIL] PDF Report generator failed: {e}")
        return False

    # Test 5: Relational Fallback Graph Data
    print("\n[TEST 5] Testing Relational Graph Fallback API logic...")
    try:
        from app.database.neo4j import is_neo4j_available
        neo4j_status = "ONLINE" if is_neo4j_available() else "OFFLINE (Fallback Active)"
        print(f"  Neo4j status: {neo4j_status}")
        from app.api.graph import get_graph
        from app.database.connection import get_database
        db_gen = get_database()
        db_sess = next(db_gen)
        graph_data = get_graph(case_id=None, db=db_sess)
        print(f"  [OK] Graph returned {graph_data['node_count']} nodes, {graph_data['edge_count']} edges.")
    except Exception as e:
        print(f"  [FAIL] Graph API verification failed: {e}")
        return False

    print("\n" + "=" * 60)
    print("ALL 5 BACKEND VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = run_verifications()
    sys.exit(0 if success else 1)
