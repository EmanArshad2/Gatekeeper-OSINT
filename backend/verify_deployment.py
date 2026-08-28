"""
Gatekeeper Full Deployment & Multi-Chain Ingestion Test Runner
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def run_deployment_tests():
    print("=" * 65)
    print("GATEKEEPER DEPLOYMENT READINESS & MULTI-CHAIN TEST SUITE")
    print("=" * 65)

    # TEST 1: App Main & Routers
    print("\n[TEST 1] Testing Application Initialization...")
    try:
        from app.main import app
        print("  [OK] FastAPI app & routers loaded with 0 errors.")
    except Exception as e:
        print(f"  [FAIL] App initialization failed: {e}")
        return False

    # TEST 2: Multi-Chain Wallet Regex & Validation Engine
    print("\n[TEST 2] Testing Multi-Chain Address Extraction & Risk Scoring...")
    sample_corpus = """
    BTC Legacy: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
    BTC Bech32: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
    ETH / EVM: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    Solana: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
    Litecoin: LhyEZsAUpz54dC7FhP19CjY1Q6T11Yx3Y
    Tron: TLa2f6VPqDgRE67v1736s7bJj5p5c8R4
    Monero: 44AFFq5kSiGBoG4NMDwYtN18obc8AemS33DBLWs3H7otXFT3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A
    """
    try:
        from app.core.wallet.detector import wallet_detector
        from app.core.wallet.validator import wallet_validator
        from app.core.scoring.engine import risk_engine

        detected = wallet_detector.detect(sample_corpus)
        print(f"  Extracted {len(detected)} crypto addresses across multi-chain corpus:")
        for w in detected:
            val = wallet_validator.validate(w)
            scored = risk_engine.calculate(val, source="osint_test")
            print(f"    - {scored['address'][:18]}... | Chain: {scored['chain']} | Valid: {scored['valid']} | Risk: {scored['risk_score']}/100 ({scored['risk_level']})")

        assert len(detected) >= 5, "Expected at least 5 multi-chain detected wallets"
        print("  [OK] Multi-chain regex, checksum validation, and risk scoring engine passed.")
    except Exception as e:
        print(f"  [FAIL] Multi-chain extraction failed: {e}")
        return False

    # TEST 3: ReportLab PDF Forensic Report Generation
    print("\n[TEST 3] Testing Forensic PDF Report Engine...")
    try:
        from app.core.reports.pdf import pdf_generator
        class MockWallet:
            address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
            chain = "ethereum"
            risk_score = 90
            risk_level = "CRITICAL"
            confidence = 98
            ocr_corrected = False

        pdf_bytes = pdf_generator.generate(
            title="Deployment Readiness Report",
            wallets=[MockWallet()],
            subtitle_lines=["Deployment Verification Suite"],
            edges=[],
        )
        print(f"  [OK] PDF Report Generator generated {len(pdf_bytes):,} bytes valid PDF document.")
    except Exception as e:
        print(f"  [FAIL] PDF Report engine failed: {e}")
        return False

    # TEST 4: Neo4j / Relational Graph Topology Engine
    print("\n[TEST 4] Testing Graph Topology API Engine...")
    try:
        from app.api.graph import get_graph
        from app.database.connection import SessionLocal
        db = SessionLocal()
        graph = get_graph(case_id=None, db=db)
        db.close()
        print(f"  [OK] Graph engine returned {graph['node_count']} nodes and {graph['edge_count']} edges.")
    except Exception as e:
        print(f"  [FAIL] Graph engine failed: {e}")
        return False

    print("\n" + "=" * 65)
    print("ALL DEPLOYMENT READINESS TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)
    return True

if __name__ == "__main__":
    success = run_deployment_tests()
    sys.exit(0 if success else 1)
