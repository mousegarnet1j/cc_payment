import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log("=== PAYLOAD_PUBLIC_KEY (entregar a página B) ===");
console.log(publicKey);
console.log("=== PAYLOAD_PRIVATE_KEY (base64, SOLO servidor) ===");
console.log(Buffer.from(privateKey, "utf8").toString("base64"));