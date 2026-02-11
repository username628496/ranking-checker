"""
Domain normalization and parsing utilities
"""
import re
from typing import Optional, List, Tuple
from urllib.parse import urlparse

from .redirect import follow_http_redirects, maybe_meta_refresh


def normalize_host(raw: str) -> Optional[str]:
    """
    Normalize a domain/URL to a clean hostname

    Args:
        raw: Raw domain or URL string

    Returns:
        Normalized hostname (lowercase, no www, no port) or None if invalid

    Examples:
        "https://www.example.com:443/path" -> "example.com"
        "WWW.Example.Com" -> "example.com"
        "example.com/page" -> "example.com"
    """
    if not raw:
        return None

    raw = raw.strip()
    host = ""

    try:
        # Parse as URL if has protocol
        if raw.startswith(("http://", "https://")):
            p = urlparse(raw)
            host = p.netloc
        else:
            # Extract first part before slash
            host = raw.split("/")[0]
    except Exception:
        return None

    # Normalize
    host = host.lower()

    # Remove www prefix
    if host.startswith("www."):
        host = host[4:]

    # Remove port
    if ":" in host:
        host = host.split(":")[0]

    # Validate format
    if not re.match(r"^[a-z0-9][a-z0-9\-._]*[a-z0-9]$", host):
        return None

    return host


def final_host_for_input(host: str) -> Tuple[str, List[str]]:
    """
    Get final destination host after following all redirects (HTTP + meta refresh)

    Args:
        host: Input hostname (without protocol)

    Returns:
        Tuple of (final_host, all_hosts_in_chain)

    Examples:
        "bit.ly" -> ("google.com", ["bit.ly", "google.com"])
    """
    candidates = [f"https://{host}", f"http://{host}"]
    all_hosts: List[str] = []
    final_host = host

    for u in candidates:
        final_url, chain_hosts, resp = follow_http_redirects(u)
        all_hosts.extend(chain_hosts)

        # Check for meta refresh redirect
        meta = maybe_meta_refresh(resp, final_url)
        if meta:
            final_url2, chain_hosts2, _ = follow_http_redirects(meta)
            all_hosts.extend(chain_hosts2)
            final_url = final_url2

        # Extract final host
        try:
            h = urlparse(final_url).netloc.lower()
            if h.startswith("www."):
                h = h[4:]
            if ":" in h:
                h = h.split(":")[0]
            if h:
                final_host = h
        except Exception:
            pass

    all_hosts.append(final_host)
    all_hosts = list(dict.fromkeys(all_hosts))  # Remove duplicates, preserve order
    return final_host, all_hosts


def final_host_of_url(url: str) -> Optional[str]:
    """
    Get final destination host of a full URL after redirects

    Args:
        url: Full URL to follow

    Returns:
        Final hostname or None if error

    Examples:
        "https://bit.ly/123" -> "google.com"
    """
    final_url, _, resp = follow_http_redirects(url)

    # Check meta refresh
    meta = maybe_meta_refresh(resp, final_url)
    if meta:
        final_url, _, _ = follow_http_redirects(meta)

    try:
        h = urlparse(final_url).netloc.lower()
        if h.startswith("www."):
            h = h[4:]
        if ":" in h:
            h = h.split(":")[0]
        return h or None
    except Exception:
        return None
