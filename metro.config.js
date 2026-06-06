const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Proxy /api/* requests to the tRPC API server on port 3000.
// This lets devices reach the API through Metro's single port (8081),
// so adb-reverse / LAN / tunnel all work with just one reachable port.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      if (!req.url?.startsWith("/api/")) {
        return middleware(req, res, next);
      }

      const proxyReq = http.request(
        {
          hostname: "localhost",
          port: 3000,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: "localhost:3000" },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );

      proxyReq.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
        }
        res.end(JSON.stringify({ error: "API server unavailable" }));
      });

      req.pipe(proxyReq);
    };
  },
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
