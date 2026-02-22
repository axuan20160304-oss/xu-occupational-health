#!/usr/bin/env python3
"""
Batch download GBZ/GBZ-T/WS standard PDFs from official sources.
Sources:
  1. nhc.gov.cn (国家卫健委)
  2. chinacdc.cn (中国疾控中心)
  3. niohp.chinacdc.cn (职业卫生所)
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import ssl

# Disable SSL verification for some government sites
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

SITE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(SITE_DIR, "public", "pdf-files")
CATALOG_FILE = os.path.join(SITE_DIR, "content", "standards", "standards-catalog.json")
PDF_AVAIL_FILE = os.path.join(SITE_DIR, "content", "standards", "pdf-availability.json")

os.makedirs(PDF_DIR, exist_ok=True)

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def code_to_filename(code):
    """Convert standard code to filename, e.g. 'GBZ 188-2025' -> 'GBZ-188-2025.pdf'"""
    name = code.replace(" ", "-").replace("/", "-")
    return f"{name}.pdf"

def code_to_nhc_filename(code):
    """Try common NHC URL patterns for a standard code."""
    # GBZ 188-2025 -> GBZ188-2025, GBZ 2.1-2019 -> GBZ2.1-2019
    base = code.replace(" ", "").replace("/T", "-T")
    return base

def try_download(url, dest, timeout=15):
    """Try to download a file, return True if successful."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        content_type = resp.headers.get("Content-Type", "")
        if "pdf" in content_type or "octet-stream" in content_type or resp.status == 200:
            data = resp.read()
            if len(data) > 5000 and data[:5] == b"%PDF-":
                with open(dest, "wb") as f:
                    f.write(data)
                return True
        return False
    except Exception:
        return False

def generate_urls(code):
    """Generate possible download URLs for a standard code."""
    urls = []
    base = code.replace(" ", "")  # GBZ188-2025
    base_dash = code.replace(" ", "-")  # GBZ-188-2025
    base_t = code.replace(" ", "").replace("/T", "-T")  # GBZ-T for GBZ/T
    
    # NHC patterns
    urls.append(f"https://www.nhc.gov.cn/ewebeditor/uploadfile/2024/{base}.pdf")
    urls.append(f"https://www.nhc.gov.cn/ewebeditor/uploadfile/2023/{base}.pdf")
    urls.append(f"https://www.nhc.gov.cn/ewebeditor/uploadfile/2022/{base}.pdf")
    
    # China CDC patterns
    urls.append(f"https://niohp.chinacdc.cn/zyysjk/zywsbzml/P020{base}.pdf")
    
    # Common hosting patterns
    urls.append(f"https://www.chinacdc.cn/jkyj/hjwsyzdkz/bzxg/{base}.pdf")
    
    return urls

def main():
    catalog = load_json(CATALOG_FILE)
    pdf_avail = load_json(PDF_AVAIL_FILE)
    
    has_file = set(pdf_avail.keys())
    
    # Get missing standards - prioritize important ones
    missing = []
    for s in catalog["standards"]:
        slug = s.get("slug", "")
        code = s.get("code", "")
        title = s.get("title", "")
        status = s.get("status", "")
        if slug not in has_file and status == "现行":
            missing.append({"code": code, "title": title, "slug": slug})
    
    print(f"Total missing (现行): {len(missing)}")
    
    # Try to download each
    downloaded = 0
    failed = 0
    max_downloads = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    
    for item in missing[:max_downloads]:
        code = item["code"]
        slug = item["slug"]
        filename = code_to_filename(code)
        dest = os.path.join(PDF_DIR, filename)
        
        if os.path.exists(dest):
            print(f"  [SKIP] {code} - already exists")
            pdf_avail[slug] = filename
            downloaded += 1
            continue
        
        urls = generate_urls(code)
        success = False
        for url in urls:
            if try_download(url, dest):
                print(f"  [OK] {code} <- {url}")
                pdf_avail[slug] = filename
                downloaded += 1
                success = True
                break
        
        if not success:
            print(f"  [FAIL] {code} - {item['title']}")
            failed += 1
        
        time.sleep(0.5)  # Be polite
    
    # Save updated availability
    save_json(PDF_AVAIL_FILE, pdf_avail)
    
    print(f"\n--- Results ---")
    print(f"Downloaded: {downloaded}")
    print(f"Failed: {failed}")
    print(f"Total PDF mappings: {len(pdf_avail)}")

if __name__ == "__main__":
    main()
