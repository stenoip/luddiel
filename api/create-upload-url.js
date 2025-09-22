import { put } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' });

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
