import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader("Access-Control-Allow-Origin", "https://stenoip.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // ---------------------

  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType required' });
    }

    const key = `media/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;
    const { url: uploadUrl, pathname } = await put(key, null, {
      access: 'public',
      contentType,
      multipart: true
    });

    const blobUrl = `https://blob.vercel-storage.com${pathname}`;
    res.status(200).json({ uploadUrl, blobUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create upload URL' });
  }
}
