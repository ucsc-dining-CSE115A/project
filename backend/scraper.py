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
TEST_DATE = os.environ.get("TEST_DATE", "")  # e.g. "10/28/2025"

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

# Map legend icon filename -> tag we want in dietary_restrictions
ICON_MAP = {
    "vegan.gif":      "VG", # item is vegan
    "veggie.gif":     "V", # item is vegetarian
    "gluten.gif":     "GF", # item is gluten free
    "eggs.gif":       "EGG", # item contains eggs
    "soy.gif":        "SOY", # item contains soy
    "milk.gif":       "DAIRY", # item contains dairy
    "wheat.gif":      "WHEAT", # item contains wheat
    "alcohol.gif":    "ALC", # item contains alcohol
    "pork.gif":       "PORK", # item contains pork
    "shellfish.gif":  "SHELLFISH", # item contains shellfish
    "sesame.gif":     "SESAME", # item contains sesame
    "beef.gif":       "BEEF", # item contains beef
    "fish.gif":       "FISH", # item contains fish
    "halal.gif":      "HALAL", # item is halal
    "nuts.gif":       "PEANUT",   # item contains peanuts 
    "treenut.gif":    "TREENUT",  # item contains tree nuts
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
    """
    Load https://nutrition.sa.ucsc.edu/ and ensure dining hall links render.
    """
    WebDriverWait(driver, timeout).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "li.locations a"))
    )


def get_hall_links(driver):
    """
    After cookies/session are set, collect (name, href) for the halls/markets we care about.
    """
    links = driver.find_elements(By.CSS_SELECTOR, "li.locations a")
    hall_links = []
    for link in links:
        hall_name = link.text.strip()
        if hall_name in colleges:
            hall_links.append((hall_name, link.get_attribute("href")))
    return hall_links


def apply_date_param(base_url: str, date_str: str) -> str:
    """
    Inject or override dtdate=MM/DD/YYYY in the hall URL if TEST_DATE is set.
    """
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


def clean_item_name_and_price(text_val: str):
    """
    If the recipe text itself includes a price like "Crunch Wrap $7.00",
    split that out:
       returns ( "Crunch Wrap", "$7.00" )
    Otherwise:
       returns ( original_text, None )
    """
    m = PRICE_REGEX.search(text_val)
    if not m:
        return text_val.strip(), None

    price = m.group(0)

    # remove the price block from the name
    name_wo_price = (text_val[:m.start()] + text_val[m.end():]).strip()

    # strip trailing punctuation from leftover "Crunch Wrap -"
    name_wo_price = re.sub(r"[-–:]\s*$", "", name_wo_price).strip()

    return name_wo_price, price


def find_icon_row(el):
    """
    Return the closest <tr> that directly wraps this <div class="shortmenurecipes">
    and its allergen/veg/etc. icons.
    In your sample, that's the INNER <tr height="30px">.
    """
    return el.find_parent("tr")


def find_price_row(el):
    """
    Walk up through ancestor <tr> elements.
    Return the FIRST <tr> in that chain that actually contains a .shortmenuprices.
    That <tr> is where the correct price for THIS item lives.

    If we never find a price row, fall back to the closest <tr> just so we don't crash.
    """
    closest_tr = el.find_parent("tr")
    cur = closest_tr
    first_with_price = None

    while cur:
        if cur.name != "tr":
            cur = cur.find_parent("tr")
            continue

        if cur.select_one(".shortmenuprices"):
            first_with_price = cur
            break  # stop at the first ancestor row that has a price

        cur = cur.find_parent("tr")

    return first_with_price if first_with_price else closest_tr


def extract_dietary_tags_from_row(tr):
    """
    Look at just this row's LegendImages icons and map them to tags like ["V","DAIRY","WHEAT"].
    """
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
    """
    From the row that actually contains .shortmenuprices, pull "$X.XX".
    """
    if tr is None:
        return None

    # most direct: <div class="shortmenuprices"><span>$7.00</span></div>
    price_divs = tr.select(".shortmenuprices")
    for cand in price_divs:
        txt = cand.get_text(" ", strip=True)
        m = PRICE_REGEX.search(txt)
        if m:
            return m.group(0)

    # fallback: any $ in the row text
    txt_all = tr.get_text(" ", strip=True)
    m2 = PRICE_REGEX.search(txt_all)
    if m2:
        return m2.group(0)

    return None


