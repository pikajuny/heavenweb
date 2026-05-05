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

function cleanText(value, maxLength, label, required = true) {
  const text = String(value || '').trim();
  if (required && !text) throw new Error(`${label}을(를) 입력해주세요.`);
  if (text.length > maxLength) throw new Error(`${label}은(는) ${maxLength}자 이하로 입력해주세요.`);
  return text;
}

function cleanEmail(email) {
  return cleanText(email, 254, '이메일').toLowerCase();
}

function todayKst() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  const weekdayMap = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };
  return {
    dateKey,
    label: `${parts.year}.${parts.month}.${parts.day} ${weekdayMap[parts.weekday] || parts.weekday}`,
  };
}

async function isAdminEmail(db, email) {
  const { data, error } = await db
    .from('lounge_admins')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function requireAdmin(db, email) {
  if (!(await isAdminEmail(db, email))) throw new Error('권한이 없습니다.');
}

function mapNotepad(row, today) {
  return {
    dateKey: today.dateKey,
    dateLabel: today.label,
    opponent: row?.opponent || '',
    lines: [row?.line1 || '', row?.line2 || '', row?.line3 || ''],
    updatedAt: row?.updated_at || '',
    updatedByEmail: row?.updated_by_email || '',
  };
}

function mapNotice(row) {
  return {
    noticeId: row.id,
    title: row.title,
    body: row.body || '',
    authorEmail: row.author_email || '',
    authorName: row.author_name || row.author_email || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getTodayNotepad(db, today) {
  const { data, error } = await db
    .from('lounge_notepad')
    .select('date_key, opponent, line1, line2, line3, updated_by_email, updated_at')
    .eq('date_key', today.dateKey)
    .maybeSingle();
  if (error) throw error;
  return mapNotepad(data, today);
}

async function listNoticePage(db, limit = 10, offset = 0) {
  const max = Math.max(1, Math.min(Number(limit) || 10, 30));
  const start = Math.max(0, Number(offset) || 0);
  const { data, error } = await db
    .from('lounge_notices')
    .select('id, title, body, author_email, author_name, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(start, start + max);
  if (error) throw error;
  const rows = data || [];
  return {
    notices: rows.slice(0, max).map(mapNotice),
    hasNext: rows.length > max,
    limit: max,
    offset: start,
  };
}

async function getHome(email, limit = 10, offset = 0) {
  const db = requireSupabase();
  email = cleanEmail(email);
  const today = todayKst();
  const [isAdmin, notepad, notices] = await Promise.all([
    isAdminEmail(db, email),
    getTodayNotepad(db, today),
    listNoticePage(db, limit, offset),
  ]);
  return { isAdmin, notepad, notices };
}

async function saveNotepad(email, opponent, line1, line2, line3) {
  const db = requireSupabase();
  email = cleanEmail(email);
  await requireAdmin(db, email);
  const today = todayKst();
  const payload = {
    date_key: today.dateKey,
    opponent: cleanText(opponent, 80, '클럽상대', false),
    line1: cleanText(line1, 120, '알림 1', false),
    line2: cleanText(line2, 120, '알림 2', false),
    line3: cleanText(line3, 120, '알림 3', false),
    updated_by_email: email,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from('lounge_notepad')
    .upsert(payload, { onConflict: 'date_key' })
    .select('date_key, opponent, line1, line2, line3, updated_by_email, updated_at')
    .single();
  if (error) throw error;
  return { notepad: mapNotepad(data, today), isAdmin: true };
}

async function listNotices(email, limit = 10, offset = 0) {
  const db = requireSupabase();
  email = cleanEmail(email);
  const [isAdmin, notices] = await Promise.all([
    isAdminEmail(db, email),
    listNoticePage(db, limit, offset),
  ]);
  return { isAdmin, notices };
}

async function createNotice(email, authorName, title, body) {
  const db = requireSupabase();
  email = cleanEmail(email);
  await requireAdmin(db, email);
  title = cleanText(title, 100, '제목');
  body = cleanText(body, 4000, '내용');
  authorName = cleanText(authorName, 40, '글쓴이', false) || email;
  const { data, error } = await db
    .from('lounge_notices')
    .insert([{ title, body, author_email: email, author_name: authorName }])
    .select('id, title, body, author_email, author_name, created_at, updated_at')
    .single();
  if (error) throw error;
  return { notice: mapNotice(data), isAdmin: true };
}

async function getNotice(email, noticeId) {
  const db = requireSupabase();
  email = cleanEmail(email);
  noticeId = cleanText(noticeId, 80, '공지ID');
  const { data, error } = await db
    .from('lounge_notices')
    .select('id, title, body, author_email, author_name, created_at, updated_at')
    .eq('id', noticeId)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  const isAdmin = await isAdminEmail(db, email);
  return { notice: mapNotice(data), isAdmin };
}

async function deleteNotice(email, noticeId) {
  const db = requireSupabase();
  email = cleanEmail(email);
  await requireAdmin(db, email);
  noticeId = cleanText(noticeId, 80, '공지ID');
  const { data, error } = await db
    .from('lounge_notices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', noticeId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('삭제할 수 없는 공지입니다.');
  return { noticeId, isAdmin: true };
}

const handlers = {
  getHome,
  saveNotepad,
  listNotices,
  createNotice,
  getNotice,
  deleteNotice,
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
      fail(res, 'Unknown lounge action: ' + (action || ''));
      return;
    }

    const data = await handlers[action].apply(null, args);
    ok(res, data);
  } catch (err) {
    fail(res, err.message || String(err));
  }
};
