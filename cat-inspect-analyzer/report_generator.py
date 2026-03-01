import json
import os
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, Image, HRFlowable
)

SEVERITY_COLORS = {
    "Critical": colors.HexColor("#C00000"),
    "High":     colors.HexColor("#E26B0A"),
    "Medium":   colors.HexColor("#E6A817"),
    "Low":      colors.HexColor("#375623"),
}

CONDITION_COLORS = {
    "Good":     colors.HexColor("#375623"),
    "Fair":     colors.HexColor("#E6A817"),
    "Poor":     colors.HexColor("#E26B0A"),
    "Critical": colors.HexColor("#C00000"),
}

PRIORITY_COLORS = {
    "Routine":   colors.HexColor("#375623"),
    "Urgent":    colors.HexColor("#E26B0A"),
    "Emergency": colors.HexColor("#C00000"),
}


def get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", fontSize=22, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1F3864"), spaceAfter=6))
    styles.add(ParagraphStyle(name="SectionHeader", fontSize=13, fontName="Helvetica-Bold",
        textColor=colors.white, spaceAfter=4))
    styles.add(ParagraphStyle(name="BodyText2", fontSize=10, fontName="Helvetica",
        textColor=colors.HexColor("#333333"), spaceAfter=4))
    styles.add(ParagraphStyle(name="SmallText", fontSize=8, fontName="Helvetica",
        textColor=colors.HexColor("#666666")))
    return styles


def colored_section(title, color=colors.HexColor("#1F3864"), width=7.5*inch):
    data = [[Paragraph(f"  {title}", ParagraphStyle(
        name="tmp", fontSize=12, fontName="Helvetica-Bold", textColor=colors.white
    ))]]
    t = Table(data, colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), color),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
    ]))
    return t


def generate_pdf_report(result, output_dir="reports"):
    styles = get_styles()
    analysis = result["analysis"]
    image_name = Path(result["image"]).stem
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    output_path = Path(output_dir) / f"{image_name}_report.pdf"
    doc = SimpleDocTemplate(
        str(output_path), pagesize=letter,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        topMargin=0.75*inch,  bottomMargin=0.75*inch
    )

    story = []

    # ── HEADER ───────────────────────────────────────────────────────────────
    story.append(Paragraph("CAT Equipment Inspection Report", styles["ReportTitle"]))
    story.append(Paragraph(
        f"<font color='#888888'>Image: {result['image']}  |  Generated: {timestamp}</font>",
        styles["SmallText"]
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1F3864")))
    story.append(Spacer(1, 10))

    # ── SUMMARY BAR ──────────────────────────────────────────────────────────
    condition = analysis.get("overall_condition", "N/A")
    score     = analysis.get("overall_score", "N/A")
    priority  = analysis.get("estimated_repair_priority", "N/A")
    cond_color = CONDITION_COLORS.get(condition, colors.gray)
    pri_color  = PRIORITY_COLORS.get(priority, colors.gray)

    summary_data = [[
        Paragraph(f"<b>Condition</b><br/>{condition}", styles["BodyText2"]),
        Paragraph(f"<b>Score</b><br/>{score} / 10", styles["BodyText2"]),
        Paragraph(f"<b>Repair Priority</b><br/>{priority}", styles["BodyText2"]),
        Paragraph(f"<b>Errors Found</b><br/>{len(analysis.get('errors_found', []))}", styles["BodyText2"]),
    ]]
    summary_table = Table(summary_data, colWidths=[1.875*inch]*4)
    summary_table.setStyle(TableStyle([
        ("BOX",           (0,0), (-1,-1), 1, colors.HexColor("#CCCCCC")),
        ("INNERGRID",     (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
        ("BACKGROUND",    (0,0), (0,0), cond_color),
        ("BACKGROUND",    (2,0), (2,0), pri_color),
        ("TEXTCOLOR",     (0,0), (0,0), colors.white),
        ("TEXTCOLOR",     (2,0), (2,0), colors.white),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # ── INSPECTION SUMMARY ────────────────────────────────────────────────────
    story.append(colored_section("Inspection Summary"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(analysis.get("inspection_summary", "N/A"), styles["BodyText2"]))
    story.append(Spacer(1, 14))

    # ── ERRORS FOUND ─────────────────────────────────────────────────────────
    story.append(colored_section("Errors Found", color=colors.HexColor("#C00000")))
    story.append(Spacer(1, 6))

    errors = analysis.get("errors_found", [])
    if not errors:
        story.append(Paragraph("No errors detected.", styles["BodyText2"]))
    else:
        header = [["ID", "Severity", "Category", "Description", "Location", "Action", "Urgency"]]
        rows = [[
            e.get("error_id", ""),
            e.get("severity", ""),
            e.get("category", ""),
            Paragraph(e.get("description", ""), styles["SmallText"]),
            Paragraph(e.get("location", ""), styles["SmallText"]),
            Paragraph(e.get("recommended_action", ""), styles["SmallText"]),
            e.get("urgency", ""),
        ] for e in errors]

        error_table = Table(
            header + rows,
            colWidths=[0.6*inch, 0.7*inch, 0.8*inch, 1.6*inch, 1.0*inch, 1.4*inch, 1.1*inch]
        )
        ts = TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), colors.HexColor("#1F3864")),
            ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
            ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 8),
            ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
            ("INNERGRID",     (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, colors.HexColor("#F5F5F5")]),
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ])
        for i, error in enumerate(errors):
            sev_color = SEVERITY_COLORS.get(error.get("severity", ""), colors.gray)
            ts.add("BACKGROUND", (1, i+1), (1, i+1), sev_color)
            ts.add("TEXTCOLOR",  (1, i+1), (1, i+1), colors.white)
            ts.add("FONTNAME",   (1, i+1), (1, i+1), "Helvetica-Bold")
        error_table.setStyle(ts)
        story.append(error_table)

    story.append(Spacer(1, 14))

    # ── POSITIVE OBSERVATIONS ────────────────────────────────────────────────
    story.append(colored_section("Positive Observations", color=colors.HexColor("#375623")))
    story.append(Spacer(1, 6))
    for obs in analysis.get("positive_observations", []):
        story.append(Paragraph(f"• {obs}", styles["BodyText2"]))
    story.append(Spacer(1, 14))

    # ── FOLLOW-UP NOTES ──────────────────────────────────────────────────────
    if analysis.get("follow_up_recommended"):
        story.append(colored_section("Follow-Up Recommended", color=colors.HexColor("#E26B0A")))
        story.append(Spacer(1, 6))
        story.append(Paragraph(analysis.get("follow_up_notes", ""), styles["BodyText2"]))
        story.append(Spacer(1, 14))

    # ── ORIGINAL IMAGE ───────────────────────────────────────────────────────
    story.append(colored_section("Inspected Image"))
    story.append(Spacer(1, 8))
    try:
        img = Image(result["image_path"], width=4*inch, height=3*inch, kind="proportional")
        story.append(img)
    except Exception:
        story.append(Paragraph("(Image could not be embedded)", styles["SmallText"]))

    doc.build(story)
    print(f"  ✅ PDF saved: {output_path}")
    return str(output_path)