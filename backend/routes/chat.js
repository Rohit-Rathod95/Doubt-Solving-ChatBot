// backend/routes/chat.js
import express from "express";
import axios from "axios";
import Doubt from "../models/Doubt.js";

const router = express.Router();

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

// Enhanced subject-specific prompts
const PROMPTS = {
  physics: `You are a physics tutor. Solve this step-by-step with clear explanations and include units.

Format your response as:
**Step 1:** [Identify given values and what to find]
**Step 2:** [Choose relevant formula/principle]  
**Step 3:** [Substitute values and calculate]
**Step 4:** [State final answer with proper units]`,

  chemistry: `You are a chemistry tutor. Solve this step-by-step with clear explanations.

Format your response as:
**Step 1:** [Identify given information and reaction/concept]
**Step 2:** [Write relevant equations/formulas]
**Step 3:** [Perform calculations with proper units]
**Step 4:** [State final answer clearly]`,

  mathematics: `You are a math tutor. Solve this step-by-step with clear explanations.

Format your response as:
**Step 1:** [Identify what is given and what to find]
**Step 2:** [Choose appropriate method/formula]
**Step 3:** [Show detailed calculations]
**Step 4:** [State final answer]`,

  biology: `You are a biology tutor. Explain this step-by-step with clear reasoning.

Format your response as:
**Step 1:** [Identify the biological concept/process]
**Step 2:** [Explain the underlying mechanism]
**Step 3:** [Apply to the specific question]
**Step 4:** [Provide clear conclusion]`
};

// Utility functions
const cacheKey = (query, subject) => `${subject}_${query.toLowerCase().slice(0, 50)}`;

const parseResponse = (text) => {
  if (!text || typeof text !== 'string') {
    return { steps: [], finalAnswer: "", explanation: text || "" };
  }

  // Clean up the text and remove HTML tags
  const cleanText = text
    .trim()
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&lt;/g, '<')   // Decode HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');   // Normalize whitespace
  
  // Extract steps using multiple patterns
  const stepPatterns = [
    /\*\*Step\s*(\d+):\*\*\s*([^*]*?)(?=\*\*Step\s*\d+:|\*\*Final|$)/gi,
    /Step\s*(\d+)[:.\-]?\s*([^]*?)(?=Step\s*\d+|Final|Answer:|$)/gi,
    /(\d+)[\.\)]\s*([^]*?)(?=\d+[\.\)]|Final|Answer:|$)/gi
  ];

  let steps = [];
  
  for (const pattern of stepPatterns) {
    const matches = [...cleanText.matchAll(pattern)];
    if (matches.length >= 2) { // Need at least 2 steps
      steps = matches.map(match => ({
        step: parseInt(match[1]) || steps.length + 1,
        text: match[2]
          .trim()
          .replace(/\*\*/g, '') // Remove markdown bold
          .replace(/^\d+[\.\)]\s*/, '') // Remove step numbering
          .substring(0, 800)
      })).filter(step => step.text.length > 15);
      break;
    }
  }

  // If no structured steps found, create from paragraphs
  if (steps.length === 0) {
    const sentences = cleanText.split(/\.\s+(?=[A-Z])|(?:\r?\n){2,}/);
    const meaningfulSentences = sentences
      .filter(s => s.trim().length > 25)
      .slice(0, 6); // Limit to 6 steps max
    
    steps = meaningfulSentences.map((text, i) => ({
      step: i + 1,
      text: text.trim().substring(0, 600)
    }));
  }

  // Extract final answer - look for numerical results or clear conclusions
  const answerPatterns = [
    /(?:Final Answer|Answer|Therefore|Hence|Result)[:=\-]?\s*(.{5,150}?)(?:\.|$)/i,
    /(?:approximately|about|roughly)\s+([\d\.,]+(?:\s*%|\s*[a-zA-Z/\^²³⁰¹²³⁴⁵⁶⁷⁸⁹]+)?)/i,
    /(\d+(?:\.\d+)?(?:\s*[×\*]\s*10\^[\-\d]+)?(?:\s*%|\s*[a-zA-Z/\^²³⁰¹²³⁴⁵⁶⁷⁸⁹]+)?)\s*(?:will remain|remaining|of the|is the)/i
  ];

  let finalAnswer = "";
  for (const pattern of answerPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      finalAnswer = match[1].trim().replace(/\.$/, '');
      break;
    }
  }

  return {
    steps: steps.length > 0 ? steps : [{ step: 1, text: cleanText.substring(0, 1000) }],
    finalAnswer: finalAnswer || "See solution steps above",
    explanation: cleanText
  };
};

const validate = ({ userId, query, subject }) => {
  if (!userId) return "User ID required";
  if (!query || query.length < 5) return "Question too short (min 5 chars)";
  if (query.length > 1500) return "Question too long (max 1500 chars)";
  if (!["physics", "chemistry", "mathematics", "biology"].includes(subject)) {
    return "Invalid subject";
  }
  return null;
};

// POST /api/chat
router.post("/", async (req, res) => {
  const start = Date.now();
  const { userId, query, subject } = req.body;

  console.log(`📥 Request: ${subject} | ${query.length} chars`);

  // Validate
  const error = validate({ userId, query, subject: subject?.toLowerCase() });
  if (error) {
    return res.status(400).json({ success: false, error });
  }

  // Check cache
  const key = cacheKey(query, subject);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    console.log("📦 Cache hit");
    return res.json({ ...cached.data, cached: true });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: "API configuration error" 
      });
    }

    // Create focused prompt
    const prompt = `${PROMPTS[subject] || PROMPTS.mathematics}

Question: ${query}

Important: Keep each step concise but complete. Include all calculations and units where applicable.`;

    console.log("🤖 Calling Gemini API...");

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 1500,
          candidateCount: 1
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
      { 
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const candidate = response.data?.candidates?.[0];
    if (!candidate?.content?.parts?.[0]?.text) {
      return res.status(500).json({ 
        success: false, 
        error: "No response from AI" 
      });
    }

    // Handle safety blocks
    if (candidate.finishReason === "SAFETY") {
      return res.status(400).json({ 
        success: false, 
        error: "Question flagged by safety filters" 
      });
    }

    const responseText = candidate.content.parts[0].text;
    const { steps, finalAnswer } = parseResponse(responseText);

    console.log(`✅ Processed: ${steps.length} steps`);

    const responseData = {
      success: true,
      steps,
      finalAnswer,
      metadata: { 
        subject: subject.toLowerCase(), 
        stepCount: steps.length,
        responseTime: Date.now() - start
      }
    };

    // Cache result
    cache.set(key, { data: responseData, time: Date.now() });

    // Save to database (non-blocking)
    new Doubt({
      userId,
      queryType: "text",
      queryText: query,
      subject: subject.toLowerCase(),
      solutionSteps: steps,
      finalAnswer,
      createdAt: new Date()
    }).save().catch(err => console.warn("DB save failed:", err.message));

    res.json(responseData);

  } catch (err) {
    console.error("❌ Error:", err.message);
    
    let statusCode = 500;
    let errorMessage = "Error processing request";

    if (err.code === 'ECONNABORTED') {
      statusCode = 408;
      errorMessage = "Request timeout - try a shorter question";
    } else if (err.response?.status === 429) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded - please wait";
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

// GET /api/chat/history/:userId
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, subject } = req.query;
    
    const filter = { userId, ...(subject && { subject: subject.toLowerCase() }) };
    const doubts = await Doubt.find(filter)
      .sort({ createdAt: -1 })
      .limit(+limit)
      .select("queryText subject finalAnswer createdAt");

    res.json({ success: true, doubts });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

export default router;