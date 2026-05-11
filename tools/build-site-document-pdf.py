#!/usr/bin/env python3
from __future__ import annotations

import html
import json
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
EXPORTS = ROOT / "exports"
OUTPUT = EXPORTS / "david-landau-site-complet.pdf"

DARK = colors.HexColor("#11161c")
INK = colors.HexColor("#222222")
MUTED = colors.HexColor("#626b73")
PAPER = colors.HexColor("#fbf7ed")
LINE = colors.HexColor("#ddd5c6")
BLUE = colors.HexColor("#bcd2e8")
COPPER = colors.HexColor("#b87948")
GREEN = colors.HexColor("#5e7a64")


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def register_fonts() -> tuple[str, str, str, str]:
    font_dir = Path("/System/Library/Fonts/Supplemental")
    fonts = {
        "DLBody": font_dir / "Arial.ttf",
        "DLBodyBold": font_dir / "Arial Bold.ttf",
        "DLBodyItalic": font_dir / "Arial Italic.ttf",
        "DLTitle": font_dir / "Times New Roman.ttf",
    }
    for name, path in fonts.items():
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
    return ("DLBody", "DLBodyBold", "DLBodyItalic", "DLTitle")


BODY_FONT, BOLD_FONT, ITALIC_FONT, TITLE_FONT = register_fonts()


STYLES = {
    "cover_eyebrow": ParagraphStyle(
        "cover_eyebrow",
        fontName=BOLD_FONT,
        fontSize=9,
        leading=12,
        textColor=BLUE,
        alignment=TA_CENTER,
        uppercase=True,
        spaceAfter=8,
    ),
    "cover_title": ParagraphStyle(
        "cover_title",
        fontName=TITLE_FONT,
        fontSize=34,
        leading=38,
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceAfter=12,
    ),
    "cover_subtitle": ParagraphStyle(
        "cover_subtitle",
        fontName=BODY_FONT,
        fontSize=12,
        leading=18,
        textColor=colors.HexColor("#e7dfd1"),
        alignment=TA_CENTER,
    ),
    "eyebrow": ParagraphStyle(
        "eyebrow",
        fontName=BOLD_FONT,
        fontSize=8,
        leading=10,
        textColor=COPPER,
        spaceAfter=7,
    ),
    "h1": ParagraphStyle(
        "h1",
        fontName=TITLE_FONT,
        fontSize=24,
        leading=29,
        textColor=DARK,
        spaceAfter=10,
    ),
    "h2": ParagraphStyle(
        "h2",
        fontName=BOLD_FONT,
        fontSize=14,
        leading=18,
        textColor=DARK,
        spaceBefore=10,
        spaceAfter=6,
    ),
    "h3": ParagraphStyle(
        "h3",
        fontName=BOLD_FONT,
        fontSize=11.5,
        leading=15,
        textColor=DARK,
        spaceAfter=4,
    ),
    "body": ParagraphStyle(
        "body",
        fontName=BODY_FONT,
        fontSize=9.6,
        leading=14.2,
        textColor=INK,
        spaceAfter=7,
    ),
    "small": ParagraphStyle(
        "small",
        fontName=BODY_FONT,
        fontSize=8.2,
        leading=11.2,
        textColor=MUTED,
    ),
    "quote": ParagraphStyle(
        "quote",
        fontName=ITALIC_FONT,
        fontSize=12,
        leading=17,
        textColor=DARK,
        leftIndent=12,
        rightIndent=12,
        spaceBefore=8,
        spaceAfter=4,
    ),
    "article_title": ParagraphStyle(
        "article_title",
        fontName=TITLE_FONT,
        fontSize=22,
        leading=27,
        textColor=DARK,
        spaceAfter=6,
    ),
    "toc": ParagraphStyle(
        "toc",
        fontName=BODY_FONT,
        fontSize=9.5,
        leading=14,
        textColor=INK,
        leftIndent=10,
    ),
}


def safe(text: object) -> str:
    return html.escape(str(text or ""), quote=False).replace("\n", "<br/>")


def p(text: object, style: str = "body") -> Paragraph:
    return Paragraph(safe(text), STYLES[style])


def pill(text: object) -> Paragraph:
    return Paragraph(safe(text), STYLES["small"])


def add_section(story: list, eyebrow: str, title: str, lede: str | None = None) -> None:
    story.append(PageBreak())
    story.append(p(eyebrow.upper(), "eyebrow"))
    story.append(p(title, "h1"))
    if lede:
        story.append(p(lede, "body"))
        story.append(Spacer(1, 4 * mm))


def add_cards(story: list, cards: list[tuple[str, str]], columns: int = 2) -> None:
    rows = []
    row = []
    for title, body in cards:
        cell = [
            p(title, "h3"),
            p(body, "small"),
        ]
        row.append(cell)
        if len(row) == columns:
            rows.append(row)
            row = []
    if row:
        while len(row) < columns:
            row.append("")
        rows.append(row)

    widths = [(A4[0] - 38 * mm) / columns for _ in range(columns)]
    table = Table(rows, colWidths=widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffaf1")),
                ("BOX", (0, 0), (-1, -1), 0.45, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 6 * mm))


