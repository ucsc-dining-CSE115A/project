from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from bs4 import BeautifulSoup
import time
import os
import json
import re
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from datetime import datetime  # existing
from zoneinfo import ZoneInfo   # NEW: for PST / America/Los_Angeles

# === Supabase client ===
from supabase import create_client, Client

# -----------------
# Config
# -----------------
JSON_PATH = os.environ.get("MENU_JSON", "menu_data.json")
IS_HEADLESS = os.environ.get("IS_HEADLESS", "1") == "1"
TEST_DATE = os.environ.get("TEST_DATE", "")  # e.g. "10/28/2025"

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL",
    "https://jbvsfjuufpoohaimookq.supabase.co"
)
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidnNmanV1ZnBvb2hhaW1vb2txIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3OTUyNiwiZXhwIjoyMDc3OTU1NTI2fQ.Llz8ROtP2ohe7rdO2sYtIlaufPNrvHLAJa43r2yPL2U"
)
TABLE_NAME = os.environ.get("SUPABASE_TABLE", "ratings")

# Create Supabase client if configured
SUPABASE: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    SUPABASE = create_client(SUPABASE_URL, SUPABASE_KEY)

# Simple in-process cache: name -> (id, avg_rating)
_DB_CACHE: dict[str, tuple[int | None, float]] = {}

colleges = [
    "John R. Lewis & College Nine Dining Hall",
    "Cowell & Stevenson Dining Hall",
    "Crown & Merrill Dining Hall and Banana Joe's",
    "Crown & Merrill Dining Hall",
    "Porter & Kresge Dining Hall",
    "Rachel Carson & Oakes Dining Hall",
    "Oakes Cafe",
    "Global Village Cafe",
    "Owl's Nest Cafe",
    "Slug Stop",
    "UCen Coffee Bar",
    "Stevenson Coffee House",
    "Perk Coffee Bar",
    "Porter Market",
    "Merrill Market"
]

# Map legend icon filename -> tag we want in dietary_restrictions
ICON_MAP = {
    "vegan.gif":      "VG",
    "veggie.gif":     "V",
    "gluten.gif":     "GF",
    "eggs.gif":       "EGG",
    "soy.gif":        "SOY",
    "milk.gif":       "DAIRY",
    "wheat.gif":      "WHEAT",
    "alcohol.gif":    "ALC",
    "pork.gif":       "PORK",
    "shellfish.gif":  "SHELLFISH",
    "sesame.gif":     "SESAME",
    "beef.gif":       "BEEF",
    "fish.gif":       "FISH",
    "halal.gif":      "HALAL",
    "nuts.gif":       "PEANUT",
    "treenut.gif":    "TREENUT",
}

PRICE_REGEX = re.compile(r"\$\s*\d+(?:\.\d{1,2})?")


def normalize_date(date_str: str) -> str:
    """
    Normalize many possible date formats to MM/DD/YYYY.
    This is the format required by the UCSC nutrition site.
    """
    if not date_str:
        raise ValueError("Empty date string")

    s = str(date_str).strip()

    # First, try MM/DD/YYYY directly
    try:
        dt = datetime.strptime(s, "%m/%d/%Y")
        return dt.strftime("%m/%d/%Y")
    except ValueError:
        pass

    # Try some common alternates
    for fmt in ["%Y-%m-%d", "%m-%d-%Y", "%m/%d/%y", "%m-%d-%y", "%Y/%m/%d"]:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%m/%d/%Y")
        except ValueError:
            continue

    # If all fail, complain
    raise ValueError(f"Unsupported date format: {s}")


