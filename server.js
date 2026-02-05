const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// --- Helper: Validate YouTube URL ---
const isYoutubeUrl = (url) => {
    return ytdl.validateURL(url);
};

// --- API: Smart Search ---
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: "Query is required" });

        let results = [];

        // 1. Direct URL Mode
        if (isYoutubeUrl(query)) {
            const info = await ytdl.getBasicInfo(query);
            const videoDetails = info.videoDetails;
            
            results.push({
                type: 'video',
                title: videoDetails.title,
                url: videoDetails.video_url,
                thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url, // Highest res
                timestamp:  new Date(videoDetails.lengthSeconds * 1000).toISOString().substr(11, 8),
                author: { name: videoDetails.author.name }
            });
        } 
        // 2. Keyword Search Mode
        else {
            const r = await ytSearch(query);
            // Get top 5 videos
            results = r.videos.slice(0, 5).map(video => ({
                type: 'video',
                title: video.title,
                url: video.url,
                thumbnail: video.thumbnail,
                timestamp: video.timestamp,
                author: { name: video.author.name }
            }));
        }

        res.json({ success: true, results });

    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch results. Check server logs." });
    }
});

// --- API: Download Stream ---
app.get('/api/download', async (req, res) => {
    try {
        const { url, type, quality } = req.query;

        if (!ytdl.validateURL(url)) {
            return res.status(400).send('Invalid YouTube URL');
        }

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Sanitize filename
        
        let format;
        let contentType;
        let extension;

        if (type === 'mp3') {
            // Audio Only
            format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
            contentType = 'audio/mpeg';
            extension = 'mp3';
        } else {
            // Video (MP4)
            // Note: ytdl-core standard muxed formats are usually limited to 720p. 
            // 1080p usually requires ffmpeg merging (video-only stream + audio-only stream).
            // We use 'filter' to find the best available video+audio combo.
            
            // Attempt to filter by user quality preference if available in pre-muxed formats
            const availableFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
            
            // Simple logic to find closest match or fallback to highest
            if (quality === '1080p') {
                format = availableFormats.find(f => f.qualityLabel === '1080p') || availableFormats[0];
            } else if (quality === '720p') {
                format = availableFormats.find(f => f.qualityLabel === '720p') || availableFormats[0];
            } else {
                 // 360p or default
                format = availableFormats.find(f => f.qualityLabel === '360p') || availableFormats.find(f => f.qualityLabel === '480p') || availableFormats[0];
            }

            contentType = 'video/mp4';
            extension = 'mp4';
        }

        if (!format) {
            return res.status(404).send('No suitable format found.');
        }

        // Set Headers for Download
        res.header('Content-Disposition', `attachment; filename="${title}.${extension}"`);
        res.header('Content-Type', contentType);

        // Pipe the stream
        ytdl(url, { format: format })
            .pipe(res)
            .on('finish', () => {
                console.log(`Download completed: ${title}`);
            })
            .on('error', (err) => {
                console.error('Stream Error:', err);
                // Can't send JSON here if headers already sent, just end stream
                res.end(); 
            });

    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).send("Server Error: Could not process download.");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Theme: ALONE SONG | Mode: Production Ready`);
});
