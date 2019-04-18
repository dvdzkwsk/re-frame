const path = require("path")

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: {
    "re-frame.panel": "./src/panel/re-frame.panel.js",
    "re-frame.page-script": "./src/page-script/re-frame.page-script.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
}
