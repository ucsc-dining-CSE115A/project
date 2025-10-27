from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from bs4 import BeautifulSoup
import time
import os
import json

# -----------------
# Config
# -----------------
JSON_PATH = os.environ.get("MENU_JSON", "menu_data.json")
IS_HEADLESS = os.environ.get("IS_HEADLESS", "1") == "1"

colleges = [
    "John R. Lewis & College Nine Dining Hall",
    "Cowell & Stevenson Dining Hall",
    "Crown & Merrill Dining Hall and Banana Joe's",
    "Porter & Kresge Dining Hall",
    "Rachel Carson & Oakes Dining Hall",
]

# Map each legend icon filename -> short code we want in dietary_restrictions[]
ICON_MAP = {
    "vegan.gif":   "VG",  # vegan
    "veggie.gif":  "V",   # vegetarian
    "gluten.gif":  "GF",  # gluten-free
    "eggs.gif":    "EGG",   # contains eggs
    "soy.gif":     "SOY",   # contains soy
    "milk.gif":    "DAIRY",   # contains dairy
    "wheat.gif":   "WHEAT",   # contains wheat
    "alcohol.gif": "ALC", # contains alcohol
    "pork.gif":   "PORK",# contains pork
    "shellfish.gif": "SHELLFISH", # contains shellfish
    "sesame.gif": "SESAME", # contains sesame
    "beef.gif": "BEEF", # contains beef
    "fish.gif": "FISH", # contains fish
    "halal.gif": "HALAL", # halal
    "nuts.gif": "PEANUT", # contains peanuts *IMPORTANT - this icon is only for peanuts!!*
    "treenut.gif": "TREENUT", # contains tree nuts
}


def make_driver():
    chrome_opts = Options()
    if IS_HEADLESS:
        # "--headless=new" works on modern Chrome; keep it for container usage
        chrome_opts.add_argument("--headless=new")
    chrome_opts.add_argument("--no-sandbox")
    chrome_opts.add_argument("--disable-dev-shm-usage")
    chrome_opts.add_argument("--user-agent=Mozilla/5.0")
    return webdriver.Chrome(options=chrome_opts)


def wait_for_locations_list(driver, timeout=10):
    """
    Ensures the landing page (https://nutrition.sa.ucsc.edu/) is loaded
    and the dining hall location links are present.
    """
    WebDriverWait(driver, timeout).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "li.locations a"))
    )


def get_hall_links(driver):
    """
    From the landing page (after cookies are set), collect (name, href)
    for just the halls we care about.
    """
    links = driver.find_elements(By.CSS_SELECTOR, "li.locations a")
    hall_links = []
    for link in links:
        hall_name = link.text.strip()
        if hall_name in colleges:
            hall_links.append((hall_name, link.get_attribute("href")))
    return hall_links


def parse_menu_html(html_text):
    """
    Given the full HTML of one dining hall's page (driver.page_source),
    build a dict of:
       {
         "Breakfast": [ {name, dietary_restrictions: [...]}, ... ],
         "Lunch":     [ ... ],
         ...
       }
    """
    soup = BeautifulSoup(html_text, "html.parser")

    # We'll walk the page in DOM order, toggling current_meal whenever we see div.shortmenumeals
    hall_menu = {}
    current_meal = None

    # Get all meal headers + recipe entries in order
    elements = soup.select("div.shortmenumeals, div.shortmenurecipes")

    for el in elements:
        classes = el.get("class", [])
        text_val = el.get_text(strip=True).replace("\xa0", " ")

        if "shortmenumeals" in classes:
            # Start a new meal section, like "Breakfast", "Lunch", "Dinner", etc.
            current_meal = text_val
            if current_meal not in hall_menu:
                hall_menu[current_meal] = []

        elif "shortmenurecipes" in classes:
            if current_meal is None:
                # If somehow we saw a recipe before any meal header,
                # just shove it under "Uncategorized"
                current_meal = "Uncategorized"
                if current_meal not in hall_menu:
                    hall_menu[current_meal] = []

            item_name = text_val

            # Find icons in the same table row as this recipe
            tr = el.find_parent("tr")
            dietary_tags = []
            if tr:
                imgs = tr.select("img")
                for img in imgs:
                    src = (img.get("src") or "").strip()
                    if "LegendImages" in src:
                        icon_file = os.path.basename(src)
                        tag = ICON_MAP.get(icon_file)
                        if tag and tag not in dietary_tags:
                            dietary_tags.append(tag)

            hall_menu[current_meal].append(
                {
                    "name": item_name,
                    "dietary_restrictions": dietary_tags,
                }
            )

    return hall_menu


def scrape_hall(driver, hall_name, hall_href):
    """
    Navigate to one hall, wait for menu to load, return structured dict for that hall.
    """
    driver.get(hall_href)

    # Wait until we see at least one recipe or meal block so we know content loaded.
    WebDriverWait(driver, 10).until(
        EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, "div.shortmenumeals, div.shortmenurecipes")
        )
    )

    # Grab rendered HTML and parse
    html_text = driver.page_source
    hall_menu = parse_menu_html(html_text)
    return hall_menu


def main():
    driver = make_driver()
    menu_data = {}

    try:
        # Step 1. Load homepage to set cookies/session
        driver.get("https://nutrition.sa.ucsc.edu/")
        wait_for_locations_list(driver)

        # Step 2. Filter for only the halls we care about
        hall_links = get_hall_links(driver)

        # Step 3. Visit each hall and scrape
        for (hall_name, hall_href) in hall_links:
            hall_menu = scrape_hall(driver, hall_name, hall_href)
            menu_data[hall_name] = hall_menu
            # Small pause is polite / avoids hammering server
            time.sleep(1)

    finally:
        driver.quit()

    # Step 4. Write JSON
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(menu_data, f, ensure_ascii=False, indent=2)

    # Optional: print to console for debug
    print(json.dumps(menu_data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
