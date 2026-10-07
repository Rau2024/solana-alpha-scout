# Solana Alpha Scout 🕵️‍♂️⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-14F195.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF)](https://solana.com)
[![Hackathon](https://img.shields.io/badge/Colosseum-2026-14F195)](https://colosseum.org)

> An autonomous AI agent that filters Web3 noise, scores trends deterministically, and executes on-chain swaps directly on Solana.

[Live Demo](#) · [Video Walkthrough](#) · [Pitch Deck](#) 

---

## Submission to 2026 Solana Hackathon (Crypto World's Fair)

| Name | Role | Contact |
|------|------|---------|
| Rauan Yelubayeva | Founder & Developer | [Telegram](https://t.me/rau_sunrise) · [GitHub](https://github.com/Rau2024)· [X](https://x.com/ryelubayeva?s=11) | [Linkd](https://linkedin.com/in/rauan-yelubayeva) |

---

## Problem and Solution

### 1. Information Overload & FOMO
- **Problem:** Traders spend 5+ hours daily scrolling through X (Twitter) and Telegram, leading to emotional trading and missed early narratives (FOMO).
- **Solana Alpha Scout:** Deterministically parses Web3 news feeds and calculates a mathematical "Hype Score" in 5 seconds, filtering out the noise.

### 2. High LLM Costs & Hallucinations
- **Problem:** AI bots that scrape entire social media feeds are slow, prone to hallucinations, and expensive to run due to massive token usage.
- **Solana Alpha Scout:** Uses classical backend math (FastAPI) to pre-filter and score data. Only the top 30 relevant stories are sent to the LLM (AlemPlus/OpenAI) for final synthesis, dropping API costs by 95%.

### 3. Lack of Agentic Execution
- **Problem:** Most AI tools just give advice. Users still have to manually open a DEX, find the contract address, and risk buying fake tokens.
- **Solana Alpha Scout:** Fetches real-time price/volume directly from DexScreener and generates a 1-click **"Swap on Jupiter"** deep-link to execute trades instantly.

---

## Why Solana

- **Speed & Ecosystem** — Solana is the only chain where rapid narrative shifts (memecoins, DePIN, DeFi) happen fast enough to require real-time AI scouting.
- **Jupiter DEX** — The unmatched liquidity and UX of Jupiter allows our Agent to confidently route users to a 1-click swap.
- **Low Fees** — Future roadmap includes micro-transactions (Solana Pay) for premium AI reports, which is only viable on Solana.

---

## 💻 How to Run Locally

### 1. Set up the environment
Clone the repository and configure your environment variables:
```bash
cp .env.example .env
```
*(By default, the app runs in `LLM_PROVIDER=mock` mode without API keys so judges can test the UI immediately. For full AI analysis, add your OpenAI/AlemPlus keys).*

### 2. Run the Server
Install dependencies and run the FastAPI server:
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Use the Agent
Open your browser at `http://localhost:8000`.
1. Click **"Connect Phantom"** to authenticate.
2. Enter a token ticker (e.g., `JUP`, `SOL`) and hit **"Generate Report"**.
3. Review the AI analysis and click **"Swap on Jupiter"**!

---

## 🔮 Future Roadmap (Post-Hackathon)
*   **Solana Pay**: Gate premium deep-dive token risk analysis using micro-transactions (USDC).
*   **Telegram Bot Alerts**: Push notifications for tokens crossing a specific "Hype Score".
*   **Solana AI Kit**: Allow the agent to execute limit orders directly on-chain using a managed wallet.