def add_bullets(story: list, items: list[str]) -> None:
    flowable = ListFlowable(
        [ListItem(p(item, "body"), leftIndent=6) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=14,
        bulletFontName=BOLD_FONT,
        bulletFontSize=6,
        bulletColor=COPPER,
    )
    story.append(flowable)
    story.append(Spacer(1, 2 * mm))


def add_article_body(story: list, blocks: list[dict]) -> None:
    for block in blocks:
        kind = block.get("type")
        if kind == "h2":
            story.append(p(block.get("text", ""), "h2"))
        elif kind == "ul":
            add_bullets(story, block.get("items", []))
        else:
            story.append(p(block.get("text", ""), "body"))


def month_fr(value: str) -> str:
    months = {
        "01": "janvier",
        "02": "février",
        "03": "mars",
        "04": "avril",
        "05": "mai",
        "06": "juin",
        "07": "juillet",
        "08": "août",
        "09": "septembre",
        "10": "octobre",
        "11": "novembre",
        "12": "décembre",
    }
    try:
        year, month, day = value.split("-")
        return f"{int(day)} {months.get(month, month)} {year}"
    except ValueError:
        return value


def footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.35)
    canvas.line(doc.leftMargin, 13 * mm, A4[0] - doc.rightMargin, 13 * mm)
    canvas.setFont(BODY_FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 8 * mm, "David Landau — Le décodeur de la chaîne alimentaire")
    canvas.drawRightString(A4[0] - doc.rightMargin, 8 * mm, str(canvas.getPageNumber()))
    canvas.restoreState()


def add_cover(story: list, generated_on: str) -> None:
    cover_box = Table(
        [
            [
                [
                    p("DOCUMENT DE REVUE DU SITE", "cover_eyebrow"),
                    p("DAVID LANDAU", "cover_title"),
                    p("Le décodeur de la chaîne alimentaire", "cover_subtitle"),
                    Spacer(1, 12 * mm),
                    p(
                        "Pages publiques, offres, veille, actualités, articles multilingues et contact.",
                        "cover_subtitle",
                    ),
                    Spacer(1, 10 * mm),
                    p(f"Généré le {generated_on}", "cover_subtitle"),
                ]
            ]
        ],
        colWidths=[A4[0] - 38 * mm],
        rowHeights=[155 * mm],
    )
    cover_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#2a3138")),
                ("LEFTPADDING", (0, 0), (-1, -1), 20),
                ("RIGHTPADDING", (0, 0), (-1, -1), 20),
                ("TOPPADDING", (0, 0), (-1, -1), 35),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 25),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(Spacer(1, 18 * mm))
    story.append(cover_box)
    story.append(PageBreak())


