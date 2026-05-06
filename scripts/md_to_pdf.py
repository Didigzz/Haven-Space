#!/usr/bin/env python3
"""
md_to_pdf.py — Convert a Markdown file to a styled PDF.

Usage:
    python scripts/md_to_pdf.py <input.md> [output.pdf]

Examples:
    python scripts/md_to_pdf.py MANUAL.md
    python scripts/md_to_pdf.py MANUAL.md docs/manual.pdf

If no output path is given, the PDF is saved next to the input file
with the same name and a .pdf extension.

Dependencies (install once):
    pip install markdown reportlab
"""

import sys
import os
import re
import html as html_module
import markdown
from io import StringIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Preformatted,
    Table,
    TableStyle,
    HRFlowable,
    ListFlowable,
    ListItem,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
C_BLACK      = colors.HexColor("#1a1a1a")
C_HEADING1   = colors.HexColor("#111111")
C_HEADING2   = colors.HexColor("#1e293b")
C_HEADING3   = colors.HexColor("#334155")
C_CODE_BG    = colors.HexColor("#f3f4f6")
C_CODE_FG    = colors.HexColor("#c0392b")
C_BORDER     = colors.HexColor("#d1d5db")
C_TH_BG      = colors.HexColor("#1e293b")
C_TH_FG      = colors.white
C_TR_ALT     = colors.HexColor("#f8fafc")
C_LINK       = colors.HexColor("#2563eb")
C_BLOCKQUOTE = colors.HexColor("#6b7280")
C_CODE_BORDER= colors.HexColor("#2563eb")

PAGE_W, PAGE_H = A4
MARGIN = 2.2 * cm


def build_styles():
    base = getSampleStyleSheet()

    def s(name, **kw):
        return ParagraphStyle(name, **kw)

    normal = s(
        "hs_normal",
        fontName="Helvetica",
        fontSize=10.5,
        leading=16,
        textColor=C_BLACK,
        spaceAfter=6,
    )
    h1 = s(
        "hs_h1",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=26,
        textColor=C_HEADING1,
        spaceBefore=4,
        spaceAfter=10,
        borderPadding=(0, 0, 4, 0),
    )
    h2 = s(
        "hs_h2",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=20,
        textColor=C_HEADING2,
        spaceBefore=18,
        spaceAfter=6,
    )
    h3 = s(
        "hs_h3",
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=16,
        textColor=C_HEADING3,
        spaceBefore=12,
        spaceAfter=4,
    )
    h4 = s(
        "hs_h4",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=15,
        textColor=C_HEADING3,
        spaceBefore=8,
        spaceAfter=3,
    )
    code_inline = s(
        "hs_code_inline",
        fontName="Courier",
        fontSize=9,
        leading=13,
        textColor=C_CODE_FG,
        backColor=C_CODE_BG,
    )
    blockquote = s(
        "hs_blockquote",
        fontName="Helvetica-Oblique",
        fontSize=10,
        leading=15,
        textColor=C_BLOCKQUOTE,
        leftIndent=14,
        spaceAfter=6,
    )
    table_header = s(
        "hs_th",
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=C_TH_FG,
    )
    table_cell = s(
        "hs_td",
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=C_BLACK,
    )
    list_item = s(
        "hs_li",
        fontName="Helvetica",
        fontSize=10.5,
        leading=16,
        textColor=C_BLACK,
    )

    return {
        "normal": normal,
        "h1": h1,
        "h2": h2,
        "h3": h3,
        "h4": h4,
        "code_inline": code_inline,
        "blockquote": blockquote,
        "th": table_header,
        "td": table_cell,
        "li": list_item,
    }


# ---------------------------------------------------------------------------
# Inline markup helpers
# ---------------------------------------------------------------------------
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
BOLD_RE        = re.compile(r"\*\*(.+?)\*\*|__(.+?)__")
ITALIC_RE      = re.compile(r"\*(.+?)\*|_(.+?)_")
LINK_RE        = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
STRIKE_RE      = re.compile(r"~~(.+?)~~")


