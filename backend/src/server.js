import { createApp } from "./app.js";
import { getConfig } from "./config.js";
import { connectDatabase } from "./db.js";

try {
  const config = getConfig();
  const collection = await connectDatabase(config);
  const app = createApp({ collection, config });
  app.listen(config.port, () => console.log(`BrightPath API listening on port ${config.port}`));
} catch (error) {
  console.error("Unable to start BrightPath API:", error);
  process.exitCode = 1;
}
