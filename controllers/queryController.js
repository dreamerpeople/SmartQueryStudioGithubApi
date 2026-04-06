/**
 * @file controllers/queryController.js
 * @description Controller for handling AI-powered search queries and visualization requests.
 * Orchestrates calls between the GitHub Copilot primary agent and the response structuring helper.
 */

const {
  GitHubCopilotClient,
  SYSTEM_PROMPT,
  RESPONSE_HELPER_PROMPT,
} = require("../config/githubCopilotClient");
const axios = require("axios");
const { executeSql } = require("../services/dremioService");
const { getDynamicSchemaContext } = require("../services/schemaService");

/**
 * Fetches current weather data for a given city using Open-Meteo API.
 */
async function getWeather(city) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`;
  const geoRes = await axios.get(geoUrl);
  if (!geoRes.data.results || geoRes.data.results.length === 0) {
    throw new Error("City not found");
  }
  const { latitude, longitude, name } = geoRes.data.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const weatherRes = await axios.get(weatherUrl);
  const weather = weatherRes.data.current_weather;
  return {
    city: name,
    temperature: weather.temperature,
    windspeed: weather.windspeed,
  };
}

/**
 * Fetches top news headlines.
 */
async function getNews(query, category, location) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("NEWS_API_KEY is missing in configuration.");
  }
  let fullQuery = query || "";
  if (location) {
    fullQuery = fullQuery ? `${fullQuery} in ${location}` : location;
  }
  let url;
  if (fullQuery) {
    url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(fullQuery)}&sortBy=publishedAt&apiKey=${apiKey}`;
  } else {
    url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    if (category) url += `&category=${category}`;
  }
  const response = await axios.get(url);
  if (response.data.status !== "ok") {
    throw new Error(response.data.message || "Failed to fetch news.");
  }
  return response.data.articles.slice(0, 5).map(article => ({
    title: article.title,
    source: article.source.name,
    description: article.description,
    url: article.url,
  }));
}

/**
 * Passes original query and system agent result into the helper agent for structuring.
 */
async function callResponseHelper(githubClient, userQuery, systemResponse) {
  try {
    const helperResponse = await githubClient.createChatCompletion({
      messages: [
        { role: "system", content: RESPONSE_HELPER_PROMPT },
        {
          role: "user",
          content: `USER_QUERY: ${userQuery}\n\nSYSTEM_RESPONSE: ${JSON.stringify(
            systemResponse,
          )}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const raw = helperResponse.choices[0]?.message?.content;
    return JSON.parse(raw);
  } catch (err) {
    console.error("[Response Helper Error]", err?.message || err);
    return systemResponse;
  }
}

/**
 * Main entry point for processing AI queries via GitHub Copilot.
 * 
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 */
const handleQuery = async (req, res) => {
  const { prompt } = req.body;
  const githubToken = req.githubToken; // Injected by verifyGitHubSignature middleware
  
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      type: "error",
      message: "Prompt is required and must be a non-empty string.",
    });
  }

  if (!githubToken) {
    return res.status(401).json({
      type: "error",
      message: "Authorization token is missing. Please ensure the request is signed by GitHub.",
    });
  }

  try {
    const githubClient = new GitHubCopilotClient(githubToken);

    // Inject Dynamic Schema
    const dynamicSchema = await getDynamicSchemaContext();

    const finalSystemPrompt = SYSTEM_PROMPT.replace("{{DYNAMIC_SCHEMA}}", dynamicSchema);

    // STEP 1: Main System Agent Logic
    const response = await githubClient.createChatCompletion({
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: prompt.trim() },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });
    
    const raw = response.choices[0]?.message?.content;
    let systemResult;
    try {
      systemResult = JSON.parse(raw);
    } catch {
      systemResult = { type: "conversational", result: raw };
    }

    // STEP 2: Handle Tools 
    if (systemResult.type === "tool_request") {
      if (systemResult.tool === "weather") {
        const city = systemResult?.params?.city;
        if (city) {
          try {
            const weather = await getWeather(city);
            systemResult = { type: "conversational", tool: "weather", data: weather };
          } catch (err) {
            systemResult = { type: "error", message: "Unable to fetch weather data." };
          }
        }
      } else if (systemResult.tool === "dremio") {
        const sql = systemResult?.params?.sql;
        if (sql) {
          try {
            const dataResult = await executeSql(sql);
            systemResult = {
              type: "data_result",
              tool: "dremio",
              data: dataResult.rows,
              query: dataResult.query,
            };
          } catch (err) {
            systemResult = { type: "error", message: "Unable to query database.", query: sql };
          }
        }
      } else if (systemResult.tool === "news") {
        const { query, category, location } = systemResult?.params || {};
        try {
          const news = await getNews(query, category, location);
          systemResult = { type: "news", tool: "news", data: news };
        } catch (err) {
          systemResult = { type: "error", message: "Unable to fetch news data." };
        }
      } else {
        systemResult = { type: "error", message: `Unsupported tool: ${systemResult.tool}` };
      }
    }

    // STEP 3: Pass to Response Helper
    const finalResponse = await callResponseHelper(githubClient, prompt, systemResult);
    return res.json(finalResponse);

  } catch (err) {
    console.error("[GitHub Copilot Client Error]", err?.message || err);
    return res.status(500).json({
      type: "error",
      message: "The GitHub Copilot Agent encountered an unexpected error.",
    });
  }
};

module.exports = { handleQuery };
