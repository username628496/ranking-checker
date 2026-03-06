"""
Serper API integration service
"""
import time
from typing import List, Dict

import requests

from config import Config, logger


def serper_search(keyword: str, location: str, device: str, max_results: int = 30, api_key: str = None) -> List[Dict]:
    """
    Search Google via Serper API and fetch up to max_results

    Serper API returns max 10 results per call, so we paginate to get more.

    Args:
        keyword: Search keyword
        location: Location code (vn, hanoi, hochiminh, danang)
        device: Device type (desktop, mobile)
        max_results: Maximum number of results to fetch (default 30)
        api_key: Optional Serper API key (fallback to Config.SERPER_API_KEY if not provided)

    Returns:
        List of organic search results with actualPosition field

    Raises:
        ValueError: If SERPER_API_KEY not configured

    Examples:
        results = serper_search("seo tools", "vn", "desktop", max_results=30)
        # Returns up to 30 organic results
    """
    # Use provided api_key or fallback to Config
    serper_key = api_key or Config.SERPER_API_KEY
    if not serper_key:
        raise ValueError("SERPER_API_KEY not configured")

    all_results = []
    results_per_page = 10

    # ✅ FIX: Fetch more pages to ensure we get enough results
    # Google sometimes returns < 10 results/page (especially for niche keywords)
    # To guarantee max_results (usually 30), fetch extra pages as buffer
    # Increase to 10 pages (100 results) to maximize chances of getting 30
    max_pages = min(10, int((max_results * 2) / results_per_page) + 2)

    logger.info(
        f"Serper search plan: '{keyword}' | target={max_results} results | "
        f"max_pages={max_pages} | location={location}"
    )

    try:
        for page in range(max_pages):
            start = page * results_per_page

            payload = {
                "q": keyword[:100],  # Limit keyword length
                "gl": location,
                "hl": "vi",
                "device": device,
                "num": results_per_page,  # Note: Google ignores this since Sep 2025, always returns ~10
                "page": page + 1,  # Serper uses 1-indexed pages
                "autocorrect": False,
            }

            logger.info(
                f"Serper search: {keyword} | page={page+1}/{max_pages} | "
                f"positions {start+1}-{start+results_per_page} | location={location}"
            )

            # Make API request
            r = requests.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": serper_key,
                    "Content-Type": "application/json",
                    "User-Agent": Config.USER_AGENT
                },
                json=payload,
                timeout=Config.REQUEST_TIMEOUT,
                verify=True,
            )
            r.raise_for_status()
            data = r.json()

            # Check for API errors
            if "error" in data:
                logger.error(f"Serper API error: {data['error']}")
                break

            organic = data.get("organic", [])

            if not organic:
                logger.warning(
                    f"Serper page {page+1}: No results found. "
                    f"Total so far: {len(all_results)}/{max_results}"
                )
                break

            # Add actual position to each result (accounting for pagination)
            for idx, item in enumerate(organic):
                item['actualPosition'] = start + idx + 1

            all_results.extend(organic)
            logger.info(
                f"Serper page {page+1}: Found {len(organic)} results "
                f"(total: {len(all_results)}/{max_results})"
            )

            # Stop if we have enough results
            if len(all_results) >= max_results:
                logger.info(
                    f"✅ Reached {len(all_results)} results (≥{max_results}), "
                    f"stopping pagination"
                )
                break

            # Warn if we're running out of pages but don't have enough results yet
            if page == max_pages - 2 and len(all_results) < max_results:
                logger.warning(
                    f"⚠️ May not reach {max_results} results. "
                    f"Currently at {len(all_results)} after {page+1} pages"
                )

            # Rate limiting: delay between requests (reduced from 0.5s for faster fetching)
            if page < max_pages - 1 and len(organic) > 0:
                time.sleep(0.3)

        # Log final result count
        final_results = all_results[:max_results]

        if len(final_results) < max_results:
            logger.warning(
                f"❌ Only fetched {len(final_results)}/{max_results} results for '{keyword}' "
                f"(Google doesn't have more results for this query)"
            )
        else:
            logger.info(f"✅ Successfully fetched {max_results} results for '{keyword}'")

        return final_results

    except Exception as e:
        logger.error(f"Serper search failed for '{keyword}': {e}")
        return all_results[:max_results] if all_results else []
