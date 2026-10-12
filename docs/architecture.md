# Architecture

## System Overview

**Solana Alpha Scout** sits between Web3 information streams and the Solana blockchain, intercepting market noise and transforming raw social/news momentum into actionable, deterministic on-chain insights and 1-click execution.

```
┌─────────────────┐     ┌────────────────────────────────────────────────────────┐     ┌──────────────────────┐
│ Web3 Signal Feeds│────▶│               Solana Alpha Scout Engine                │────▶│   On-Chain Solana    │
│ (RSS, Crypto API│     │  ┌─────────────────────────┐                           │     │ (Jupiter / Raydium)  │
│  & DexScreener) │     │  │   Pre-Filter & Anti-Scam│                           │     └──────────────────────┘
└─────────────────┘     │  │   Mint Verification     │                           │                ▲
                        │  └────────────┬────────────┘                           │                │
                        │  ┌────────────▼────────────┐                           │                │
                        │  │ Deterministic Scorer    │                           │                │
                        │  │ (Velocity & Engagement) │                           │                │
                        │  └────────────┬────────────┘                           │                │
                        │  ┌────────────▼────────────┐     ┌───────────────────┐ │                │
                        │  │ LLM Narrative Analyst   │────▶│   On-Chain PDA    │─┼────────────────┘
                        │  │ (AlemPlus / OpenAI)     │     │   Report Ledger   │ │  (1-Click Swap Execution)
                        │  └─────────────────────────┘     │   (Anchor Program)│ │
                        │                                  └───────────────────┘ │
                        └────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Ingestion & Pre-Filtering Engine
Continuously aggregates breaking crypto news feeds and on-chain liquidity metadata. Automatically verifies Solana Mint Addresses to prevent fake-token impersonation scams and bad routing.

### 2. Deterministic Scoring Module
A mathematical heuristic engine that evaluates story velocity, discussion depth, and engagement ratios. Produces a normalized **Trend Score (0–100)** independently of LLM hallucinations.

### 3. LLM Narrative Analyst (AlemPlus / Multi-Provider)
Interprets the structured market data, identifies underlying narratives (DeFi, DePIN, AI, Memes), evaluates sentiment, and highlights technical/liquidity risks with research pointers.

### 4. Anchor Program (`programs/alpha_scout`)
A native Solana smart contract that enables autonomous AI agents to record high-confidence trend reports directly to Program Derived Addresses (PDAs) on Solana for trustless verification.

### 5. Jupiter DEX Swap Gateway
Deep-links verified token mint addresses directly into Jupiter Exchange with optimized slippage and dynamic routing.

## Performance & Latency

| Operation | Latency |
|---|---|
| On-Chain DexScreener Pool Lookup | 150–250 ms |
| Deterministic Trend Scoring | < 15 ms |
| AI Narrative Synthesis | 1.8–3.2 s |
| Jupiter Swap Deep-Link Resolution | Instant |
