const axios = require("axios");

async function test() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  console.log("Testing Gemini API...");
  console.log("URL:", url.replace(GEMINI_API_KEY, "HIDDEN_KEY"));
  console.log("Model:", model);

  try {
    const res = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{ text: "Hello" }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Success!", res.data);
  } catch (err) {
    console.error("Status:", err.response?.status);
    console.error("Body:", err.response?.data);
  }
}

test();