# === DB helpers ===
def _get_or_create_item(name: str) -> tuple[int | None, float]:
    """
    Ensure a row exists in Supabase for this item name.
    Returns (id, avg_rating). If DB is not configured, returns (None, 0.0).
    """
    clean = name.strip()
    if not SUPABASE:
        return (None, 0.0)

    if clean in _DB_CACHE:
        return _DB_CACHE[clean]

    try:
        # Try to fetch existing row (id + avg_score if present)
        sel = SUPABASE.table(TABLE_NAME).select("id, name, avg_score").eq("name", clean).execute()
        rows = sel.data or []
        if rows:
            row = rows[0]
            item_id = row.get("id")
            avg = row.get("avg_score")
            avg_rating = float(avg) if avg is not None else 0.0
            _DB_CACHE[clean] = (item_id, avg_rating)
            return _DB_CACHE[clean]

        # Not found: insert a new row with just name (stars default to 0)
        SUPABASE.table(TABLE_NAME).insert({"name": clean}).execute()

        # Re-select to get id and avg_score
        sel2 = SUPABASE.table(TABLE_NAME).select("id, name, avg_score").eq("name", clean).single().execute()
        row2 = sel2.data or {}
        item_id = row2.get("id")
        avg = row2.get("avg_score")
        avg_rating = float(avg) if avg is not None else 0.0
        _DB_CACHE[clean] = (item_id, avg_rating)
        return _DB_CACHE[clean]

    except Exception as e:
        # Fail open: don't block scraping if DB hiccups
        print(f"[DB] Warning: could not ensure item '{clean}': {e}")
        _DB_CACHE[clean] = (None, 0.0)
        return _DB_CACHE[clean]


def make_driver():
    chrome_opts = Options()
    if IS_HEADLESS:
        chrome_opts.add_argument("--headless=new")
    chrome_opts.add_argument("--no-sandbox")
    chrome_opts.add_argument("--disable-dev-shm-usage")
    chrome_opts.add_argument("--user-agent=Mozilla/5.0")
    return webdriver.Chrome(options=chrome_opts)


def wait_for_locations_list(driver, timeout=10):
    WebDriverWait(driver, timeout).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "li.locations a"))
    )


def get_hall_links(driver):
    links = driver.find_elements(By.CSS_SELECTOR, "li.locations a")
    hall_links = []
    for link in links:
        hall_name = link.text.strip()
        if hall_name in colleges:
            hall_links.append((hall_name, link.get_attribute("href")))
    return hall_links


def apply_date_param(base_url: str, date_str: str) -> str:
    if not date_str:
        return base_url
    parsed = urlparse(base_url)
    query_pairs = dict(parse_qsl(parsed.query))
    query_pairs["dtdate"] = date_str
    new_query = urlencode(query_pairs)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))


def clean_item_name_and_price(text_val: str):
    m = PRICE_REGEX.search(text_val)
    if not m:
        return text_val.strip(), None
    price = m.group(0)
    name_wo_price = (text_val[:m.start()] + text_val[m.end():]).strip()
    name_wo_price = re.sub(r"[-–:]\s*$", "", name_wo_price).strip()
    return name_wo_price, price


def find_icon_row(el):
    return el.find_parent("tr")


def find_price_row(el):
    closest_tr = el.find_parent("tr")
    cur = closest_tr
    first_with_price = None
    while cur:
        if cur.name != "tr":
            cur = cur.find_parent("tr")
            continue
        if cur.select_one(".shortmenuprices"):
            first_with_price = cur
            break
        cur = cur.find_parent("tr")
    return first_with_price if first_with_price else closest_tr


def extract_dietary_tags_from_row(tr):
    tags = []
    if tr is None:
        return tags
    imgs = tr.select("img[src*='LegendImages/']")
    for img in imgs:
        src = (img.get("src") or "").strip()
        icon_file = os.path.basename(src)
        tag = ICON_MAP.get(icon_file)
        if tag and tag not in tags:
            tags.append(tag)
    return tags


def extract_price_from_row(tr):
    if tr is None:
        return None
    price_divs = tr.select(".shortmenuprices")
    for cand in price_divs:
        txt = cand.get_text(" ", strip=True)
        m = PRICE_REGEX.search(txt)
        if m:
            return m.group(0)
    txt_all = tr.get_text(" ", strip=True)
    m2 = PRICE_REGEX.search(txt_all)
    if m2:
        return m2.group(0)
    return None


