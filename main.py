from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic_settings import BaseSettings, SettingsConfigDict

from schemas import HNRawData, HNTrendAnalysis, HNLLMReportResponse
from services.hn_client import fetch_top_stories, HNClientError
from services.analyzer import analyze_trends
from services.llm_client import generate_llm_report, LLMClientError, settings as llm_settings


class Settings(BaseSettings):
    hn_request_timeout_seconds: float = 5.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Solana Alpha Scout", version="1.0.0")

# Mount static files directory
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "solana-alpha-scout",
        "version": "1.0.0",
        "llm_provider": llm_settings.llm_provider,
    }


@app.get("/hn/raw", response_model=HNRawData)
async def hn_raw(
    limit: int = Query(30, ge=1, le=100),
    topic: str = Query("solana", min_length=1)
) -> HNRawData:
    try:
        stories = await fetch_top_stories(
            limit=limit,
            topic=topic,
            timeout_seconds=settings.hn_request_timeout_seconds
        )
        return HNRawData(stories=stories)
    except HNClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/hn/analyze", response_model=HNTrendAnalysis)
async def hn_analyze(
    topic: str = Query(..., min_length=1),
    limit: int = Query(30, ge=1, le=100)
) -> HNTrendAnalysis:
    raw_data = await hn_raw(limit=limit, topic=topic)
    return analyze_trends(stories=raw_data.stories, topic=topic, limit=limit)


@app.get("/hn/llm-report", response_model=HNLLMReportResponse)
async def hn_llm_report(
    topic: str = Query(..., min_length=1),
    limit: int = Query(30, ge=1, le=100)
) -> HNLLMReportResponse:
    analysis = await hn_analyze(topic=topic, limit=limit)
    prompt = _build_llm_prompt(analysis)

    try:
        report = await generate_llm_report(prompt)
    except LLMClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return HNLLMReportResponse(
        topic=analysis.topic,
        trend_score=analysis.trend_score,
        grade=analysis.grade,
        llm_report=report,
        analysis=analysis
    )


def _build_llm_prompt(analysis: HNTrendAnalysis) -> str:
    return (
        "You are an AI Alpha Scout specializing in the Solana ecosystem and Web3 trends.\n"
        "You analyze real-time Web3 news feeds and social signals to identify early trends for traders and builders.\n"
        "Do not calculate the trend_score yourself; it is provided deterministically by the backend.\n"
        "Explain:\n"
        "1. What Web3/Crypto themes are driving the discussion in these stories (e.g., DeFi, DePIN, Memecoins).\n"
        "2. Is the sentiment around this topic generally bullish or bearish? Why does it have a weak, moderate, or strong trend?\n"
        "3. Highlight the top 3 relevant projects/stories that the user should research for potential alpha.\n"
        "4. Highlight any technical or investment risks related to this trend.\n"
        "5. Note any limitations of this analysis.\n\n"
        f"ANALYSIS_JSON:\n{analysis.model_dump_json(indent=2)}"
    )