def inline_to_rl(text: str) -> str:
    """Convert inline Markdown to ReportLab XML markup."""
    # Escape XML special chars first (except we'll re-add our tags)
    text = html_module.escape(text, quote=False)
    # Links
    text = LINK_RE.sub(
        lambda m: f'<link href="{m.group(2)}" color="{C_LINK.hexval()}">{m.group(1)}</link>',
        text,
    )
    # Inline code (must come before bold/italic to avoid mangling backticks)
    text = INLINE_CODE_RE.sub(
        lambda m: f'<font name="Courier" color="{C_CODE_FG.hexval()}">{m.group(1)}</font>',
        text,
    )
    # Bold
    text = BOLD_RE.sub(lambda m: f"<b>{m.group(1) or m.group(2)}</b>", text)
    # Italic
    text = ITALIC_RE.sub(lambda m: f"<i>{m.group(1) or m.group(2)}</i>", text)
    # Strikethrough (ReportLab doesn't support <s> natively, render as dim)
    text = STRIKE_RE.sub(lambda m: f'<font color="#9ca3af">{m.group(1)}</font>', text)
    return text


# ---------------------------------------------------------------------------
# Markdown → token list parser
# ---------------------------------------------------------------------------

def parse_md(md_text: str):
    """
    Very lightweight line-by-line parser that produces a list of tokens:
        ("h1"|"h2"|"h3"|"h4"|"h5"|"h6", text)
        ("p", text)
        ("code_block", language, code_text)
        ("blockquote", text)
        ("hr",)
        ("table", [[cell, ...], ...], has_header)
        ("ul", [item_text, ...])
        ("ol", [item_text, ...])
    """
    tokens = []
    lines = md_text.splitlines()
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]

        # Fenced code block
        if line.strip().startswith("```"):
            lang = line.strip()[3:].strip()
            code_lines = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            tokens.append(("code_block", lang, "\n".join(code_lines)))
            i += 1
            continue

        # Horizontal rule
        if re.match(r"^(\*{3,}|-{3,}|_{3,})\s*$", line):
            tokens.append(("hr",))
            i += 1
            continue

        # ATX headings
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            level = len(m.group(1))
            tokens.append((f"h{level}", m.group(2).strip()))
            i += 1
            continue

        # Blockquote
        if line.startswith(">"):
            bq_lines = []
            while i < n and lines[i].startswith(">"):
                bq_lines.append(lines[i].lstrip("> ").strip())
                i += 1
            tokens.append(("blockquote", " ".join(bq_lines)))
            continue

        # Unordered list
        if re.match(r"^(\s*[-*+])\s+", line):
            items = []
            while i < n and re.match(r"^(\s*[-*+])\s+", lines[i]):
                items.append(re.sub(r"^\s*[-*+]\s+", "", lines[i]))
                i += 1
            tokens.append(("ul", items))
            continue

        # Ordered list
        if re.match(r"^\s*\d+\.\s+", line):
            items = []
            while i < n and re.match(r"^\s*\d+\.\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+\.\s+", "", lines[i]))
                i += 1
            tokens.append(("ol", items))
            continue

        # Table (GFM)
        if "|" in line:
            table_lines = []
            while i < n and "|" in lines[i]:
                table_lines.append(lines[i])
                i += 1
            # Filter out separator rows (---|---)
            rows = []
            has_header = False
            for idx, tl in enumerate(table_lines):
                if re.match(r"^\s*\|?[\s\-:]+\|", tl):
                    has_header = idx == 1
                    continue
                cells = [c.strip() for c in tl.strip().strip("|").split("|")]
                rows.append(cells)
            if rows:
                tokens.append(("table", rows, has_header))
            continue

        # Blank line
        if line.strip() == "":
            i += 1
            continue

        # Paragraph — collect until blank line or block element
        para_lines = []
        while i < n and lines[i].strip() != "" and not re.match(
            r"^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+\.\s|\|)", lines[i]
        ):
            para_lines.append(lines[i].strip())
            i += 1
        if para_lines:
            tokens.append(("p", " ".join(para_lines)))

    return tokens


