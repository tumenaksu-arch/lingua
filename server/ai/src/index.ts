import { buildApp, loadConfig } from "./app.js";

const cfg = loadConfig();
const app = buildApp(cfg);

app.listen({ port: cfg.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
