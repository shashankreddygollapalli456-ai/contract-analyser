const router = require("express").Router();
const controller = require("../controllers/aiController");
const { verifyJWT } = require("/app/shared/auth");
const { handleAnalysisJob } = require("../consumer");

router.get("/api/ai/analysis/contract/:contractId", verifyJWT, controller.getAnalysisByContract);
router.post("/api/ai/chat-answer", controller.chatAnswer);

// Internal endpoint to bypass RabbitMQ locally
router.post("/api/ai/internal/analyze", async (req, res) => {
  try {
    // Run handleAnalysisJob asynchronously in background (do not await, to simulate queue behavior)
    handleAnalysisJob(req.body).catch((err) => {
      console.error("[ai-service] Error handling async analysis job:", err.message);
    });
    res.json({ success: true, message: "Analysis job accepted locally" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
