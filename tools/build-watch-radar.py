#!/usr/bin/env python3
"""Generate data/watch-radar.json and data/watch-digest.html without npm."""

from __future__ import annotations

import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parents[1]
FEEDS_PATH = SITE_ROOT / "data" / "feeds.json"
OUTPUT_PATH = SITE_ROOT / "data" / "watch-radar.json"
DIGEST_PATH = SITE_ROOT / "data" / "watch-digest.html"

MAX_ITEMS_PER_CATEGORY = 36
DIGEST_PER_CATEGORY = 4
TIMEOUT = 15

KEYWORDS = {
    "tech": [
        "precision fermentation", "fermentation de precision", "bioprocess", "extrusion",
        "automation", "robotics", "ai", "ia", "food processing", "ingredient production",
        "upcycling", "smart packaging", "packaging intelligent", "technology",
    ],
    "trends": [
        "flavor trend", "flavour trend", "taste trend", "new flavor", "new flavour",
        "nouveau gout", "tendance gout", "texture", "sensory", "blend", "melange",
        "pairing", "limited edition", "launch", "lancement",
    ],
    "aroma": [
        "regulation", "reglementation", "efsa", "fda", "fema gras", "flavouring",
        "flavoring", "substance aromatisante", "additive", "additif", "ban",
        "restriction", "compliance", "conformite",
    ],
    "ingredients": [
        "ingredient", "ingredients", "clean label", "novel food", "alternative protein",
        "proteine alternative", "fiber", "fibre", "texturant", "sweetener", "edulcorant",
        "stabilizer", "nutrition", "functionality", "supplier", "fournisseur",
    ],
    "ma": [
        "acquisition", "merger", "fusion", "divestment", "sale", "vente", "funding",
        "levee de fonds", "investment", "private equity", "buyout", "joint venture", "m&a",
    ],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def normalize(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def strip_html(value: str) -> str:
    value = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", value or "", flags=re.S)
    value = re.sub(r"<(script|style).*?</\1>", " ", value, flags=re.S | re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def text(node: ET.Element, names: tuple[str, ...]) -> str:
    for child in list(node):
        tag = child.tag.split("}", 1)[-1].lower()
        if tag in names and child.text:
            return strip_html(child.text)
    return ""


def link(node: ET.Element) -> str:
    for child in list(node):
        tag = child.tag.split("}", 1)[-1].lower()
        if tag == "link":
            href = child.attrib.get("href")
            if href:
                return html.unescape(href)
            if child.text:
                return html.unescape(child.text.strip())
    return ""


def fetch_feed(feed: dict) -> list[dict]:
    req = urllib.request.Request(
        feed["url"],
        headers={"User-Agent": "DavidLandauWatchRadar/1.1 (+https://davidmlandau.com)"},
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
        xml = response.read()

    root = ET.fromstring(xml)
    nodes = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    items = []
    for node in nodes:
        title = text(node, ("title",))
        item_link = link(node)
        pub_date = text(node, ("pubdate", "published", "updated", "date"))
        description = text(node, ("description", "summary", "encoded", "content"))
        if title and item_link:
            items.append({
                "source": feed["name"],
                "feedUrl": feed["url"],
                "title": title,
                "link": item_link,
                "pubDate": pub_date,
                "description": description[:420],
            })
    return items


def days_old(pub_date: str) -> float:
    try:
        parsed = parsedate_to_datetime(pub_date)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return max(0.0, (datetime.now(timezone.utc) - parsed.astimezone(timezone.utc)).total_seconds() / 86400)
    except Exception:
        return 30.0


def reason(category: str, matched: list[str], age: float) -> str:
    first = (
        "Signal detecte autour de " + ", ".join(matched[:3]) + "."
        if matched else
        "Signal recent repere dans les sources specialisees."
    )
    hot = " Actualite chaude." if age <= 7 else " A suivre dans la duree."
    angle = {
        "tech": " Angle technologie.",
        "trends": " Angle tendances sensorielles.",
        "aroma": " Angle regulation aromatique.",
        "ingredients": " Angle ingredients.",
        "ma": " Angle operations strategiques.",
    }.get(category, "")
    return first + hot + angle


def score_item(category: str, item: dict) -> dict:
    combined = normalize(item["title"] + " " + item.get("description", ""))
    title = normalize(item["title"])
    matched = [kw for kw in KEYWORDS[category] if normalize(kw) in combined]
    age = days_old(item.get("pubDate", ""))
    score = 36
    for keyword in matched:
        score += 10 if normalize(keyword) in title else 5
    if age <= 2:
        score += 24
    elif age <= 7:
        score += 18
    elif age <= 14:
        score += 10
    elif age <= 30:
        score += 4
    if "google news" not in item["source"].lower():
        score += 4
    if re.search(r"exclusive|launch|regulation|acquisition|merger|funding|innovation", item["title"] + " " + item.get("description", ""), re.I):
        score += 6
    return {**item, "category": category, "score": min(100, round(score)), "matchedKeywords": matched[:5], "reason": reason(category, matched, age)}


def dedupe(items: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for item in items:
        title_key = " ".join(normalize(item["title"]).split()[:12])
        link_key = item["link"].split("?", 1)[0]
        key = link_key or title_key
        if key in seen or title_key in seen:
            continue
        seen.add(key)
        seen.add(title_key)
        unique.append(item)
    return unique


def labels(category: dict) -> dict:
    return {key: category[key] for key in ("label_fr", "label_en", "label_nl", "intro_fr", "intro_en", "intro_nl")}


def build_digest(categories: dict) -> list[dict]:
    digest = []
    for key, category in categories.items():
        for item in category["items"][:DIGEST_PER_CATEGORY]:
            digest.append({
                "category": key,
                "label_fr": category["label_fr"],
                "title": item["title"],
                "source": item["source"],
                "link": item["link"],
                "pubDate": item["pubDate"],
                "score": item["score"],
                "reason": item["reason"],
            })
    return sorted(digest, key=lambda item: item["score"], reverse=True)[:12]


def digest_html(payload: dict) -> str:
    generated = datetime.fromisoformat(payload["generatedAt"].replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M UTC")
    articles = []
    for item in payload["digest"]:
        articles.append(
            f"""      <article>
        <p><strong>{html.escape(item["label_fr"])}</strong> - score {item["score"]}</p>
        <h2><a href="{html.escape(item["link"])}">{html.escape(item["title"])}</a></h2>
        <p>{html.escape(item["source"])} - {html.escape(item["reason"])}</p>
      </article>"""
        )
    body = "\n".join(articles) or "      <p>Aucun signal disponible pour cette generation.</p>"
    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Synthese Radar Veille</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #141a20; line-height: 1.55; max-width: 760px; margin: 0 auto; padding: 32px 18px; }}
    article {{ border-top: 1px solid #d8dde2; padding: 18px 0; }}
    h1, h2 {{ line-height: 1.15; }}
    h2 {{ font-size: 20px; margin: 6px 0; }}
    a {{ color: #1f4c68; }}
    p {{ margin: 0 0 8px; }}
  </style>
</head>
<body>
  <h1>Synthese Radar Veille</h1>
  <p>Generation automatique du {html.escape(generated)}.</p>
{body}
</body>
</html>
"""


def main() -> int:
    config = json.loads(FEEDS_PATH.read_text())
    categories = {}
    errors = []

    for key, category in config["categories"].items():
        fetched = []
        with ThreadPoolExecutor(max_workers=len(category["feeds"])) as pool:
            futures = {pool.submit(fetch_feed, feed): feed for feed in category["feeds"]}
            for future in as_completed(futures):
                feed = futures[future]
                try:
                    fetched.extend(future.result())
                except Exception as exc:
                    errors.append({"category": key, "feed": feed["name"], "url": feed["url"], "error": str(exc)})

        items = sorted(
            [score_item(key, item) for item in dedupe(fetched)],
            key=lambda item: (item["score"], item.get("pubDate", "")),
            reverse=True,
        )[:MAX_ITEMS_PER_CATEGORY]
        categories[key] = {
            **labels(category),
            "feeds": [{"name": feed["name"], "url": feed["url"]} for feed in category["feeds"]],
            "total": len(items),
            "items": items,
        }

    payload = {
        "generatedAt": now_iso(),
        "generatedBy": "site/tools/build-watch-radar.py",
        "totals": {
            "categories": len(categories),
            "items": sum(len(category["items"]) for category in categories.values()),
            "errors": len(errors),
        },
        "categories": categories,
        "digest": build_digest(categories),
        "errors": errors,
    }

    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    DIGEST_PATH.write_text(digest_html(payload))
    print(f"Radar generated: {payload['totals']['items']} items, {len(payload['digest'])} digest signals, {len(errors)} feed errors.")
    for error in errors:
        print(f"- {error['feed']}: {error['error']}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
