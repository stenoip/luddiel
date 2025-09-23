import { createClient } from "@vercel/kv";
import { put, list, del } from "@vercel/blob";

const kv = createClient({
  url: process.env.KV_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const jsonResponse = (res, data, status = 200) => {
  res.setHeader("Content-Type", "application/json");
  res.status(status).send(JSON.stringify(data));
};

const hasRequiredFields = (body, fields) => {
  return fields.every(field => body.hasOwnProperty(field));
};

export default async function handler(req, res) {
  const { pathname } = new URL(req.url);

  res.setHeader("Access-Control-Allow-Origin", "https://stenoip.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  switch (pathname) {
    case "/api/create-upload-url":
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      try {
        const { filename, contentType } = req.body;
        if (!filename || !contentType) return jsonResponse(res, { error: "Missing filename or contentType" }, 400);
        const blob = await put(filename, req.body, { access: "public", addRandomSuffix: true, contentType });
        jsonResponse(res, { uploadUrl: blob.url, blobUrl: blob.url });
      } catch (error) {
        console.error("Error creating upload URL:", error);
        jsonResponse(res, { error: "Failed to create upload URL" }, 500);
      }
      break;

    case "/api/submit":
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      try {
        const { sessionId, author, caption, mediaUrl, mediaType } = req.body;
        if (!hasRequiredFields(req.body, ["sessionId", "author", "caption", "mediaUrl", "mediaType"])) {
          return jsonResponse(res, { error: "Missing required fields" }, 400);
        }
        const postId = crypto.randomUUID();
        const newPost = {
          id: postId,
          author: author.slice(0, 64),
          caption: caption.slice(0, 512),
          media_url: mediaUrl,
          media_type: mediaType,
          created_at: new Date().toISOString(),
          likes_count: 0,
          comments: [],
        };
        await kv.zadd("posts", { score: Date.now(), member: **JSON.stringify(newPost)** });
        jsonResponse(res, { success: true, postId });
      } catch (error) {
        console.error("Error submitting post:", error);
        jsonResponse(res, { error: "Failed to submit post" }, 500);
      }
      break;

    case "/api/feed":
      if (req.method !== "GET") return res.status(405).send("Method Not Allowed");
      try {
        const posts = await kv.zrange("posts", 0, -1, { withScores: false, rev: true });
        const parsedPosts = posts.map(post => **JSON.parse(post)**);
        jsonResponse(res, { posts: parsedPosts });
      } catch (error) {
        console.error("Error fetching feed:", error);
        jsonResponse(res, { error: "Failed to fetch feed" }, 500);
      }
      break;

    case "/api/like":
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      try {
        const { postId } = req.body;
        if (!postId) return jsonResponse(res, { error: "Missing postId" }, 400);
        const posts = await kv.zrange("posts", 0, -1, { withScores: false });
        const postData = posts.find(p => **JSON.parse(p).id** === postId);
        if (!postData) return jsonResponse(res, { error: "Post not found" }, 404);
        const post = **JSON.parse(postData)**;
        post.likes_count = (post.likes_count || 0) + 1;
        await kv.zrem("posts", postData);
        await kv.zadd("posts", { score: new Date(post.created_at).getTime(), member: **JSON.stringify(post)** });
        jsonResponse(res, { success: true });
      } catch (error) {
        console.error("Error liking post:", error);
        jsonResponse(res, { error: "Failed to like post" }, 500);
      }
      break;

    case "/api/comment":
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      try {
        const { postId, author, text } = req.body;
        if (!hasRequiredFields(req.body, ["postId", "author", "text"])) return jsonResponse(res, { error: "Missing required fields" }, 400);
        const posts = await kv.zrange("posts", 0, -1, { withScores: false });
        const postData = posts.find(p => **JSON.parse(p).id** === postId);
        if (!postData) return jsonResponse(res, { error: "Post not found" }, 404);
        const post = **JSON.parse(postData)**;
        if (!post.comments) post.comments = [];
        post.comments.push({ author, text, created_at: new Date().toISOString() });
        await kv.zrem("posts", postData);
        await kv.zadd("posts", { score: new Date(post.created_at).getTime(), member: **JSON.stringify(post)** });
        jsonResponse(res, { success: true });
      } catch (error) {
        console.error("Error adding comment:", error);
        jsonResponse(res, { error: "Failed to add comment" }, 500);
      }
      break;

    default:
      jsonResponse(res, { error: "Not Found" }, 404);
      break;
  }
}
