import type { NextApiRequest, NextApiResponse } from "next";
import { getPublicKeyPem } from "@/lib/rsaCipher";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  try {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(getPublicKeyPem());
  } catch {
    return res.status(500).json({ error: "PAYLOAD_PUBLIC_KEY no definida" });
  }
}