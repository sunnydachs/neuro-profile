// Test file: intentionally vulnerable code to evaluate CodeQL and CodeRabbit
// DO NOT MERGE

// 1. XSS via innerHTML (CodeQL should catch: js/xss)
function renderUserInput(userInput) {
  document.getElementById("output").innerHTML = userInput;
}

// 2. eval on user input (CodeQL: js/code-injection)
function calculateExpression(expr) {
  return eval(expr);
}

// 3. SQL injection (would catch in db access patterns, but here we simulate)
function buildQuery(userId) {
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  return query;
}

// 4. Hardcoded credential (CodeQL: js/hardcoded-credentials)
const API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz";
const DB_PASSWORD = "SuperSecret123!@#";

// 5. Insecure randomness (CodeQL: js/insecure-randomness)
function generateToken() {
  return Math.random().toString(36).substring(2);
}

// 6. Command injection risk
function runCommand(cmd) {
  const { exec } = require("child_process");
  exec("ls " + cmd, (err, stdout) => console.log(stdout));
}

// 7. Path traversal
function readUserFile(filename) {
  const fs = require("fs");
  return fs.readFileSync("/data/" + filename, "utf8");
}

// 8. Unsafe deserialization
function parseUserData(serialized) {
  return JSON.parse(serialized);
}

// 9. Cleartext logging of sensitive data
function logAuth(username, password) {
  console.log("Auth attempt:", username, password);
  console.warn("Token: " + API_KEY);
}

// 10. Weak crypto
const crypto = require("crypto");
function hashPassword(pwd) {
  return crypto.createHash("md5").update(pwd).digest("hex");
}

module.exports = {
  renderUserInput,
  calculateExpression,
  buildQuery,
  generateToken,
  runCommand,
  readUserFile,
  parseUserData,
  logAuth,
  hashPassword,
};
