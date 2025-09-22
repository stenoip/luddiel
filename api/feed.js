import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    const postsRes = await sql`
      select p.*, coalesce(l.cnt, 0)::int as likes_count
      from posts p
      left join (
        select post_id, count(*) as cnt from likes group by post_id
      ) l on l.post_id = p.id
      order by p.created_at desc
      limit 50
    `;
    const posts = postsRes.rows;

    const ids = posts.map(p => p.id);
    let comments = [];
    if (ids.length) {
      const cRes = await sql`
        select post_id, author, text, created_at
        from comments
        where post_id = any(${ids})
        order by created_at asc
      `;
      comments = cRes.rows;
    }

    const map = new Map(posts.map(p => [p.id, { ...p, comments: [] }]));
    for (const c of comments) map.get(c.post_id)?.comments.push(c);

    res.status(200).json({ posts: Array.from(map.values()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load feed' });
  }
}
