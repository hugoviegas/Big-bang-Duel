// Test player code generation logic
function generateRandomHex() {
  const chars = "0123456789ABCDEF";
  let result = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    result += chars[array[i] % 16];
  }
  return result;
}

function generateUniquePlayerCode() {
  const code = `#${generateRandomHex()}`;
  console.log("Generated player code:", code);
  return code;
}

// Test it
console.log("Testing player code generation:");
for (let i = 0; i < 5; i++) {
  generateUniquePlayerCode();
}
