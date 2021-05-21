var crypto = require("crypto");
var hash = crypto.createHash("sha256");
data = hash.update("password1", "utf-8");
gen_hash = data.digest("hex");
console.log("Hash: " + gen_hash);