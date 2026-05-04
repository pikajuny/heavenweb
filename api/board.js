const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const ok = (res, data) => res.status(200).json({ ok: true, result: { success: true, data } });
const fail = (res, error) => res.status(200).json({ ok: true, result: { success: false, error } });

function requireSupabase() {
  if (!supabase) throw new Error('Supabase environment variables are not configured');
  return supabase;
}

function cleanText(value, maxLength, label) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label}을(를) 입력해주세요.`);
  if (text.length > maxLength) throw new Error(`${label}은(는) ${maxLength}자 이하로 입력해주세요.`);
  return text;
}

function mapPost(post, readMap = {}) {
  const seenAt = readMap[post.id] || '';
  const lastCommentAt = post.last_comment_at || '';
  return {
    postId: post.id,
    clubId: post.club_id,
    teamName: post.team_name || '',
    title: post.title,
    body: post.body,
    commentCount: post.comment_count || 0,
    lastCommentAt,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    hasNewComment: !!lastCommentAt && (!seenAt || lastCommentAt > seenAt),
  };
}

function mapComment(comment) {
  return {
    commentId: comment.id,
    postId: comment.post_id,
    clubId: comment.club_id,
    body: comment.body,
    createdAt: comment.created_at,
  };
}

async function listPosts(clubId, limit = 20) {
  const db = requireSupabase();
  clubId = cleanText(clubId, 40, '구단명');
  const max = Math.max(1, Math.min(Number(limit) || 20, 50));

  const { data: posts, error: postError } = await db
    .from('board_posts')
    .select('id, club_id, team_name, title, body, comment_count, last_comment_at, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(max);
  if (postError) throw postError;

  const postIds = (posts || []).map(post => post.id);
  let readMap = {};
  if (postIds.length) {
    const { data: reads, error: readError } = await db
      .from('board_reads')
      .select('post_id, seen_at')
      .eq('club_id', clubId)
      .in('post_id', postIds);
    if (readError) throw readError;
    readMap = (reads || []).reduce((map, row) => {
      map[row.post_id] = row.seen_at;
      return map;
    }, {});
  }

  return (posts || []).map(post => mapPost(post, readMap));
}

async function createPost(clubId, teamName, title, body) {
  const db = requireSupabase();
  clubId = cleanText(clubId, 40, '구단명');
  title = cleanText(title, 80, '제목');
  body = cleanText(body, 3000, '내용');
  teamName = String(teamName || '').trim();

  const { data: post, error } = await db
    .from('board_posts')
    .insert([{ club_id: clubId, team_name: teamName, title, body }])
    .select('id, club_id, team_name, title, body, comment_count, last_comment_at, created_at, updated_at')
    .single();
  if (error) throw error;

  await db.from('board_reads').upsert({
    club_id: clubId,
    post_id: post.id,
    seen_at: new Date().toISOString(),
  });

  return mapPost(post);
}

async function getPost(clubId, postId) {
  const db = requireSupabase();
  clubId = cleanText(clubId, 40, '구단명');
  postId = cleanText(postId, 80, '글ID');

  const { data: post, error: postError } = await db
    .from('board_posts')
    .select('id, club_id, team_name, title, body, comment_count, last_comment_at, created_at, updated_at')
    .eq('id', postId)
    .is('deleted_at', null)
    .single();
  if (postError) throw postError;

  const { data: comments, error: commentError } = await db
    .from('board_comments')
    .select('id, post_id, club_id, body, created_at')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (commentError) throw commentError;

  await db.from('board_reads').upsert({
    club_id: clubId,
    post_id: postId,
    seen_at: new Date().toISOString(),
  });

  return {
    post: mapPost(post),
    comments: (comments || []).map(mapComment),
  };
}

async function addComment(clubId, postId, body) {
  const db = requireSupabase();
  clubId = cleanText(clubId, 40, '구단명');
  postId = cleanText(postId, 80, '글ID');
  body = cleanText(body, 1000, '댓글');

  const { error } = await db
    .from('board_comments')
    .insert([{ club_id: clubId, post_id: postId, body }]);
  if (error) throw error;

  return getPost(clubId, postId);
}

const handlers = {
  listPosts,
  createPost,
  getPost,
  addComment,
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = payload.action;
    const args = Array.isArray(payload.args) ? payload.args : [];
    if (!action || typeof handlers[action] !== 'function') {
      fail(res, 'Unknown board action: ' + (action || ''));
      return;
    }

    const data = await handlers[action].apply(null, args);
    ok(res, data);
  } catch (err) {
    fail(res, err.message || String(err));
  }
};
