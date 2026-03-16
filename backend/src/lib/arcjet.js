// lib/arcjet.js ✅ ONLY arcjet config here!
import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";
import { ENV } from "./env.js";

const aj = arcjet({
  key: ENV.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
      ],
    }),
    slidingWindow({
      mode: "LIVE",
      max: 100,
      interval: 60,
    }),
  ],
});

export default aj;
// ✅ NO express, NO app, NO port here!