def _normalize_category_text(raw_text: str) -> str:
    t = (raw_text or "").replace("\xa0", " ")
    t = re.sub(r"^\s*-\s*|\s*-\s*$", "", t).strip()
    t = re.sub(r"\s{2,}", " ", t)
    return t


def _ensure_nested(hall_menu: dict, section: str, subsection: str):
    if section not in hall_menu:
        hall_menu[section] = {}
    if subsection not in hall_menu[section]:
        hall_menu[section][subsection] = []


def parse_menu_html(html_text: str):
    soup = BeautifulSoup(html_text, "html.parser")

    no_data_div = soup.select_one("div.shortmenuinstructs")
    if no_data_div and "No Data Available" in no_data_div.get_text(strip=True):
        return {}

    elements = soup.select("div.shortmenumeals, div.shortmenucats, div.shortmenurecipes")
    if not elements:
        return {}

    hall_menu: dict[str, dict[str, list]] = {}
    current_section = None
    current_subsection = None

    for el in elements:
        classes = el.get("class", [])
        raw_text = el.get_text(strip=True).replace("\xa0", " ")

        if "shortmenumeals" in classes:
            current_section = _normalize_category_text(raw_text) or "Uncategorized"
            current_subsection = None
            if current_section not in hall_menu:
                hall_menu[current_section] = {}
            continue

        if "shortmenucats" in classes:
            if current_section is None:
                current_section = "Uncategorized"
            current_subsection = _normalize_category_text(raw_text) or current_section
            _ensure_nested(hall_menu, current_section, current_subsection)
            continue

        if "shortmenurecipes" in classes:
            if current_section is None:
                current_section = "Uncategorized"
            if current_subsection is None:
                current_subsection = current_section
            _ensure_nested(hall_menu, current_section, current_subsection)

            cleaned_name, inline_price = clean_item_name_and_price(raw_text)

            icon_row = el.find_parent("tr")
            price_row = find_price_row(el)

            dietary_tags = extract_dietary_tags_from_row(icon_row)
            item_price = inline_price if inline_price is not None else extract_price_from_row(price_row)

            # attach id + avg_rating from DB
            item_id, avg_rating = _get_or_create_item(cleaned_name)

            hall_menu[current_section][current_subsection].append(
                {
                    "id": item_id,
                    "name": cleaned_name,
                    "avg_rating": avg_rating,
                    "dietary_restrictions": dietary_tags,
                    "price": item_price,
                }
            )

    return hall_menu


def scrape_hall(driver, hall_name, hall_href, date_override):
    url_to_fetch = apply_date_param(hall_href, date_override)
    driver.get(url_to_fetch)
    try:
        WebDriverWait(driver, 5).until(
            EC.presence_of_all_elements_located(
                (
                    By.CSS_SELECTOR,
                    "div.shortmenumeals, div.shortmenucats, div.shortmenurecipes, div.shortmenuinstructs"
                )
            )
        )
    except Exception:
        pass
    html_text = driver.page_source
    hall_menu = parse_menu_html(html_text)
    return hall_menu


def _upsert_schedule_for_date(date_str: str, result: dict):
    """
    Upsert logic for the 'schedule' table:
      - If no row exists for date -> INSERT (data_fetched=false).
      - If row exists:
          * If menu_data is identical -> no-op.
          * If different -> UPDATE menu_data and set data_fetched=false.
    """
    if not SUPABASE:
        return

    try:
        existing_resp = SUPABASE.table("schedule").select("date, menu_data, data_fetched").eq("date", date_str).execute()
        rows = existing_resp.data or []
    except Exception as e:
        print(f"[DB] Error checking existing schedule for {date_str}: {e}")
        return

    if not rows:
        # No existing row -> insert
        try:
            SUPABASE.table("schedule").insert({
                "date": date_str,
                "menu_data": result,
                "data_fetched": False,  # explicit, though default is false
            }).execute()
            print(f"[DB] Inserted new schedule for {date_str}")
        except Exception as e:
            print(f"[DB] Error inserting schedule for {date_str}: {e}")
        return

    # We have at least one row for that date (assuming unique per date)
    row = rows[0]
    existing_menu = row.get("menu_data")

    if existing_menu == result:
        print(f"[DB] Existing schedule for {date_str} is identical; skipping update.")
        return

    # Different -> update menu_data and reset data_fetched to false
    try:
        SUPABASE.table("schedule").update({
            "menu_data": result,
            "data_fetched": False,
        }).eq("date", date_str).execute()
        print(f"[DB] Updated schedule for {date_str} and reset data_fetched to false.")
    except Exception as e:
        print(f"[DB] Error updating schedule for {date_str}: {e}")


