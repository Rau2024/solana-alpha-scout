import json
import logging
from json import JSONDecodeError
from typing import Any
import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("llm_client")


class LLMClientError(RuntimeError):
    """Raised when an LLM provider cannot generate a trend report."""


class Settings(BaseSettings):
    llm_provider: str = "mock"

    llm_base_url: str = "http://localhost:8001/v1"
    llm_api_key: str = ""
    llm_model: str = ""

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    cohere_api_key: str = ""
    cohere_model: str = "command-a-03-2025"

    alemplus_base_url: str = "https://llm.alem.ai/v1"
    alemplus_api_key: str = ""
    alemplus_model: str = "gemma4"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


async def generate_llm_report(prompt: str) -> str:
    if not prompt.strip():
        raise LLMClientError("LLM prompt must not be empty.")

    provider = settings.llm_provider.strip().lower()

    if provider == "mock":
        return generate_mock_report(prompt)

    if provider == "openai_compatible":
        return await call_openai_compatible(prompt)

    if provider == "ollama":
        return await call_ollama(prompt)

    if provider == "cohere":
        return await call_cohere(prompt)

    if provider == "alemplus":
        return await call_alemplus(prompt)

    raise LLMClientError(
        f"Unsupported LLM_PROVIDER '{provider}'. Use one of: mock, openai_compatible, ollama, cohere, alemplus."
    )


def generate_mock_report(prompt: str) -> str:
    analysis = _extract_analysis_json(prompt)
    topic = analysis.get("topic", "unknown topic")
    score = analysis.get("trend_score", "0")
    grade = analysis.get("grade", "unknown")
    relevant_count = analysis.get("relevant_stories_count", 0)
    stories = analysis.get("stories", [])

    relevant_story_titles = []
    for s in stories:
        if s.get("is_relevant"):
            story_data = s.get("story", {})
            title = story_data.get("title", "Untitled")
            by = story_data.get("by", "unknown")
            upvotes = story_data.get("score", 0)
            url = story_data.get("url") or "#"
            relevant_story_titles.append(f"- [{title}]({url}) (by {by}, {upvotes} points)")

    top_3_recommendations = "\n".join(relevant_story_titles[:3]) if relevant_story_titles else "- No relevant materials found to recommend."

    return (
        "[MOCK LLM REPORT]\n"
        f"Interest in the Web3 project/topic '{topic}' is currently rated as **{grade.upper()}** with a trend score of **{score}/100** based on {relevant_count} relevant posts.\n\n"
        "### Alpha Analysis\n"
        f"The community sentiment shows a {grade} trend for '{topic}'. The scoring rules indicate "
        f"{'strong' if grade == 'strong' else 'moderate' if grade == 'moderate' else 'minimal'} developer and user activity.\n\n"
        "### Recommended Alpha List (Top 3 Mentions)\n"
        f"{top_3_recommendations}\n\n"
        "### Risks & Limitations\n"
        "This evaluation is limited to recent Web3 news sources and serves as early alpha discovery, not financial advice. "
        "No calculations were performed by the LLM itself; this report explains the deterministic data retrieved."
    )


async def call_openai_compatible(prompt: str) -> str:
    if not settings.llm_model:
        raise LLMClientError("LLM_MODEL is required when LLM_PROVIDER=openai_compatible.")

    return await _call_openai_chat_completions(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        prompt=prompt,
        provider_name="OpenAI-compatible provider",
    )


async def call_alemplus(prompt: str) -> str:
    if not settings.alemplus_base_url:
        raise LLMClientError("ALEMPLUS_BASE_URL is required when LLM_PROVIDER=alemplus.")
    if not settings.alemplus_api_key:
        raise LLMClientError("ALEMPLUS_API_KEY is required when LLM_PROVIDER=alemplus.")
    if not settings.alemplus_model:
        raise LLMClientError("ALEMPLUS_MODEL is required when LLM_PROVIDER=alemplus.")

    return await _call_openai_chat_completions(
        base_url=settings.alemplus_base_url,
        api_key=settings.alemplus_api_key,
        model=settings.alemplus_model,
        prompt=prompt,
        provider_name="AlemPlus",
    )


async def call_ollama(prompt: str) -> str:
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }

    data = await _post_json(url=url, payload=payload, headers={}, provider_name="Ollama")
    content = data.get("message", {}).get("content")
    if not content:
        raise LLMClientError("Ollama returned a response without message.content.")
    return content


async def call_cohere(prompt: str) -> str:
    if not settings.cohere_api_key:
        raise LLMClientError("COHERE_API_KEY is required when LLM_PROVIDER=cohere.")
    if not settings.cohere_model:
        raise LLMClientError("COHERE_MODEL is required when LLM_PROVIDER=cohere.")

    url = "https://api.cohere.com/v2/chat"
    payload = {
        "model": settings.cohere_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {settings.cohere_api_key}"}
    data = await _post_json(url=url, payload=payload, headers=headers, provider_name="Cohere")
    return _extract_cohere_text(data)


async def _call_openai_chat_completions(
    *,
    base_url: str,
    api_key: str,
    model: str,
    prompt: str,
    provider_name: str,
) -> str:
    if not base_url:
        raise LLMClientError(f"{provider_name} base URL is required.")

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    data = await _post_json(url=url, payload=payload, headers=headers, provider_name=provider_name)

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMClientError(f"{provider_name} returned an unexpected response shape.") from exc

    if not content:
        raise LLMClientError(f"{provider_name} returned an empty response.")
    return content


async def _post_json(
    *,
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    provider_name: str,
) -> dict[str, Any]:
    request_headers = {"Content-Type": "application/json", **headers}

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, json=payload, headers=request_headers)
    except httpx.RequestError as exc:
        raise LLMClientError(f"{provider_name} request failed: {exc}") from exc

    if response.status_code >= 400:
        body = response.text[:500]
        raise LLMClientError(f"{provider_name} returned {response.status_code}: {body}")

    try:
        return response.json()
    except JSONDecodeError as exc:
        raise LLMClientError(f"{provider_name} returned invalid JSON.") from exc


def _extract_cohere_text(data: dict[str, Any]) -> str:
    message = data.get("message", {})
    content = message.get("content")

    if isinstance(content, str) and content:
        return content

    if isinstance(content, list):
        text_parts = [part.get("text", "") for part in content if isinstance(part, dict)]
        text = "\n".join(part for part in text_parts if part).strip()
        if text:
            return text

    raise LLMClientError("Cohere returned a response without message.content text.")


def _extract_analysis_json(prompt: str) -> dict[str, Any]:
    marker = "ANALYSIS_JSON:"
    start = prompt.find(marker)
    if start == -1:
        return {}

    chunk = prompt[start + len(marker) :].strip()
    try:
        decoder = json.JSONDecoder()
        value, _ = decoder.raw_decode(chunk)
    except JSONDecodeError:
        return {}

    return value if isinstance(value, dict) else {}
