import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

// ==========================================================
// PRIVATE VERIFICATION RULES
// ==========================================================

const TARGET_SONG = "Souls Anchored";
const TARGET_COMBINATION = "SWAGG";
const CORRECT_COLOR = "#0066FF";

// ==========================================================
// MIDDLEWARE
// ==========================================================

app.use(express.json());
app.use(express.static(__dirname));

// ==========================================================
// AUDIO + LOCK VERIFICATION
// ==========================================================

app.post(
  "/api/verify",
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        combination,
        colors
      } = req.body;

      // Check combination
      const combinationVerified =
        combination === TARGET_COMBINATION;

      // Check colors
      let submittedColors = [];

      try {
        submittedColors =
          JSON.parse(colors || "[]");
      } catch {
        submittedColors = [];
      }

      const colorsVerified =
        Array.isArray(submittedColors) &&
        submittedColors.length ===
          TARGET_COMBINATION.length &&
        submittedColors.every(
          color =>
            typeof color === "string" &&
            color.toLowerCase() ===
              CORRECT_COLOR.toLowerCase()
        );

      if (!combinationVerified || !colorsVerified) {
        return res.json({
          verified: false,
          reason: "LOCK_REQUIREMENTS_NOT_MET"
        });
      }

      // Make sure an audio recording was supplied
      if (!req.file) {
        return res.status(400).json({
          verified: false,
          reason: "NO_AUDIO"
        });
      }

      // Make sure the AudD secret exists on Render
      if (!process.env.AUDD_API_TOKEN) {
        console.error(
          "AUDD_API_TOKEN is not configured."
        );

        return res.status(500).json({
          verified: false,
          reason: "SERVER_CONFIGURATION_ERROR"
        });
      }

      // Send the recording to AudD from the server.
      // The API token never goes to the browser.
      const formData = new FormData();

      formData.append(
        "api_token",
        process.env.AUDD_API_TOKEN
      );

      formData.append(
        "file",
        new Blob(
          [req.file.buffer],
          {
            type:
              req.file.mimetype ||
              "audio/webm"
          }
        ),
        req.file.originalname ||
          "recording.webm"
      );

      const auddResponse =
        await fetch(
          "https://api.audd.io/",
          {
            method: "POST",
            body: formData
          }
        );

      if (!auddResponse.ok) {
        console.error(
          "AudD request failed:",
          auddResponse.status
        );

        return res.status(502).json({
          verified: false,
          reason: "AUDIO_SERVICE_ERROR"
        });
      }

      const data =
        await auddResponse.json();

      const title =
        String(
          data?.result?.title || ""
        ).toLowerCase();

      const audioVerified =
        title.includes(
          TARGET_SONG.toLowerCase()
        );

      if (!audioVerified) {
        return res.json({
          verified: false,
          reason: "SONG_NOT_VERIFIED"
        });
      }

      // All verification requirements passed.
      return res.json({
        verified: true
      });

    } catch (error) {
      console.error(
        "Verification error:",
        error
      );

      return res.status(500).json({
        verified: false,
        reason: "VERIFICATION_ERROR"
      });
    }
  }
);

// ==========================================================
// START SERVER
// ==========================================================

app.listen(
  process.env.PORT || 3000,
  () => {
    console.log(
      "EYEOTA server is running"
    );
  }
);
