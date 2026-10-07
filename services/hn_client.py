import asyncio
import logging
import time
import xml.etree.ElementTree as ET
from typing import Any
import httpx
from schemas import HNStoryRaw

logger = logging.getLogger("hn_client")

DEFAULT_TIMEOUT_SECONDS = 10.0

class HNClientError(RuntimeError):
    """Raised when the News client encounters network or validation errors."""

async def fetch_top_stories(limit: int, topic: str = "solana", timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS) -> list[HNStoryRaw]:
    if limit <= 0:
        return []

    async with httpx.AsyncClient() as client:
        # Use Google News RSS to get real Web3 / Alpha news
        rss_url = f"https://news.google.com/rss/search?q={topic}&hl=en-US&gl=US&ceid=US:en"
        try:
            response = await client.get(rss_url, timeout=timeout_seconds, headers={'User-Agent': 'Mozilla/5.0'})
            if response.status_code != 200:
                raise HNClientError(f"Failed to retrieve news. HTTP Status: {response.status_code}")
            xml_data = response.text
        except Exception as exc:
            raise HNClientError(f"Network error while connecting to News API: {exc}") from exc

        try:
            root = ET.fromstring(xml_data)
            items = root.findall('.//item')
        except Exception as exc:
            raise HNClientError(f"Error parsing RSS XML: {exc}") from exc

        stories = []
        current_time = int(time.time())
        
        for i, item in enumerate(items[:limit]):
            title = item.find('title')
            link = item.find('link')
            source = item.find('source')
            pubDate = item.find('pubDate')

            title_text = title.text if title is not None else "Unknown Title"
            link_text = link.text if link is not None else ""
            source_text = source.text if source is not None else "News"
            
            # Generate deterministic mock stats based on the title length so it works with the analyzer
            # This simulates "Engagement" and "Interactivity" for the hackathon prototype
            mock_score = (len(title_text) % 50) * 10
            mock_descendants = (len(title_text) % 20) * 5

            try:
                story = HNStoryRaw(
                    id=i + 100000,
                    title=title_text,
                    by=source_text,
                    score=mock_score,
                    time=current_time - (i * 3600), # Simulate freshness
                    url=link_text,
                    descendants=mock_descendants,
                    type="story",
                    text=""
                )
                stories.append(story)
            except Exception as exc:
                logger.error(f"Error parsing news item: {exc}")
                continue

        return stories
