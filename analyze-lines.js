const jsonArray = "[\r\n  {\r\n    \"name\": \"test\"\r\n  }\r\n]\r\n";

// Split by newline
const lines = jsonArray.split('\n');
console.log("Lines in JSON array:");
lines.forEach((line, i) => {
  const trimmed = line.trim();
  console.log(`${i}: "${trimmed}" - first char: ${trimmed.length > 0 ? trimmed.charCodeAt(0) : 'empty'}`);
});
