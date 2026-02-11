"""
General helper utilities
"""
from typing import List, Iterable


def chunked(iterable: List, size: int) -> Iterable[List]:
    """
    Split a list into chunks of specified size

    Args:
        iterable: List to chunk
        size: Size of each chunk

    Yields:
        Chunks of the list

    Examples:
        list(chunked([1,2,3,4,5], 2)) -> [[1,2], [3,4], [5]]
    """
    if size <= 0:
        yield iterable
        return

    for i in range(0, len(iterable), size):
        yield iterable[i:i+size]
