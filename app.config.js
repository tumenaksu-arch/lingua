// Extends app.json. The web build is served from a subpath (ankaxai.ai/lingua), but
// `experiments.baseUrl` would also be baked into the Android/iOS bundle, so it is only
// applied when LINGUA_WEB_BASE_URL is set — see scripts/export-web.js.
module.exports = ({ config }) => {
  const baseUrl = process.env.LINGUA_WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
