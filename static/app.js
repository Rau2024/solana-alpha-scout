document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const healthBadge = document.getElementById("health-badge");
    const topicInput = document.getElementById("topic-input");
    const limitInput = document.getElementById("limit-input");
    const limitVal = document.getElementById("limit-val");
    
    const btnRaw = document.getElementById("btn-raw");
    const btnAnalyze = document.getElementById("btn-analyze");
    const btnReport = document.getElementById("btn-report");
    const btnCopyReport = document.getElementById("btn-copy-report");
    const btnCopyJson = document.getElementById("btn-copy-json");
    
    const statusPlaceholder = document.getElementById("status-placeholder");
    const metricsPanel = document.getElementById("metrics-panel");
    const signalsRisksPanel = document.getElementById("signals-risks-panel");
    const reportPanel = document.getElementById("report-panel");
    const storiesPanel = document.getElementById("stories-panel");
    const jsonPanel = document.getElementById("json-panel");
    
    const trendScoreValue = document.getElementById("trend-score-value");
    const trendGrade = document.getElementById("trend-grade");
    const matchRatio = document.getElementById("match-ratio");
    
    const signalsList = document.getElementById("signals-list");
    const risksList = document.getElementById("risks-list");
    const llmReportText = document.getElementById("llm-report-text");
    const storiesList = document.getElementById("stories-list");
    const jsonRenderer = document.getElementById("json-renderer");
    
    const btnConnectWallet = document.getElementById("btn-connect-wallet");
    
    // Phantom Wallet Integration
    let walletAddress = null;
    
    async function connectWallet() {
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                walletAddress = resp.publicKey.toString();
                btnConnectWallet.innerHTML = `<i class="fa-solid fa-check"></i> ${walletAddress.substring(0,4)}...${walletAddress.substring(walletAddress.length-4)}`;
                btnConnectWallet.classList.replace("btn-primary", "btn-success");
                btnConnectWallet.style.backgroundColor = "#10b981";
                btnConnectWallet.style.color = "#fff";
                btnConnectWallet.style.borderColor = "#10b981";
            } catch (err) {
                console.error("User rejected the request or error occurred.", err);
            }
        } else {
            window.open("https://phantom.app/", "_blank");
        }
    }
    
    btnConnectWallet.addEventListener("click", connectWallet);
    
    // Auto-connect if already trusted
    if (window.solana && window.solana.isPhantom) {
        window.solana.connect({ onlyIfTrusted: true })
            .then(({ publicKey }) => {
                walletAddress = publicKey.toString();
                btnConnectWallet.innerHTML = `<i class="fa-solid fa-check"></i> ${walletAddress.substring(0,4)}...${walletAddress.substring(walletAddress.length-4)}`;
                btnConnectWallet.style.backgroundColor = "#10b981";
            })
            .catch(() => { /* Not trusted yet */ });
    }

    const tabRelevant = document.getElementById("tab-relevant");
    const tabAll = document.getElementById("tab-all");
    const progressCircle = document.querySelector(".progress-ring__circle");
    
    // State values
    let currentStories = [];
    let currentTopic = "";
    let activeTab = "relevant"; // relevant | all
    let lastResponseJson = null;

    // Initialize Progress Ring
    const circumference = 2 * Math.PI * 42;
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }

    function setProgress(percent) {
        if (!progressCircle) return;
        const offset = circumference - (percent / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    // Limit Slider Update
    limitInput.addEventListener("input", (e) => {
        limitVal.textContent = e.target.value;
    });

    // Check Service Health
    async function checkHealth() {
        try {
            const res = await fetch("/health");
            const data = await res.json();
            if (res.ok && data.status === "ok") {
                healthBadge.innerHTML = `<span class="status-dot online"></span> API: online (${data.llm_provider})`;
            } else {
                showOfflineBadge();
            }
        } catch (err) {
            showOfflineBadge();
        }
    }

    function showOfflineBadge() {
        healthBadge.innerHTML = `<span class="status-dot offline"></span> API: offline`;
    }

    // Copy to Clipboard utils
    btnCopyReport.addEventListener("click", () => {
        if (llmReportText.textContent) {
            navigator.clipboard.writeText(llmReportText.innerText);
            showToast(btnCopyReport, "Copied!");
        }
    });

    btnCopyJson.addEventListener("click", () => {
        if (jsonRenderer.textContent) {
            navigator.clipboard.writeText(jsonRenderer.textContent);
            showToast(btnCopyJson, "Copied!");
        }
    });

    function showToast(button, text) {
        const originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fa-solid fa-check" style="color: var(--success)"></i>`;
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 1500);
    }

    // Tabs control
    tabRelevant.addEventListener("click", () => {
        activeTab = "relevant";
        tabRelevant.classList.add("active");
        tabAll.classList.remove("active");
        renderStories();
    });

    tabAll.addEventListener("click", () => {
        activeTab = "all";
        tabAll.classList.add("active");
        tabRelevant.classList.remove("active");
        renderStories();
    });

    // Simple Markdown Parser
    function parseMarkdown(md) {
        if (!md) return "";
        let html = md
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Headers
        html = html.replace(/^##### (.*?)$/gm, "<h5>$1</h5>");
        html = html.replace(/^#### (.*?)$/gm, "<h4>$1</h4>");
        html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
        html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
        html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        
        // Links
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // List items
        html = html.replace(/^\s*-\s+(.*?)$/gm, "<li>$1</li>");
        html = html.replace(/^\s*\*\s+(.*?)$/gm, "<li>$1</li>");
        
        // Wrap lists
        html = html.replace(/(<li>.*?<\/li>)+/gs, "<ul>$&</ul>");
        
        // Paragraphs
        html = html.split("\n\n").map(p => {
            const trimmed = p.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<li")) {
                return trimmed;
            }
            return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");

        return html;
    }

    // Set Loading states
    function setGlobalLoading(isLoading) {
        const buttons = [btnRaw, btnAnalyze, btnReport];
        buttons.forEach(btn => {
            if (isLoading) {
                btn.classList.add("disabled");
            } else {
                btn.classList.remove("disabled");
            }
        });

        if (isLoading) {
            statusPlaceholder.classList.remove("hidden");
            statusPlaceholder.innerHTML = `
                <div class="placeholder-content">
                    <i class="fa-solid fa-spinner fa-spin placeholder-icon"></i>
                    <h3>Radar Scanning...</h3>
                    <p>Fetching and analyzing Web3 News and On-Chain data. This can take a few seconds...</p>
                </div>
            `;
            metricsPanel.classList.add("hidden");
            signalsRisksPanel.classList.add("hidden");
            reportPanel.classList.add("hidden");
            storiesPanel.classList.add("hidden");
            jsonPanel.classList.add("hidden");
        }
    }

    // Display Error message
    function showError(message) {
        statusPlaceholder.classList.remove("hidden");
        statusPlaceholder.innerHTML = `
            <div class="placeholder-content" style="color: var(--danger)">
                <i class="fa-solid fa-circle-exclamation placeholder-icon" style="-webkit-text-fill-color: var(--danger)"></i>
                <h3>Scan Failed</h3>
                <p>${message}</p>
            </div>
        `;
    }

    // Render hacker news stories
    function renderStories() {
        storiesList.innerHTML = "";
        
        const filtered = activeTab === "relevant" 
            ? currentStories.filter(s => s.is_relevant)
            : currentStories;

        if (filtered.length === 0) {
            storiesList.innerHTML = `<div class="no-stories-message">No ${activeTab === "relevant" ? "relevant" : ""} stories found.</div>`;
            return;
        }

        filtered.forEach(item => {
            const story = item.story;
            const timeAgo = formatTimeAgo(story.time);
            const domain = story.url ? new URL(story.url).hostname : "Web3 News";
            const relevanceBadge = item.is_relevant 
                ? `<span class="badge badge-relevance">Relevant</span>` 
                : `<span class="badge badge-irrelevance">Skipped</span>`;

            const row = document.createElement("div");
            row.className = "story-row";
            row.innerHTML = `
                <div class="story-details">
                    <div class="story-title">
                        <a href="${story.url || `https://news.ycombinator.com/item?id=${story.id}`}" target="_blank">${escapeHtml(story.title || "Untitled")}</a>
                    </div>
                    <div class="story-meta">
                        <span><i class="fa-solid fa-user"></i> ${escapeHtml(story.by || "none")}</span>
                        <span><i class="fa-solid fa-chevron-up"></i> ${story.score} pts</span>
                        <span><i class="fa-solid fa-comments"></i> ${story.descendants} comments</span>
                        <span><i class="fa-solid fa-clock"></i> ${timeAgo}</span>
                        <span><i class="fa-solid fa-globe"></i> ${domain}</span>
                    </div>
                </div>
                <div class="story-badges">
                    ${relevanceBadge}
                </div>
            `;
            storiesList.appendChild(row);
        });
    }

    // Format UNIX time to human readable
    function formatTimeAgo(unixTimestamp) {
        const seconds = Math.floor(Date.now() / 1000 - unixTimestamp);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Action 1: Raw Stories Fetch
    btnRaw.addEventListener("click", async () => {
        const limit = limitInput.value;
        setGlobalLoading(true);

        try {
            const res = await fetch(`/hn/raw?limit=${limit}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || `Server returned ${res.status}`);
            }
            const data = await res.json();
            lastResponseJson = data;

            statusPlaceholder.classList.add("hidden");
            
            // Populate Stories UI
            currentStories = data.stories.map(story => ({
                story: story,
                is_relevant: false,
                relevance_reasons: []
            }));
            activeTab = "all";
            tabRelevant.classList.remove("active");
            tabRelevant.classList.add("disabled");
            tabAll.classList.add("active");
            
            renderStories();
            storiesPanel.classList.remove("hidden");
            
            // Populate JSON UI
            jsonRenderer.textContent = JSON.stringify(data, null, 2);
            jsonPanel.classList.remove("hidden");

        } catch (err) {
            showError(err.message);
        } finally {
            setGlobalLoading(false);
        }
    });

    // Helper to resolve contract address to token symbol
    async function resolveTopic(inputTopic) {
        // If it looks like a Solana contract address (usually 43-44 chars)
        if (inputTopic.length > 30) {
            try {
                const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(inputTopic)}`);
                if (res.ok) {
                    const data = await res.json();
                    const solPairs = data.pairs?.filter(p => p.chainId === "solana");
                    if (solPairs && solPairs.length > 0) {
                        // Return the actual token symbol (e.g., JUP)
                        return solPairs[0].baseToken.symbol;
                    }
                }
            } catch (e) {
                console.error("Failed to resolve token address", e);
            }
        }
        return inputTopic;
    }

    // Action 2: Analyze Topic Relevance
    btnAnalyze.addEventListener("click", async () => {
        const limit = limitInput.value;
        let topic = topicInput.value.trim();
        if (!topic) {
            alert("Please enter a topic keyword.");
            return;
        }
        
        // Prevent Ethereum/BSC addresses
        if (topic.startsWith("0x")) {
            alert("⚠️ Invalid chain detected. Please enter a valid Solana contract address or token keyword.");
            return;
        }
        
        setGlobalLoading(true);
        topic = await resolveTopic(topic);

        try {
            const res = await fetch(`/hn/analyze?topic=${encodeURIComponent(topic)}&limit=${limit}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || `Server returned ${res.status}`);
            }
            const data = await res.json();
            lastResponseJson = data;

            statusPlaceholder.classList.add("hidden");

            // Update Metrics Panel
            trendScoreValue.textContent = data.trend_score;
            setProgress(data.trend_score);
            trendGrade.textContent = data.grade;
            trendGrade.className = `metric-value grade-badge grade-${data.grade}`;
            matchRatio.textContent = `${data.relevant_stories_count} / ${data.total_stories_scanned}`;
            metricsPanel.classList.remove("hidden");

            // Update Signals & Risks
            signalsList.innerHTML = "";
            if (data.signals.length > 0) {
                data.signals.forEach(sig => {
                    const li = document.createElement("li");
                    li.textContent = sig;
                    signalsList.appendChild(li);
                });
            } else {
                signalsList.innerHTML = `<li>No positive signal metrics matching the rules.</li>`;
            }

            risksList.innerHTML = "";
            if (data.risks.length > 0) {
                data.risks.forEach(risk => {
                    const li = document.createElement("li");
                    li.textContent = risk;
                    risksList.appendChild(li);
                });
            } else {
                risksList.innerHTML = `<li>No severe risks detected by the scan rules.</li>`;
            }
            signalsRisksPanel.classList.remove("hidden");

            // Populate Stories
            currentStories = data.stories;
            tabRelevant.classList.remove("disabled");
            tabRelevant.classList.add("active");
            tabAll.classList.remove("active");
            activeTab = "relevant";
            renderStories();
            storiesPanel.classList.remove("hidden");

            // Populate JSON UI
            jsonRenderer.textContent = JSON.stringify(data, null, 2);
            jsonPanel.classList.remove("hidden");

        } catch (err) {
            showError(err.message);
        } finally {
            setGlobalLoading(false);
        }
    });

    // Action 3: Generate AI Explanation Report
    btnReport.addEventListener("click", async () => {
        const limit = limitInput.value;
        let topic = topicInput.value.trim();
        const originalTopic = topic; // Keep original for DexScreener fetch later
        
        if (!topic) {
            alert("Please enter a topic keyword.");
            return;
        }
        
        // Prevent Ethereum/BSC addresses
        if (topic.startsWith("0x")) {
            alert("⚠️ Invalid chain detected. Please enter a valid Solana contract address or token keyword.");
            return;
        }
        
        setGlobalLoading(true);
        topic = await resolveTopic(topic);

        try {
            const res = await fetch(`/hn/llm-report?topic=${encodeURIComponent(topic)}&limit=${limit}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || `Server returned ${res.status}`);
            }
            const data = await res.json();
            lastResponseJson = data;

            statusPlaceholder.classList.add("hidden");

            // Update Metrics Panel
            trendScoreValue.textContent = data.trend_score;
            setProgress(data.trend_score);
            trendGrade.textContent = data.grade;
            trendGrade.className = `metric-value grade-badge grade-${data.grade}`;
            matchRatio.textContent = `${data.analysis.relevant_stories_count} / ${data.analysis.total_stories_scanned}`;
            metricsPanel.classList.remove("hidden");

            // Update Signals & Risks
            signalsList.innerHTML = "";
            if (data.analysis.signals.length > 0) {
                data.analysis.signals.forEach(sig => {
                    const li = document.createElement("li");
                    li.textContent = sig;
                    signalsList.appendChild(li);
                });
            } else {
                signalsList.innerHTML = `<li>No positive signal metrics matching the rules.</li>`;
            }

            risksList.innerHTML = "";
            if (data.analysis.risks.length > 0) {
                data.analysis.risks.forEach(risk => {
                    const li = document.createElement("li");
                    li.textContent = risk;
                    risksList.appendChild(li);
                });
            } else {
                risksList.innerHTML = `<li>No severe risks detected by the scan rules.</li>`;
            }
            signalsRisksPanel.classList.remove("hidden");

            // Update AI Report Card
            llmReportText.innerHTML = parseMarkdown(data.llm_report);
            reportPanel.classList.remove("hidden");

            // Populate Stories
            currentStories = data.analysis.stories;
            tabRelevant.classList.remove("disabled");
            tabRelevant.classList.add("active");
            tabAll.classList.remove("active");
            activeTab = "relevant";
            renderStories();
            storiesPanel.classList.remove("hidden");

            // Fetch DexScreener Data
            fetchDexScreenerData(originalTopic);

            // Populate JSON UI
            jsonRenderer.textContent = JSON.stringify(data, null, 2);
            jsonPanel.classList.remove("hidden");

        } catch (err) {
            showError(err.message);
        } finally {
            setGlobalLoading(false);
        }
    });

    async function fetchDexScreenerData(topic) {
        const onchainPanel = document.getElementById("onchain-panel");
        const dexContent = document.getElementById("dex-content");
        
        try {
            const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(topic)}`);
            if (!res.ok) return;
            const data = await res.json();
            
            // Filter for Solana pairs
            const solPairs = data.pairs?.filter(p => p.chainId === "solana");
            
            if (solPairs && solPairs.length > 0) {
                const topPair = solPairs[0];
                const price = parseFloat(topPair.priceUsd).toFixed(4);
                const fdv = (topPair.fdv || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                const volume24h = (topPair.volume?.h24 || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                const change24h = topPair.priceChange?.h24 || 0;
                const changeColor = change24h >= 0 ? "#10b981" : "#ef4444";
                
                dexContent.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 1.1rem;">${topPair.baseToken.symbol} / ${topPair.quoteToken.symbol}</span>
                        <span style="color: ${changeColor}; font-weight: bold;">${change24h > 0 ? '+' : ''}${change24h}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #94a3b8;">
                        <span>Price: $${price}</span>
                        <span>Vol 24h: ${volume24h}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #94a3b8; margin-bottom: 10px;">
                        <span>FDV: ${fdv}</span>
                        <span>DEX: ${topPair.dexId}</span>
                    </div>
                    <a href="https://jup.ag/swap/USDC-${topPair.baseToken.address}" target="_blank" class="btn btn-primary" style="width: 100%; text-align: center; background-color: #10b981; color: white; border: none; font-weight: bold; padding: 10px; border-radius: 8px; text-decoration: none;">
                        <i class="fa-solid fa-bolt"></i> Swap on Jupiter
                    </a>
                `;
                onchainPanel.classList.remove("hidden");
            } else {
                onchainPanel.classList.add("hidden");
            }
        } catch (e) {
            console.error("DexScreener fetch error:", e);
            onchainPanel.classList.add("hidden");
        }
    }

    // Check health initially
    checkHealth();
});
