import time
from schemas import HNStoryRaw, HNStoryAnalysis, HNTrendAnalysis


def analyze_trends(stories: list[HNStoryRaw], topic: str, limit: int) -> HNTrendAnalysis:
    topic_clean = topic.strip().lower()
    analyzed_stories = []
    relevant_stories = []

    current_time = time.time()

    for story in stories:
        is_relevant = False
        relevance_reasons = []

        # Check title
        if story.title and topic_clean in story.title.lower():
            is_relevant = True
            relevance_reasons.append("Topic found in story title")

        # Check text if available
        if story.text and topic_clean in story.text.lower():
            is_relevant = True
            relevance_reasons.append("Topic found in story text content")

        analysis_item = HNStoryAnalysis(
            story=story,
            is_relevant=is_relevant,
            relevance_reasons=relevance_reasons
        )
        analyzed_stories.append(analysis_item)
        if is_relevant:
            relevant_stories.append(story)

    total_scanned = len(stories)
    relevant_count = len(relevant_stories)

    # Deterministic scoring calculation
    volume_score = 0
    engagement_score = 0
    interactivity_score = 0
    freshness_score = 0
    trend_score = 0

    signals = []
    risks = []

    if relevant_count > 0:
        # 1. Volume Score (max 60 pts)
        # 4 or more relevant stories gives full volume score
        volume_score = min(relevant_count * 15, 60)

        # Calculate averages for relevant stories
        avg_score = sum(s.score for s in relevant_stories) / relevant_count
        avg_comments = sum(s.descendants for s in relevant_stories) / relevant_count
        fresh_stories_count = sum(1 for s in relevant_stories if s.time >= current_time - 86400)
        fresh_percentage = (fresh_stories_count / relevant_count) * 100

        # 2. Engagement Score (max 15 pts)
        if avg_score > 150:
            engagement_score = 15
        elif avg_score > 50:
            engagement_score = 10
        elif avg_score > 10:
            engagement_score = 5

        # 3. Interactivity Score (max 15 pts)
        if avg_comments > 50:
            interactivity_score = 15
        elif avg_comments > 15:
            interactivity_score = 10
        elif avg_comments > 5:
            interactivity_score = 5

        # 4. Freshness Score (max 10 pts)
        if fresh_percentage > 50:
            freshness_score = 10
        elif fresh_percentage > 20:
            freshness_score = 5

        trend_score = volume_score + engagement_score + interactivity_score + freshness_score
        trend_score = min(max(trend_score, 0), 100)

        # Compile signals (Positive attributes)
        signals.append(f"Found {relevant_count} relevant stories matching topic '{topic}'.")
        if avg_score > 100:
            signals.append(f"High engagement: average story upvotes are {avg_score:.1f}.")
        if avg_comments > 30:
            signals.append(f"Active discussions: average comments per story are {avg_comments:.1f}.")
        if fresh_percentage > 40:
            signals.append(f"Fresh interest: {fresh_percentage:.1f}% of relevant stories were posted in the last 24 hours.")

        # Compile risks or limitations (Negative attributes)
        if relevant_count < 3:
            risks.append(f"Low volume: only {relevant_count} relevant stories found in top stories scan.")
        if avg_score < 40:
            risks.append(f"Low engagement: average story upvotes are low ({avg_score:.1f} points).")
        if avg_comments < 10:
            risks.append(f"Quiet discussions: average comment count is low ({avg_comments:.1f} comments).")
        if fresh_percentage < 25:
            risks.append(f"Passing trend: only {fresh_percentage:.1f}% of stories are fresh (posted in the last 24h).")
    else:
        # No relevant stories
        trend_score = 0
        risks.append(f"No stories found matching topic '{topic}' in the scanned top stories.")

    # Determine grade
    if trend_score >= 70:
        grade = "strong"
    elif trend_score >= 40:
        grade = "moderate"
    else:
        grade = "weak"

    return HNTrendAnalysis(
        topic=topic,
        limit=limit,
        total_stories_scanned=total_scanned,
        relevant_stories_count=relevant_count,
        trend_score=trend_score,
        grade=grade,
        signals=signals,
        risks=risks,
        stories=analyzed_stories
    )