def parse_menu_html(html_text: str):
    """
    Parse one location's HTML into a dict of meals -> [ {name, dietary_restrictions, price}, ... ]

    Example return shape:
    {
      "Breakfast": [
        {"name": "Cage-Free Scrambled Eggs", "dietary_restrictions": [], "price": null},
        {"name": "Harissa Potatoes", "dietary_restrictions": ["GF","VG"], "price": null}
      ],
      "Uncategorized": [
        {"name": "Blueberry Muffin", "dietary_restrictions": ["V","SOY","EGG","DAIRY","WHEAT","ALC"], "price": "$4.75"}
      ]
    }

    If the page is closed / weekend / "No Data Available", we return {}.
    """
    soup = BeautifulSoup(html_text, "html.parser")

    # Closed case: markets on weekends etc.
    no_data_div = soup.select_one("div.shortmenuinstructs")
    if no_data_div and "No Data Available" in no_data_div.get_text(strip=True):
        return {}

    # We'll walk menu headers & items in DOM order
    elements = soup.select("div.shortmenumeals, div.shortmenurecipes")
    if not elements:
        return {}

    hall_menu = {}
    current_meal = None

    for el in elements:
        classes = el.get("class", [])
        raw_text = el.get_text(strip=True).replace("\xa0", " ")

        # Meal header (Breakfast / Lunch / Dinner / etc)
        if "shortmenumeals" in classes:
            current_meal = raw_text
            if current_meal not in hall_menu:
                hall_menu[current_meal] = []
            continue

        # Actual menu item line
        if "shortmenurecipes" in classes:
            # Markets / cafés don't always break out meals, so fallback
            if current_meal is None:
                current_meal = "Uncategorized"
                if current_meal not in hall_menu:
                    hall_menu[current_meal] = []

            # 1. Clean inline price off the name (if the item text itself had it)
            cleaned_name, inline_price = clean_item_name_and_price(raw_text)

            # 2. Find the row that has JUST THIS ITEM and its icons
            icon_row = find_icon_row(el)

            # 3. Find the nearest ancestor row that actually has a .shortmenuprices block
            price_row = find_price_row(el)

            # 4. Extract dietary tags from icon_row ONLY
            dietary_tags = extract_dietary_tags_from_row(icon_row)

            # 5. Price:
            #    inline wins (e.g. "Crunch Wrap $7.00"),
            #    else pull the first .shortmenuprices from the price_row.
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
    """
    Load an individual hall/market URL (optionally pinned to TEST_DATE),
    wait for either menu content or a 'No Data Available' marker,
    parse, and return structured data for that hall.
    """
    url_to_fetch = apply_date_param(hall_href, date_override)
    driver.get(url_to_fetch)

    # Try to wait for something meaningful to load, but don't crash if it's closed
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
        pass  # closed / after hours / nothing rendered, still parse what we got

    html_text = driver.page_source
    hall_menu = parse_menu_html(html_text)
    return hall_menu


def main():
    driver = make_driver()

    # Final output JSON shape:
    # {
    #   "scrape_date": "10/28/2025",
    #   "halls": {
    #       "Porter Market": { ... },
    #       "Crown & Merrill Dining Hall and Banana Joe's": { ... }
    #   }
    # }
    result = {
        "scrape_date": TEST_DATE if TEST_DATE else None,
        "halls": {}
    }

    try:
        # 1. Hit homepage first so session cookies get set
        driver.get("https://nutrition.sa.ucsc.edu/")
        wait_for_locations_list(driver)

        # 2. Collect links for every dining hall / cafe / market we care about
        hall_links = get_hall_links(driver)

        # 3. Scrape each one
        for (hall_name, hall_href) in hall_links:
            hall_menu = scrape_hall(driver, hall_name, hall_href, TEST_DATE)
            result["halls"][hall_name] = hall_menu
            time.sleep(1)  # be polite to their server

    finally:
        driver.quit()

    # 4. Write to JSON file
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # Optional: print to stdout for debugging in CI
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
