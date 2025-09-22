import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { postId, sessionId } = req.body || {};
    if (!postId || !sessionId) return res.status(400).json({ error: 'missing' });

    await sql`
      insert into likes (post_id, session_id)
      values (${postId}, ${sessionId})
      on conflict (post_id, session_id) do nothing
    `;
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to like' });
  }
}
