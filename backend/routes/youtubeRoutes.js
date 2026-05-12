import express from "express";
import axios from "axios";

const router = express.Router();

// 🔒 Block obvious non-medical searches
const BLOCKED_KEYWORDS = [
  "song",
  "movie",
  "trailer",
  "lyrics",
  "dance",
  "music",
  "album",
  "cinema",
  "film",
];

// 🧠 Medical / rehab context injected into every search
const MEDICAL_CONTEXT =
  "medical health physiotherapy physical therapy rehab rehabilitation exercise treatment recovery hospital clinical education demonstration";

// 🎯 YouTube topic IDs related to medicine / health
const MEDICAL_TOPIC_ID = "/m/01w5h"; // Medicine

router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: "Search query required" });
  }

  // 🔎 Basic keyword blocking
  const lowerQuery = q.toLowerCase();
  if (BLOCKED_KEYWORDS.some(word => lowerQuery.includes(word))) {
    return res.json([]); // silently return nothing
  }

  // 🧬 Inject medical intent into query
  const searchQuery = `${q} ${MEDICAL_CONTEXT}`;

  try {
    const ytRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: searchQuery,
          type: "video",
          maxResults: 15,
          topicId: MEDICAL_TOPIC_ID,
          safeSearch: "strict",
          relevanceLanguage: "en",
          order: "relevance",
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    // 🧹 Clean + normalize response and re-rank locally for better match
    const lowerQueryTerms = lowerQuery
      .split(/\s+/)
      .filter(term => term.length > 2); // drop tiny / stop-words

    const videos = ytRes.data.items
      .filter(item => item.id.videoId) // safety check
      .map(item => {
        const title = item.snippet.title || "";
        const description = item.snippet.description || "";
        const haystack = `${title} ${description}`.toLowerCase();

        // basic relevance score: how many query terms appear in title/description
        const score = lowerQueryTerms.reduce(
          (acc, term) => (haystack.includes(term) ? acc + 1 : acc),
          0
        );

        return {
          videoId: item.id.videoId,
          title,
          description,
          thumbnail:
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.default?.url,
          _score: score,
        };
      })
      // sort by our local relevance score (desc), fall back to API order
      .sort((a, b) => b._score - a._score)
      // trim back to 10 best
      .slice(0, 10)
      // strip internal score field before sending to client
      .map(({ _score, ...rest }) => rest);

    res.json(videos);

  } catch (err) {
    console.error("YouTube API Error:", err.response?.data || err.message);
    res.status(500).json({ message: "YouTube fetch failed" });
  }
});

export default router;