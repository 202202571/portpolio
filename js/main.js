import { createGuestbook, listGuestbooks, validateGuestbook } from './guestbook-api.js';

const $ = (sel) => document.querySelector(sel);

// 사용자·외부 데이터를 innerHTML에 넣기 전에 반드시 거칠 것
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/* ---------- S03 프로젝트 ---------- */
const MAX_PROJECTS = 6;
const dialog = $('#project-dialog');
let projects = [];
let lastTrigger = null;

const fmtMonth = (ym) => ym.replace('-', '.');
const fmtPeriod = ({ start, end }) => `${fmtMonth(start)} ~ ${end ? fmtMonth(end) : '진행 중'}`;
const tags = (list) => `<ul class="tags">${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

async function loadProjects() {
  const list = $('#project-list');
  try {
    const res = await fetch('projects.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    projects = (await res.json())
      .sort((a, b) => b.period.start.localeCompare(a.period.start)) // 최신순
      .slice(0, MAX_PROJECTS);
    list.innerHTML = projects.map((p, i) => `
      <article class="card">
        <img src="${esc(p.thumbnail)}" alt="${esc(p.title)} 썸네일" loading="lazy">
        <div class="card-body">
          <h3>${esc(p.title)}</h3>
          <p class="period">${esc(fmtPeriod(p.period))}</p>
          ${tags(p.tech.slice(0, 3))}
          <button type="button" data-index="${i}">자세히 보기</button>
        </div>
      </article>`).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p class="empty">프로젝트를 불러오지 못했습니다.</p>';
  }
}

function openProject(p, trigger) {
  lastTrigger = trigger;
  $('#pd-content').innerHTML = `
    <h3 id="pd-title">${esc(p.title)}</h3>
    <p class="period">${esc(fmtPeriod(p.period))}</p>
    <h4>개요</h4><p>${esc(p.overview)}</p>
    <h4>사용 기술</h4>${tags(p.tech)}
    <h4>맡은 역할</h4><p>${esc(p.role)}</p>
    <h4>성과와 배운 점</h4><p>${esc(p.result)}</p>
    ${p.github ? `<h4>GitHub</h4><p><a href="${esc(p.github)}" target="_blank" rel="noopener">${esc(p.github)}</a></p>` : ''}`;
  dialog.showModal();
}

$('#project-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-index]');
  if (btn) openProject(projects[btn.dataset.index], btn);
});
$('#pd-close').addEventListener('click', () => dialog.close());
// 창 바깥(backdrop) 클릭: 이벤트 대상이 dialog 자신일 때만
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
// 닫기·바깥 클릭·Esc 모두 여기로 → 보던 카드로 복귀
dialog.addEventListener('close', () => {
  if (!lastTrigger) return;
  lastTrigger.closest('.card').scrollIntoView({ block: 'center' });
  lastTrigger.focus({ preventScroll: true });
});

/* ---------- S05 방명록 ---------- */
const PAGE_SIZE = 10;
const form = $('#gb-form');
const nameInput = $('#gb-name');
const msgInput = $('#gb-message');
const gbList = $('#gb-list');
const moreBtn = $('#gb-more');
const statusEl = $('#gb-status');
let nextToken = null;

const fmtDate = (iso) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
const renderEntry = (g) => `
  <li>
    <div class="meta"><strong>${esc(g.name)}</strong><time datetime="${esc(g.createdAt)}">${esc(fmtDate(g.createdAt))}</time></div>
    <p>${esc(g.message)}</p>
  </li>`;

async function loadGuestbook(reset = false) {
  if (reset) nextToken = null;
  try {
    const res = await listGuestbooks({ limit: PAGE_SIZE, nextToken });
    const html = res.items.map(renderEntry).join('');
    if (reset) gbList.innerHTML = html;
    else gbList.insertAdjacentHTML('beforeend', html);
    nextToken = res.nextToken;
    moreBtn.hidden = !nextToken;
    if (!gbList.children.length) gbList.innerHTML = '<li class="empty">첫 방명록을 남겨 주세요.</li>';
  } catch (err) {
    console.error(err);
    statusEl.textContent = '방명록을 불러오지 못했습니다.';
  }
}

function showErrors(errors) {
  for (const [field, input] of [['name', nameInput], ['message', msgInput]]) {
    $(`#gb-${field}-err`).textContent = errors[field] ?? '';
    input.setAttribute('aria-invalid', String(Boolean(errors[field])));
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  const data = { name: nameInput.value, message: msgInput.value };
  const errors = validateGuestbook(data);
  showErrors(errors);
  if (errors.name || errors.message) {
    (errors.name ? nameInput : msgInput).focus();
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await createGuestbook(data);
    form.reset();
    statusEl.textContent = '등록되었습니다';
    await loadGuestbook(true); // 새 글이 맨 위에 오도록 첫 페이지부터 다시
  } catch (err) {
    console.error(err);
    if (err.errors) showErrors(err.errors);
    else $('#gb-message-err').textContent = '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    btn.disabled = false;
  }
});

moreBtn.addEventListener('click', () => loadGuestbook());

loadProjects();
loadGuestbook(true);
