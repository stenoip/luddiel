import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { postId, author, text } = req.body || {};
    if (!postId || !author || !text) return res.status(400).json({ error: 'missing' });

    const a = author.slice(0, 64);
    const t = text.slice(0, 500);
    await sql`
      insert into comments (post_id, author, text)
      values (${postId}, ${a}, ${t})
    `;
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to comment' });
  }
}
