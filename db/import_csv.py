#!/usr/bin/env python3
"""
Import danych z plików CSV do bazy revbox.
Uruchamiać z katalogu /var/www/revbox/:
  python3 db/import_csv.py
"""
import csv
import os
import sys
import psycopg2
import psycopg2.extras
import re
from collections import defaultdict

DB = "host=localhost dbname=revbox user=revbox_user password=revbox_secure_2026"
TEMP = "/var/www/revbox/temp"

FILE_CATEGORIES  = os.path.join(TEMP, "bquxjob_4de9e79d_19c9b420f1b.csv")
FILE_PRODUCTS    = os.path.join(TEMP, "bq-results-20260226-184050-1772131266147.csv")
FILE_FEATURES    = os.path.join(TEMP, "bq-results-20260226-183427-1772130906087.csv")

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:80]

def import_categories(conn):
    print("Importuję kategorie...")
    cur = conn.cursor()
    with open(FILE_CATEGORIES, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        inserted = 0
        for row in reader:
            if row.get('is_active', '').lower() != 'true':
                continue
            name_en = row['name_en'].strip()
            name_de = row['name_de'].strip()
            if not name_en:
                name_en = name_de
            slug = slugify(name_en)
            cur.execute("""
                INSERT INTO categories (name_pl, name_en, slug, is_active)
                VALUES (%s, %s, %s, true)
                ON CONFLICT (slug) DO NOTHING
            """, (name_en, name_en, slug))
            inserted += cur.rowcount
    conn.commit()
    print(f"  Wstawiono kategorii: {inserted}")

    # Add extra categories based on product names
    extra_cats = [
        ("Smartfony", "Smartphones", "smartphones"),
        ("Laptopy i PC", "Laptops & PCs", "laptops-pcs"),
        ("Akcesoria", "Accessories", "accessories"),
        ("Gaming i Streaming", "Gaming & Streaming", "gaming-streaming"),
        ("Audio, Video i Multimedia", "Audio, Video & Multimedia", "audio-video-multimedia"),
        ("Smart Home i Lifestyle", "Smart Home & Lifestyle", "smart-home-lifestyle"),
        ("Komponenty PC", "PC Components & Hardware", "pc-components-hardware"),
        ("Urządzenia peryferyjne", "Peripherals", "peripherals"),
        ("Pozostałe", "Other", "other"),
    ]
    for name_pl, name_en, slug in extra_cats:
        cur.execute("""
            INSERT INTO categories (name_pl, name_en, slug, is_active)
            VALUES (%s, %s, %s, true)
            ON CONFLICT (slug) DO NOTHING
        """, (name_pl, name_en, slug))
    conn.commit()

def guess_category(name_en, name_de, cat_slug_map):
    """Prosta heurystyka przypisania kategorii na podstawie nazwy."""
    name = (name_en + ' ' + name_de).lower()
    rules = [
        (['smartphone', 'iphone', 'galaxy s', 'galaxy a', 'pixel', 'xiaomi mi', 'redmi'], 'smartphones'),
        (['laptop', 'notebook', 'macbook', 'thinkpad', 'lenovo yoga', ' pc ', 'desktop', 'all-in-one'], 'laptops-pcs'),
        (['gaming', 'xbox', 'playstation', 'ps4', 'ps5', 'nintendo', 'mouse gaming', 'headset', 'joystick'], 'gaming-streaming'),
        (['speaker', 'headphone', 'earphone', 'airpod', 'soundbar', 'earbuds', 'monitor', 'tv ', 'television'], 'audio-video-multimedia'),
        (['smart home', 'robot vacuum', 'vacuum cleaner', 'air purifier', 'coffee', 'blender', 'smarthome', 'lifestyle'], 'smart-home-lifestyle'),
        (['cpu', 'gpu', 'ram', 'ssd', 'motherboard', 'power supply', 'graphics card', 'processor'], 'pc-components-hardware'),
        (['keyboard', 'mouse ', 'printer', 'scanner', 'webcam', 'cable', 'hub', 'adapter', 'charger'], 'peripherals'),
        (['case ', 'cover', 'screen protector', 'bag', 'backpack', 'stand', 'mount', 'holder'], 'accessories'),
    ]
    for keywords, slug in rules:
        for kw in keywords:
            if kw in name:
                if slug in cat_slug_map:
                    return cat_slug_map[slug]
    return cat_slug_map.get('other')

def import_products(conn):
    print("Importuję produkty...")
    cur = conn.cursor()

    # Load category map
    cur.execute("SELECT id, slug FROM categories")
    cat_slug_map = {row[1]: row[0] for row in cur.fetchall()}

    batch = []
    skipped = 0
    inserted = 0
    EUR_TO_PLN = 4.25

    with open(FILE_PRODUCTS, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['is_active'].strip().lower() != 'true':
                skipped += 1
                continue
            name_en = row['name_en'].strip()
            name_de = row['name_de'].strip()
            if not name_en and not name_de:
                skipped += 1
                continue

            sku = row['sku'].strip()
            price_eur = float(row['price_eur']) if row['price_eur'].strip() else 0.0
            category_id = guess_category(name_en, name_de, cat_slug_map)
            desc_en = row['description_en'].strip()
            desc_de = row['description_de'].strip()

            batch.append((
                sku,
                name_en or name_de,  # name_pl = english (brak polskiego)
                name_en,
                category_id,
                price_eur if price_eur > 0 else None,
                round(price_eur * EUR_TO_PLN, 2) if price_eur > 0 else None,
                row['url'].strip() or None,
                desc_en or desc_de or None,
                desc_en or None,
                True,
            ))

            if len(batch) >= 500:
                psycopg2.extras.execute_values(cur, """
                    INSERT INTO products (sku, name_pl, name_en, category_id, price_eur, price_pln,
                        url, description_pl, description_en, is_active)
                    VALUES %s
                    ON CONFLICT (sku) DO NOTHING
                """, batch)
                inserted += cur.rowcount
                conn.commit()
                batch = []
                if inserted % 5000 == 0:
                    print(f"  ...{inserted} produktów")

    if batch:
        psycopg2.extras.execute_values(cur, """
            INSERT INTO products (sku, name_pl, name_en, category_id, price_eur, price_pln,
                url, description_pl, description_en, is_active)
            VALUES %s
            ON CONFLICT (sku) DO NOTHING
        """, batch)
        inserted += cur.rowcount
        conn.commit()

    print(f"  Wstawiono: {inserted} produktów, pominięto: {skipped}")

def import_features(conn):
    print("Agregowanie cech produktów z recenzji...")
    cur = conn.cursor()

    # Load sku -> product_id map
    cur.execute("SELECT id, sku FROM products")
    sku_map = {row[1]: row[0] for row in cur.fetchall()}
    print(f"  Produktów w bazie: {len(sku_map)}")

    # Aggregate: (sku, feature_en, sentiment) -> (count, sample_quote)
    features = defaultdict(lambda: [0, ''])
    processed = 0

    with open(FILE_FEATURES, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = row['sku'].strip("'").strip()
            feat = row['feature_en'].strip("'").strip()
            sent = row['sentiment'].strip("'").strip()
            quote = row['quote_en'].strip("'").strip()
            if not feat or not sku:
                continue
            key = (sku, feat[:100], sent)
            entry = features[key]
            entry[0] += 1
            if not entry[1] and len(quote) > 10:
                entry[1] = quote[:300]
            processed += 1
            if processed % 100000 == 0:
                print(f"  ...przetworzono {processed} wierszy recenzji")

    print(f"  Łącznie przetworzono: {processed} wierszy")
    print(f"  Unikalne (sku, feature, sentiment): {len(features)}")

    # Insert top 20 features per product
    from collections import defaultdict as dd
    per_product = dd(list)
    for (sku, feat, sent), (count, quote) in features.items():
        product_id = sku_map.get(sku)
        if product_id:
            per_product[product_id].append((feat, sent, count, quote))

    batch = []
    for product_id, feats in per_product.items():
        # top 20 by count
        top = sorted(feats, key=lambda x: -x[2])[:20]
        for feat, sent, count, quote in top:
            batch.append((product_id, feat, sent, count, quote or None))

    if batch:
        psycopg2.extras.execute_values(cur, """
            INSERT INTO product_features (product_id, feature_en, sentiment, mention_count, sample_quote)
            VALUES %s
        """, batch, page_size=500)
        conn.commit()
        print(f"  Wstawiono {len(batch)} cech produktów")

def main():
    print(f"Łączę z bazą revbox...")
    conn = psycopg2.connect(DB)
    try:
        import_categories(conn)
        import_products(conn)
        import_features(conn)

        # Stats
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM categories")
        print(f"\nKategorie: {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM products")
        print(f"Produkty: {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM product_features")
        print(f"Cechy: {cur.fetchone()[0]}")
        print("\nImport zakończony sukcesem!")
    finally:
        conn.close()

if __name__ == '__main__':
    main()
