import io
import logging
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

logger = logging.getLogger(__name__)

class PDFReportGenerator:
    """
    Forensic Investigation PDF Report Generator for Gatekeeper Crypto OSINT.
    Produces formatted digital evidence and wallet attribution reports.
    """

    def generate(
        self,
        title: str,
        wallets: list,
        subtitle_lines: list = None,
        edges: list = None,
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )
        styles = getSampleStyleSheet()

        # Custom styles for cyber dark / forensic layout
        title_style = ParagraphStyle(
            "TitleStyle",
            parent=styles["Heading1"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
        )

        heading_style = ParagraphStyle(
            "HeadingStyle",
            parent=styles["Heading2"],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#1e293b"),
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6,
        )

        body_style = ParagraphStyle(
            "BodyStyle",
            parent=styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155"),
        )

        elements = []

        # Header Title
        elements.append(Paragraph("GATEKEEPER: CRYPTO OSINT INVESTIGATION REPORT", title_style))
        elements.append(Spacer(1, 4))
        elements.append(
            Paragraph(
                f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Confidential Forensic Document",
                body_style,
            )
        )
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=15))

        # Scope / Subtitle
        if subtitle_lines:
            for line in subtitle_lines:
                elements.append(Paragraph(f"<b>{line}</b>", body_style))
            elements.append(Spacer(1, 10))

        # Executive Summary Table
        elements.append(Paragraph("1. Executive Intelligence Summary", heading_style))
        high_risk_count = sum(1 for w in wallets if getattr(w, "risk_score", 0) >= 70 or (isinstance(w, dict) and w.get("risk_score", 0) >= 70))
        total_wallets = len(wallets)
        graph_edge_count = len(edges or [])

        summary_data = [
            ["Metric", "Count / Value"],
            ["Total Extracted Wallets", str(total_wallets)],
            ["High / Critical Risk Wallets", str(high_risk_count)],
            ["OSINT Graph Relationships", str(graph_edge_count)],
        ]

        t = Table(summary_data, colWidths=[250, 250])
        t.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ])
        )
        elements.append(t)
        elements.append(Spacer(1, 15))

        # Wallet Intelligence Table
        elements.append(Paragraph("2. Detected Cryptocurrency Wallets & Identity Attribution", heading_style))
        if wallets:
            w_table_data = [["Address", "Blockchain", "Risk Score", "Risk Level", "OCR Corrected"]]
            for w in wallets:
                addr = getattr(w, "address", None) or (w.get("address") if isinstance(w, dict) else str(w))
                chain = (getattr(w, "chain", None) or (w.get("chain") if isinstance(w, dict) else "unknown")).upper()
                score = getattr(w, "risk_score", None) if not isinstance(w, dict) else w.get("risk_score", 0)
                level = (getattr(w, "risk_level", None) or (w.get("risk_level") if isinstance(w, dict) else "LOW")).upper()
                corrected = "YES" if (getattr(w, "ocr_corrected", False) if not isinstance(w, dict) else w.get("ocr_corrected", False)) else "NO"

                # Truncate long address if needed
                short_addr = f"{addr[:16]}...{addr[-8:]}" if len(addr) > 30 else addr
                w_table_data.append([short_addr, chain, f"{score or 0}/100", level, corrected])

            wt = Table(w_table_data, colWidths=[180, 80, 80, 80, 80])
            wt.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ])
            )
            elements.append(wt)
        else:
            elements.append(Paragraph("No cryptocurrency wallet addresses detected in this intelligence set.", body_style))

        elements.append(Spacer(1, 20))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=10))
        elements.append(Paragraph("Gatekeeper Digital Evidence Platform — Autonomous Crypto OSINT Engine", body_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

pdf_generator = PDFReportGenerator()
