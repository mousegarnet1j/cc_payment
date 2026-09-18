// pages/api/bin/lookup.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const bin = (req.query.bin as string)?.replace(/\D/g, "").slice(0, 8);

  if (!bin || bin.length < 6) {
    return res.status(400).json({ error: "BIN inválido" });
  }

  try {
    const response = await fetch(`https://lookup.binlist.net/${bin}`, {
      headers: { "Accept-Version": "3" },
    });

    if (!response.ok) {
      return res.status(404).json({ error: "BIN no encontrado" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Error consultando BIN" });
  }
}