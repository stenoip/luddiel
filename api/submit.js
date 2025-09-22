import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { sessionId, author, caption, mediaUrl, mediaType } = req.body || {};
    if (!mediaUrl || !mediaType) return res.status(400).json({ error: 'media required' });

    const a = (author || 'guest').slice(0, 64);
    const cap = (caption || '').slice(0, 280);

    const { rows } = await sql`
      insert into posts (author, caption, media_url, media_type)
      values (${a}, ${cap}, ${mediaUrl}, ${mediaType})
      returning *
    `;
    res.status(200).json({ post: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create post' });
  }
}