def scrape_one_date(driver, hall_links, date_str: str) -> dict:
    """
    Scrape all halls for a single date, return the JSON result,
    and upsert into the 'schedule' table (if SUPABASE configured).
    date_str MUST already be in MM/DD/YYYY format.
    """
    print(f"[SCRAPER] Scraping date: {date_str}")
    result = {
        "scrape_date": date_str,
        "halls": {}
    }

    for (hall_name, hall_href) in hall_links:
        hall_menu = scrape_hall(driver, hall_name, hall_href, date_str)
        result["halls"][hall_name] = hall_menu
        time.sleep(1)  # polite

    # Upsert into 'schedule' with diff-check + data_fetched reset on change
    _upsert_schedule_for_date(date_str, result)

    return result


def process_backlog(driver, hall_links):
    """
    Read all rows from 'scrape_backlog', scrape each date,
    upsert into 'schedule', then delete that backlog row.
    """
    if not SUPABASE:
        print("[DB] Supabase not configured; skipping backlog.")
        return

    try:
        resp = SUPABASE.table("scrape_backlog").select("date_to_scrape").execute()
        backlog_rows = resp.data or []
    except Exception as e:
        print(f"[DB] Error fetching scrape_backlog: {e}")
        return

    if not backlog_rows:
        print("[DB] No backlog rows found.")
        return

    for row in backlog_rows:
        orig_backlog_date = row.get("date_to_scrape")
        if not orig_backlog_date:
            continue

        try:
            # Use normalized date for scraping (MM/DD/YYYY)
            backlog_date_for_scraper = normalize_date(str(orig_backlog_date))
        except ValueError as e:
            print(f"[DB] Skipping backlog row with bad date '{orig_backlog_date}': {e}")
            continue

        # Scrape that backlog date & upsert into schedule
        _ = scrape_one_date(driver, hall_links, backlog_date_for_scraper)

        # Remove backlog row(s) for that original stored value
        try:
            SUPABASE.table("scrape_backlog").delete().eq("date_to_scrape", orig_backlog_date).execute()
            print(f"[DB] Cleared backlog for date {orig_backlog_date}")
        except Exception as e:
            print(f"[DB] Error deleting backlog rows for {orig_backlog_date}: {e}")


def main():
    driver = make_driver()

    # Decide the main scrape date:
    # - If TEST_DATE set, normalize it
    # - Else, use today's date in PST (America/Los_Angeles) in MM/DD/YYYY
    if TEST_DATE:
        resolved_date = normalize_date(TEST_DATE)
    else:
        # --- THIS IS THE PST CHANGE ---
        today_pst = datetime.now(ZoneInfo("America/Los_Angeles"))
        today_str = today_pst.strftime("%m/%d/%Y")
        resolved_date = normalize_date(today_str)

    # This will hold only the "main" date result for writing to JSON file
    main_result = {
        "scrape_date": resolved_date,
        "halls": {}
    }

    try:
        driver.get("https://nutrition.sa.ucsc.edu/")
        wait_for_locations_list(driver)
        hall_links = get_hall_links(driver)

        # 1) Scrape the primary/current date and upsert into schedule
        main_result = scrape_one_date(driver, hall_links, resolved_date)

        # 2) Process backlog dates: scrape, upsert into schedule, delete backlog rows
        process_backlog(driver, hall_links)

    finally:
        driver.quit()

    # Write only the primary date result to local JSON file
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(main_result, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
