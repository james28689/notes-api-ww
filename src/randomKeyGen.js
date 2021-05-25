module.exports.genTimeKey = () => {
    let date = new Date();
    return require("crypto").createHash("sha256").update(date.toISOString(), "utf-8").digest("hex") + Math.floor(Math.random() * 1048576).toString(16);
}