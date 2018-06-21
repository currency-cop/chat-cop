const path = require('path')
const resource = (filename) => path.join(__dirname, "resources", filename)

module.exports = {
  "electronPackagerConfig": {
    "asar": true,
    "quiet": true,
    "protocol": "chatcop://",
    "icon": resource("icon.ico")
  },
  "electronWinstallerConfig": {
    "icon": resource("icon.ico"),
    "setupIcon": resource("icon.ico"),
    "loadingGif": resource("installer.gif")
  }
}