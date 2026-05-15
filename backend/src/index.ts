import app from "./app.js";
import { createServer } from "http";
import env from "./core/config/env.js";

function main() {
  try {
    const PORT: number = env.PORT || 3000;
    const server = createServer(app());

    server.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
    });

    process.on("SIGINT", () => {
      console.log("Received SIGINT. Shutting down gracefully...");
      server.close(() => {
        console.log("Server closed. Exiting process.");
        process.exit(0);
      });
    });

    process.on("SIGTERM", () => {
      console.log("Received SIGTERM. Shutting down gracefully...");
      server.close(() => {
        console.log("Server closed. Exiting process.");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
