const path = require("path");
const fs = require("fs");

// a hack to restore the symlink to node_modules which ibazel 'loses'
function restoreSymlinks() {
  const runfilesPath = process.env.RUNFILES || "";
  const outputBase = runfilesPath.substring(0, runfilesPath.indexOf("/execroot/"));
  const execRoot = path.join(outputBase, "execroot", "react_webpack");
  const symlinkSrc = path.join(outputBase, "external", "npm", "node_modules");
  const symlinkDest = path.join(execRoot, "node_modules");

  if (!fs.existsSync(symlinkDest)) {
    fs.symlinkSync(symlinkSrc, symlinkDest, "dir");
  }
}

module.exports = (env, argv) => ({
  mode: argv.mode,
  module: {
    rules: [
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          { loader: "style-loader" },
          {
            loader: "css-loader",
            query: {
              modules: true
            }
          }
        ]
      },
    ]
  },
  devServer: {
    https: false,
    host: "0.0.0.0",
    port: 3000,
    disableHostCheck: true,
    hot: false,
    after: (app, server) => {
      // Listen to STDIN, which is written to by ibazel to tell it to reload.
      // Must check the message so we only bundle after a successful build completes.
      // This is important because either way there is a race condition and webpack fails to rebuild.
      process.stdin.on("data", (data) => {
        if (String(data).includes("IBAZEL_BUILD_COMPLETED SUCCESS")) {
          restoreSymlinks();
          server.middleware.context.rebuild();
          server.sockWrite(server.sockets, "content-changed");
        }
      });
    },
  },
});
