"""
Serper API integration service
"""
import time
from typing import List, Dict

import requests

from config import Config, logger


def serper_search(keyword: str, location: str, device: str, max_results: int = 30) -> List[Dict]:
    """
    Search Google via Serper API and fetch up to max_results

    Serper API returns max 10 results per call, so we paginate to get more.

    Args:
        keyword: Search keyword
        location: Location code (vn, hanoi, hochiminh, danang)
        device: Device type (desktop, mobile)
        max_results: Maximum number of results to fetch (default 30)

    Returns:
        List of organic search results with actualPosition field

    Raises:
        ValueError: If SERPER_API_KEY not configured

    Examples:
        results = serper_search("seo tools", "vn", "desktop", max_results=30)
        # Returns up to 30 organic results
    """
    if not Config.SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY not configured")

    all_results = []
    results_per_page = 10
    max_pages = min(5, (max_results + results_per_page - 1) // results_per_page)  # Ceiling division

    try:
        for page in range(max_pages):
            start = page * results_per_page

            payload = {
                "q": keyword[:100],  # Limit keyword length
                "gl": location,
                "hl": "vi",
                "device": device,
                "num": results_per_page,
                "page": page + 1,  # Serper uses 1-indexed pages
                "autocorrect": False,
            }

            logger.info(
                f"Serper search: {keyword} | page={page+1} | "
                f"positions {start+1}-{start+results_per_page} | location={location}"
            )

            # Make API request
            r = requests.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": Config.SERPER_API_KEY,
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
                logger.info(f"Serper page {page+1}: No results found, stopping pagination")
                break

            # Add actual position to each result (accounting for pagination)
            for idx, item in enumerate(organic):
                item['actualPosition'] = start + idx + 1

            all_results.extend(organic)
            logger.info(f"Serper page {page+1}: Found {len(organic)} results (total: {len(all_results)})")

            # Stop if we have enough results
            if len(all_results) >= max_results:
                logger.info(f"Reached {len(all_results)} results (≥{max_results}), stopping pagination")
                break

            # Rate limiting: delay between requests
            if page < max_pages - 1 and len(organic) > 0:
                time.sleep(0.5)

        logger.info(f"Serper total: {len(all_results)} results for '{keyword}'")
        return all_results[:max_results]

    except Exception as e:
        logger.error(f"Serper search failed for '{keyword}': {e}")
        return all_results[:max_results] if all_results else []
