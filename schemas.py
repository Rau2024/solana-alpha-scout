from pydantic import BaseModel, Field


class HNStoryRaw(BaseModel):
    id: int
    title: str | None = None
    by: str | None = None
    score: int = 0
    time: int = 0
    url: str | None = None
    descendants: int = 0  # comment count
    type: str = "story"
    text: str | None = None


class HNRawData(BaseModel):
    stories: list[HNStoryRaw] = Field(default_factory=list)


class HNStoryAnalysis(BaseModel):
    story: HNStoryRaw
    is_relevant: bool
    relevance_reasons: list[str] = Field(default_factory=list)


class HNTrendAnalysis(BaseModel):
    topic: str
    limit: int
    total_stories_scanned: int
    relevant_stories_count: int
    trend_score: int
    grade: str
    signals: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    stories: list[HNStoryAnalysis] = Field(default_factory=list)


class HNLLMReportResponse(BaseModel):
    topic: str
    trend_score: int
    grade: str
    llm_report: str
    analysis: HNTrendAnalysis
