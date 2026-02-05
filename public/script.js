const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsArea = document.getElementById('resultsArea');
const loader = document.getElementById('loader');

// --- Event Listeners ---
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// --- Main Search Function ---
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    // UI Reset
    resultsArea.innerHTML = '';
    loader.style.display = 'block';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        loader.style.display = 'none';

        if (data.success && data.results.length > 0) {
            data.results.forEach(video => {
                createVideoCard(video);
            });
        } else {
            resultsArea.innerHTML = `<p style="text-align:center; color:#555;">No results found.</p>`;
        }

    } catch (error) {
        loader.style.display = 'none';
        resultsArea.innerHTML = `<p style="text-align:center; color:var(--danger);">Error fetching data.</p>`;
        console.error(error);
    }
}

// --- Create Video Card UI ---
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';

    // Safe ID for player
    const videoId = video.url.split('v=')[1] || 'video';

    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="${video.thumbnail}" alt="${video.title}">
            <span class="duration-badge">${video.timestamp}</span>
        </div>
        
        <div class="info-container">
            <div>
                <h3 class="video-title">${video.title}</h3>
                <p class="channel-name"><i class="fa-solid fa-user-circle"></i> ${video.author.name}</p>
            </div>

            <iframe id="player-${videoId}" class="embedded-player" 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
            </iframe>

            <div class="controls">
                <button class="btn btn-mp3" onclick="triggerDownload('${video.url}', 'mp3', 'highest', this)">
                    <i class="fa-solid fa-music"></i> MP3
                </button>

                <div style="display:flex; gap:5px; flex:1;">
                    <select class="quality-select" id="qual-${videoId}">
                        <option value="360p">360p (Fast)</option>
                        <option value="720p">720p (HD)</option>
                        <option value="1080p">1080p (FHD)</option>
                    </select>
                    <button class="btn btn-download" onclick="downloadVideo('${video.url}', '${videoId}', this)">
                        <i class="fa-solid fa-video"></i>
                    </button>
                </div>

                <button class="btn" style="background:transparent; border:1px solid #444; color:#aaa;" 
                    onclick="togglePlayer('${videoId}')">
                    <i class="fa-solid fa-play"></i> Preview
                </button>
            </div>
        </div>
    `;

    resultsArea.appendChild(card);
}

// --- Helper: Toggle Player ---
function togglePlayer(id) {
    const player = document.getElementById(`player-${id}`);
    player.style.display = player.style.display === 'block' ? 'none' : 'block';
}

// --- Helper: Handle Video Download Click ---
function downloadVideo(url, id, btn) {
    const quality = document.getElementById(`qual-${id}`).value;
    triggerDownload(url, 'mp4', quality, btn);
}

// --- Core Download Logic ---
function triggerDownload(url, type, quality, btnElement) {
    // 1. UI Loading State
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    btnElement.disabled = true;

    // 2. Create invisible download link
    const apiUrl = `/api/download?url=${encodeURIComponent(url)}&type=${type}&quality=${quality}`;
    
    // We use a hidden iframe or window location to trigger download without leaving page
    // Using window.location is simplest for direct streaming responses
    window.location.href = apiUrl;

    // 3. Reset Button (Timeout used as we can't detect stream start easily from here)
    setTimeout(() => {
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }, 4000);
}