def build_pdf() -> Path:
    EXPORTS.mkdir(parents=True, exist_ok=True)
    translations = load_json(DATA / "translations.json")
    tr = translations["fr"]
    articles = load_json(DATA / "articles.json")["articles"]
    feeds = load_json(DATA / "feeds.json")["categories"]

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=19 * mm,
        leftMargin=19 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="David Landau — Site complet",
        author="David Landau",
    )

    story = []
    generated_on = date.today().strftime("%d/%m/%Y")
    add_cover(story, generated_on)

    story.append(p("Sommaire", "h1"))
    toc_items = [
        "Accueil — proposition de valeur et entonnoir à leads",
        "BIO — le fils du vendeur d'épices",
        "Veille — radar RSS et sources suivies",
        "Services — leviers d'accompagnement",
        "Actualités — index des analyses",
        "Articles — versions FR, UK et NL",
        "Contact — diagnostic stratégique et coordonnées",
    ]
    for item in toc_items:
        story.append(p(f"• {item}", "toc"))
    story.append(Spacer(1, 8 * mm))
    story.append(p("Ce document rassemble les contenus publics du site sous une forme imprimable. Les animations, interactions 3D et transitions restent disponibles dans la version web.", "body"))

    add_section(
        story,
        tr["hero.eyebrow"],
        f"{tr['hero.title.1']} {tr['hero.title.2']}",
        tr["hero.lede"],
    )
    add_cards(
        story,
        [
            (f"1998 — {tr['proof.fit']}", "Food Ingredients Technologies devient le socle entrepreneurial et terrain du parcours."),
            (f"30+ — {tr['proof.years']}", "Une lecture construite par l'expérience des ingrédients, de la transformation et du marché B2B."),
            (tr["proof.scope"], "Une vision européenne de la chaîne alimentaire, de l'ingrédient au client final."),
        ],
        columns=3,
    )
    story.append(p(tr["offer.eyebrow"], "eyebrow"))
    story.append(p(tr["offer.title"], "h2"))
    story.append(p(tr["offer.lede"], "body"))
    add_cards(
        story,
        [
            (tr["offer.card1.title"], tr["offer.card1.body"]),
            (tr["offer.card2.title"], tr["offer.card2.body"]),
            (tr["offer.card3.title"], tr["offer.card3.body"]),
        ],
        columns=3,
    )
    story.append(p(tr["services.eyebrow"], "eyebrow"))
    story.append(p(tr["services.title"], "h2"))
    story.append(p(tr["services.lede"], "body"))
    add_cards(
        story,
        [
            (tr["funnel.offer1.title"], tr["funnel.offer1.body"]),
            (tr["funnel.offer2.title"], tr["funnel.offer2.body"]),
            (tr["funnel.offer3.title"], tr["funnel.offer3.body"]),
        ],
    )
    story.append(p(tr["diagnostic.eyebrow"], "eyebrow"))
    story.append(p(tr["diagnostic.title"], "h2"))
    story.append(p(tr["diagnostic.lede"], "body"))

    add_section(story, tr["about.eyebrow"], tr["about.title"], tr["bio.page.lede"])
    add_cards(
        story,
        [
            (tr["bio.snapshot1.label"], tr["bio.snapshot1.value"]),
            (tr["bio.snapshot2.label"], tr["bio.snapshot2.value"]),
            (tr["bio.snapshot3.label"], tr["bio.snapshot3.value"]),
        ],
        columns=3,
    )
    for key in ["bio.p1", "bio.p2", "bio.p3"]:
        story.append(p(tr[key], "body"))
    story.append(p(f"“{tr['bio.quote1']}”", "quote"))
    story.append(p(tr["bio.quote1.author"], "small"))
    for key in ["bio.p4", "bio.p5", "bio.p6"]:
        story.append(p(tr[key], "body"))
    story.append(p(f"“{tr['bio.quote2']}”", "quote"))
    story.append(p(tr["bio.quote2.author"], "small"))
    for key in ["bio.p7", "bio.p8"]:
        story.append(p(tr[key], "body"))
    story.append(p(tr["about.mantras_eyebrow"], "eyebrow"))
    story.append(p(tr["about.mantras_title"], "h2"))
    add_cards(
        story,
        [
            (tr["about.mantra1.name"], f"{tr['about.mantra1.role']} — {tr['about.mantra1.quote']}"),
            (tr["about.mantra2.name"], f"{tr['about.mantra2.role']} — {tr['about.mantra2.quote']}"),
            (tr["about.mantra3.name"], f"{tr['about.mantra3.role']} — {tr['about.mantra3.quote']}"),
        ],
        columns=3,
    )

    add_section(story, tr["watch.eyebrow"], tr["watch.title"], tr["watch.lede"])
    story.append(p("Fonction utile pour les visiteurs : un radar éditorial alimenté par RSS et Google News, filtré par catégories métiers.", "body"))
    for key, category in feeds.items():
        story.append(p(category["label_fr"], "h2"))
        story.append(p(category["intro_fr"], "body"))
        add_bullets(story, [feed["name"] for feed in category.get("feeds", [])])

    add_section(story, tr["services.eyebrow"], tr["services.title"], tr["services.lede"])
    add_cards(
        story,
        [
            (tr["services.s1.title"], tr["services.s1.body"]),
            (tr["services.s2.title"], tr["services.s2.body"]),
            (tr["services.s3.title"], tr["services.s3.body"]),
            (tr["services.s4.title"], tr["services.s4.body"]),
            (tr["services.s5.title"], tr["services.s5.body"]),
        ],
    )

    add_section(story, tr["news.eyebrow"], tr["news.title"], tr["news.lede"])
    news_cards = []
    for article in articles:
        meta = f"{article['category']['fr']} — {month_fr(article['date'])}"
        news_cards.append((article["title"]["fr"], f"{meta}\n\n{article['excerpt']['fr']}\n\nDisponible en FR · UK · NL"))
    add_cards(story, news_cards)

    language_labels = {"fr": "FR", "en": "UK", "nl": "NL"}
    for article in articles:
        for lang in ["fr", "en", "nl"]:
            add_section(
                story,
                f"ARTICLE · {language_labels[lang]} · {article['category'][lang]} · {month_fr(article['date'])}",
                article["title"][lang],
                article["excerpt"][lang],
            )
            add_article_body(story, article["body"][lang])

    add_section(story, tr["contact.eyebrow"], tr["contact.title"], tr["contact.lede"])
    add_cards(
        story,
        [
            ("Email professionnel", "david@davidmlandau.com"),
            ("Téléphone", "+32 475 255308"),
            ("LinkedIn", "linkedin.com/in/davidmlandau"),
            ("Facebook", "facebook.com/profile.php?id=61579569972920"),
            ("Instagram", "instagram.com/david_landau55"),
            ("X", "x.com/david_landau55"),
        ],
    )
    story.append(p(tr["contact.form"], "h2"))
    add_bullets(
        story,
        [
            f"{tr['contact.firstname']} / {tr['contact.lastname']}",
            tr["contact.email"],
            tr["contact.company"],
            tr["contact.phone"],
            tr["contact.sector"],
            tr["contact.subject"],
            tr["contact.timeline"],
            tr["contact.message"],
        ],
    )
    story.append(p(tr["contact.note"], "small"))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return OUTPUT


if __name__ == "__main__":
    print(build_pdf())
