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

# -----------------
# Config
# -----------------
JSON_PATH = os.environ.get("MENU_JSON", "menu_data.json")
IS_HEADLESS = os.environ.get("IS_HEADLESS", "1") == "1"
TEST_DATE = os.environ.get("TEST_DATE", "")  # MM/DD/YYYY e.g. "10/28/2025"

colleges = [
    "John R. Lewis & College Nine Dining Hall",
    "Cowell & Stevenson Dining Hall",
    "Crown & Merrill Dining Hall and Banana Joe's",
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
    new_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))
    return new_url

def clean_item_name_and_price(text_val):
    m = PRICE_REGEX.search(text_val)
    if not m:
        return text_val.strip(), None
    price = m.group(0)
    name_wo_price = (text_val[:m.start()] + text_val[m.end():]).strip()
    name_wo_price = re.sub(r"[-–:]\s*$", "", name_wo_price).strip()
    return name_wo_price, price

def find_relevant_row(el):
    """
    Walk up through <tr> ancestors.
    Prefer the highest <tr> that still wraps this item AND
    has either a price block (.shortmenuprices) OR allergen icons.
    """
    closest_tr = el.find_parent("tr")
    best_tr = closest_tr
    cur = closest_tr
    while cur:
        if cur.name != "tr":
            cur = cur.find_parent("tr")
            continue
        has_price = bool(cur.select_one(".shortmenuprices"))
        has_icons = bool(cur.select("img[src*='LegendImages/']"))
        if has_price or has_icons:
            best_tr = cur
        cur = cur.find_parent("tr")
    return best_tr

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

def parse_menu_html(html_text):
    soup = BeautifulSoup(html_text, "html.parser")

    # closed / "No Data Available"
    no_data_div = soup.select_one("div.shortmenuinstructs")
    if no_data_div and "No Data Available" in no_data_div.get_text(strip=True):
        return {}

    elements = soup.select("div.shortmenumeals, div.shortmenurecipes")
    if not elements:
        return {}

    hall_menu = {}
    current_meal = None

    for el in elements:
        classes = el.get("class", [])
        raw_text = el.get_text(strip=True).replace("\xa0", " ")

        if "shortmenumeals" in classes:
            current_meal = raw_text
            if current_meal not in hall_menu:
                hall_menu[current_meal] = []
            continue

        if "shortmenurecipes" in classes:
            # Markets often don't label meals → bucket into "Uncategorized"
            if current_meal is None:
                current_meal = "Uncategorized"
                if current_meal not in hall_menu:
                    hall_menu[current_meal] = []

            # 1. Split name vs inline price (e.g. "Wrap $7.00")
            cleaned_name, inline_price = clean_item_name_and_price(raw_text)

            # 2. icon_row = immediate <tr> that has the item's allergen icons
            icon_row = el.find_parent("tr")

            # 3. price_row = highest <tr> that also includes price cell
            price_row = find_relevant_row(el)

            # 4. Dietary/allergen tags from icon_row ONLY
            dietary_tags = extract_dietary_tags_from_row(icon_row)

            # 5. Price: inline first, else from the price_row
            item_price = inline_price
            if item_price is None:
                item_price = extract_price_from_row(price_row)

            hall_menu[current_meal].append(
                {
                    "name": cleaned_name,
                    "dietary_restrictions": dietary_tags,
                    "price": item_price,
                }
            )

    return hall_menu


def scrape_hall(driver, hall_name, hall_href, date_override):
    url_to_fetch = apply_date_param(hall_href, date_override)
    driver.get(url_to_fetch)

    # Try waiting for menu blocks OR "No Data Available", don't crash if absent.
    try:
        WebDriverWait(driver, 5).until(
            EC.presence_of_all_elements_located(
                (
                    By.CSS_SELECTOR,
                    "div.shortmenumeals, div.shortmenurecipes, div.shortmenuinstructs"
                )
            )
        )
    except Exception:
        pass

    html_text = driver.page_source
    return parse_menu_html(html_text)

def main():
    driver = make_driver()

    result = {
        "scrape_date": TEST_DATE if TEST_DATE else None,
        "halls": {}
    }

    try:
        driver.get("https://nutrition.sa.ucsc.edu/")
        wait_for_locations_list(driver)

        hall_links = get_hall_links(driver)

        for (hall_name, hall_href) in hall_links:
            hall_menu = scrape_hall(driver, hall_name, hall_href, TEST_DATE)
            result["halls"][hall_name] = hall_menu
            time.sleep(1)

    finally:
        driver.quit()

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
