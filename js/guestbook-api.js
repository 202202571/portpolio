// 방명록 저장소. 지금은 localStorage, 나중에 AppSync(GraphQL, API 키 인증)로 교체.
// 교체 시 createGuestbook / listGuestbooks 본문만 fetch(APPSYNC.endpoint, { headers: { 'x-api-key': APPSYNC.apiKey } })로 바꾸면 되고,
// 반환 형태({ items, nextToken })는 AppSync 목록 응답과 맞춰 두었으므로 main.js는 수정할 필요 없음.
export const APPSYNC = {
  endpoint: '', // 예: https://xxxxxxxx.appsync-api.ap-northeast-2.amazonaws.com/graphql
  apiKey: '',   // 예: da2-xxxxxxxxxxxxxxxx
  region: 'ap-northeast-2',
};

export const LIMITS = { name: 20, message: 200 };

const KEY = 'guestbook';

// 글자 수는 이모지 등도 1자로 세도록 코드포인트 기준
const len = (s) => [...s].length;

// 오류가 없으면 빈 객체. 저장소에서도 다시 검사해 잘못된 데이터가 저장되지 않게 함.
export function validateGuestbook({ name, message }) {
  const errors = {};
  const n = (name ?? '').trim();
  const m = (message ?? '').trim();
  if (!n) errors.name = '이름을 입력해 주세요.';
  else if (len(n) > LIMITS.name) errors.name = `이름은 ${LIMITS.name}자 이하로 입력해 주세요.`;
  if (!m) errors.message = '메시지를 입력해 주세요.';
  else if (len(m) > LIMITS.message) errors.message = `메시지는 ${LIMITS.message}자 이하로 입력해 주세요.`;
  return errors;
}

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createGuestbook({ name, message }) {
  const errors = validateGuestbook({ name, message });
  if (Object.keys(errors).length) throw Object.assign(new Error('invalid'), { errors });

  const item = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: name.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(item);
  localStorage.setItem(KEY, JSON.stringify(all)); // 용량 초과 시 throw → 호출부에서 처리
  return item;
}

// 최신순. nextToken은 AppSync처럼 불투명한 문자열로 취급(여기서는 오프셋).
export async function listGuestbooks({ limit = 10, nextToken = null } = {}) {
  const all = readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const start = Number(nextToken) || 0;
  const end = start + limit;
  return { items: all.slice(start, end), nextToken: end < all.length ? String(end) : null };
}
