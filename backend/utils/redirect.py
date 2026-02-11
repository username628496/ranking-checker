"""
HTTP redirect handling utilities
"""
import re
from typing import List, Tuple, Optional
from urllib.parse import urlparse, urljoin

import requests

from config import Config


def follow_http_redirects(url: str) -> Tuple[str, List[str], Optional[requests.Response]]:
    """
    Follow HTTP redirects (301, 302, etc.) and return final URL

    Args:
        url: Starting URL

    Returns:
        Tuple of (final_url, chain_of_hosts, response_object)

    Examples:
        "http://example.com" -> ("https://www.example.com", ["example.com", "www.example.com"], <Response>)
    """
    chain_hosts: List[str] = []
    headers = {"User-Agent": Config.USER_AGENT}

    try:
        r = requests.get(
            url,
            headers=headers,
            timeout=Config.REQUEST_TIMEOUT,
            allow_redirects=True,
            verify=True
        )

        # Extract hosts from redirect history
        for h in r.history:
            try:
                host = urlparse(h.url).netloc.lower()
                if host.startswith("www."):
                    host = host[4:]
                if ":" in host:
                    host = host.split(":")[0]
                chain_hosts.append(host)
            except Exception:
                pass

        # Extract final host
        try:
            last_host = urlparse(r.url).netloc.lower()
            if last_host.startswith("www."):
                last_host = last_host[4:]
            if ":" in last_host:
                last_host = last_host.split(":")[0]
            chain_hosts.append(last_host)
        except Exception:
            pass

        # Remove duplicates while preserving order
        chain_hosts = list(dict.fromkeys(chain_hosts))

        return r.url, chain_hosts, r

    except requests.RequestException:
        return url, chain_hosts, None


# Regex to detect meta refresh redirects
META_REFRESH_RE = re.compile(
    r'<meta[^>]+http-equiv=["\']?refresh["\']?[^>]*content=["\']?\s*\d+\s*;\s*url=([^"\'>\s]+)',
    re.I
)


def maybe_meta_refresh(resp: Optional[requests.Response], base_url: str) -> Optional[str]:
    """
    Check if response contains a meta refresh redirect

    Args:
        resp: HTTP response object
        base_url: Base URL for resolving relative redirects

    Returns:
        Redirect URL if found, None otherwise

    Examples:
        Response with '<meta http-equiv="refresh" content="0;url=https://example.com">'
        -> "https://example.com"
    """
    if not resp:
        return None

    try:
        ctype = resp.headers.get("Content-Type", "")

        # Only check HTML responses
        if resp.status_code == 200 and "text/html" in ctype:
            # Only read first 4KB to avoid memory issues
            text = resp.text[:4096]

            m = META_REFRESH_RE.search(text)
            if m:
                # Extract URL and clean quotes
                nxt = m.group(1).strip(' "\'' )
                # Resolve relative URLs
                return urljoin(base_url, nxt)

    except Exception:
        pass

    return None
