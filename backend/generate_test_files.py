import os
from PIL import Image, ImageDraw

output_dir = "test_files"
os.makedirs(output_dir, exist_ok=True)

print("==================================================")
print("Generating Gatekeeper OSINT Test Files...")
print("==================================================")

# 1. IMG-01: Multi-Chain PNG
img1 = Image.new('RGB', (800, 300), color=(255, 255, 255))
d1 = ImageDraw.Draw(img1)
text1 = """SUSPECT PAYMENT DETAILS
ETH: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F
BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
SOL: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"""
d1.text((20, 20), text1, fill=(0, 0, 0))
img1.save(os.path.join(output_dir, "test_img_01_multichain.png"))
print(" [OK] Created test_img_01_multichain.png")

# 2. IMG-02: Dark Mode Chat Screenshot
img2 = Image.new('RGB', (800, 300), color=(24, 24, 24))
d2 = ImageDraw.Draw(img2)
text2 = """[14:22] ScammerAdmin: Payment Info
TRX: TN3W4H6rDhTFAWEmyMs9BLgPUtxKs15w6w
DOGE: DJvX9jL1K3aW2dD3B6Z8jM2B7c8v4N1k5m"""
d2.text((20, 20), text2, fill=(255, 255, 255))
img2.save(os.path.join(output_dir, "test_img_02_darkmode.png"))
print(" [OK] Created test_img_02_darkmode.png")

# 3. IMG-03: OCR Misread Typo Test
img3 = Image.new('RGB', (800, 200), color=(255, 255, 255))
d3 = ImageDraw.Draw(img3)
text3 = """Deposit ETH here:
Ox71C7656EC7ab88b098defB751B7401B5f6d8976F"""
d3.text((20, 20), text3, fill=(0, 0, 0))
img3.save(os.path.join(output_dir, "test_img_03_eth_ocr_typo.png"))
print(" [OK] Created test_img_03_eth_ocr_typo.png")

# 4. OSINT-01: Full Target Profile Card
img4 = Image.new('RGB', (800, 350), color=(255, 255, 255))
d4 = ImageDraw.Draw(img4)
text4 = """TARGET PROFILE: JOHN DOE
Telegram: @john_doe_crypto
Email: john.doe@cyber-fraud.com
Phone: +92-300-9876543
Website: https://cyber-fraud.com

Bitcoin: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
Ethereum: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F"""
d4.text((20, 20), text4, fill=(0, 0, 0))
img4.save(os.path.join(output_dir, "test_osint_01_full_correlation.png"))
print(" [OK] Created test_osint_01_full_correlation.png")

# 5. EDGE-01: Zero-Byte Empty File
with open(os.path.join(output_dir, "test_edge_01_empty.png"), "wb") as f:
    f.write(b"")
print(" [OK] Created test_edge_01_empty.png")

# 6. EDGE-02: Corrupted PDF File
with open(os.path.join(output_dir, "test_edge_02_corrupt.pdf"), "w") as f:
    f.write("CORRUPTED_PDF_INVALID_DATA_STREAM")
print(" [OK] Created test_edge_02_corrupt.pdf")

# 7. QR Code Generation
try:
    import qrcode
    qr = qrcode.make("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.5")
    qr.save(os.path.join(output_dir, "test_qr_01_btc_uri.png"))
    print(" [OK] Created test_qr_01_btc_uri.png")
except Exception as e:
    print(f" [!] QR code generation skipped: {e}")

# 8. PDF Generation
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    pdf_path = os.path.join(output_dir, "test_pdf_02_multipage_dossier.pdf")
    c = canvas.Canvas(pdf_path, pagesize=letter)
    
    # Page 1
    c.drawString(100, 700, "CASE DOSSIER #2026-X")
    c.drawString(100, 680, "Target Overview and Initial Findings.")
    c.showPage()
    
    # Page 2
    c.drawString(100, 700, "FINANCIAL ASSETS (BITCOIN)")
    c.drawString(100, 680, "Primary Treasury: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
    c.showPage()
    
    # Page 3
    c.drawString(100, 700, "SECONDARY ASSETS & TELEGRAM")
    c.drawString(100, 680, "Ethereum Vault: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
    c.drawString(100, 660, "Operator Telegram: @dark_operator_x")
    c.showPage()
    
    # Page 4
    c.drawString(100, 700, "CONTACT & INFRASTRUCTURE")
    c.drawString(100, 680, "Email: admin@darknet-market.org")
    c.drawString(100, 660, "Phone: +1-202-555-0143")
    c.drawString(100, 640, "Website: https://darknet-market.org")
    c.save()
    print(" [OK] Created test_pdf_02_multipage_dossier.pdf")
except Exception as e:
    print(f" [!] PDF generation skipped: {e}")

print("==================================================")
print(f"SUCCESS: All test files are located in:")
print(f" {os.path.abspath(output_dir)}")
print("==================================================")