# ---------------------------------------------------------------------------
# Token → ReportLab flowables
# ---------------------------------------------------------------------------

def tokens_to_flowables(tokens, styles):
    flowables = []

    for token in tokens:
        kind = token[0]

        if kind in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = int(kind[1])
            text = inline_to_rl(token[1])
            style_key = kind if kind in styles else "h4"
            flowables.append(Paragraph(text, styles[style_key]))
            if level <= 2:
                flowables.append(
                    HRFlowable(
                        width="100%",
                        thickness=1 if level == 1 else 0.5,
                        color=C_BORDER,
                        spaceAfter=4,
                    )
                )

        elif kind == "p":
            text = inline_to_rl(token[1])
            flowables.append(Paragraph(text, styles["normal"]))

        elif kind == "code_block":
            _, lang, code = token
            # Preserve indentation; escape XML
            safe_code = html_module.escape(code)
            flowables.append(Spacer(1, 4))
            pre = Preformatted(
                safe_code,
                ParagraphStyle(
                    "hs_pre",
                    fontName="Courier",
                    fontSize=8.5,
                    leading=13,
                    textColor=C_BLACK,
                    backColor=C_CODE_BG,
                    borderColor=C_CODE_BORDER,
                    borderWidth=0,
                    leftIndent=10,
                    rightIndent=10,
                    spaceBefore=6,
                    spaceAfter=6,
                    borderPadding=8,
                ),
            )
            flowables.append(pre)
            flowables.append(Spacer(1, 4))

        elif kind == "blockquote":
            text = inline_to_rl(token[1])
            flowables.append(Paragraph(text, styles["blockquote"]))

        elif kind == "hr":
            flowables.append(Spacer(1, 6))
            flowables.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
            flowables.append(Spacer(1, 6))

        elif kind == "table":
            _, rows, has_header = token
            if not rows:
                continue

            # Normalize column count
            col_count = max(len(r) for r in rows)
            norm_rows = [r + [""] * (col_count - len(r)) for r in rows]

            # Build cell paragraphs
            table_data = []
            for ridx, row in enumerate(norm_rows):
                style = styles["th"] if (has_header and ridx == 0) else styles["td"]
                table_data.append([Paragraph(inline_to_rl(c), style) for c in row])

            col_width = (PAGE_W - 2 * MARGIN) / col_count
            tbl = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)

            ts = [
                ("BACKGROUND", (0, 0), (-1, 0 if has_header else -1), C_TH_BG if has_header else C_CODE_BG),
                ("TEXTCOLOR", (0, 0), (-1, 0), C_TH_FG if has_header else C_BLACK),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, C_TR_ALT]),
                ("GRID", (0, 0), (-1, -1), 0.4, C_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
            tbl.setStyle(TableStyle(ts))
            flowables.append(tbl)
            flowables.append(Spacer(1, 8))

        elif kind in ("ul", "ol"):
            _, items = token
            list_items = [
                ListItem(
                    Paragraph(inline_to_rl(item), styles["li"]),
                    leftIndent=18,
                    bulletColor=C_BLACK,
                )
                for item in items
            ]
            bullet = "bullet" if kind == "ul" else "1"
            flowables.append(
                ListFlowable(
                    list_items,
                    bulletType=bullet,
                    leftIndent=18,
                    bulletFontSize=10,
                    bulletColor=C_BLACK,
                    spaceAfter=6,
                )
            )

    return flowables


# ---------------------------------------------------------------------------
# Main conversion
# ---------------------------------------------------------------------------

def convert(input_path: str, output_path: str) -> None:
    if not os.path.isfile(input_path):
        print(f"Error: file not found — {input_path}")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    styles = build_styles()
    tokens = parse_md(md_text)
    flowables = tokens_to_flowables(tokens, styles)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=os.path.splitext(os.path.basename(input_path))[0],
    )
    doc.build(flowables)
    print(f"✓ PDF saved to: {output_path}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) >= 3 else os.path.splitext(input_path)[0] + ".pdf"

    print(f"Converting: {input_path} → {output_path}")
    convert(input_path, output_path)


if __name__ == "__main__":
    main()
