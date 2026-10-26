/*UI-START*/
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NAV = [['resumo', 'Resumo'], ['requisicoes', 'Requisições'], ['pedidos', 'Pedidos de Compra'], ['materiais', 'Materiais'], ['aprovacoes', 'Aprovações Pendentes'], ['atrasos', 'Atrasos'], ['nova', 'Nova Requisição'], ['admin', 'Administração']];
const NATIONAL = ['2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21', '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25', '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25'];
const HEADERS = ['Nº Requisição', 'Tipo do Movimento', 'Base Aberta', 'Data Abertura', 'Projeto', 'Descrição Material', 'Qtde', 'Status Requisição', 'Data de Aprovação Diretoria', 'Observações', 'Nº Pedido', 'Tipo do Movimento do Pedido', 'Tempo para Entrega (Dias a partir da aprovação)', 'Data Estimada de Entrega', 'Status Geral', 'Solicitante'];
const WEEK = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const TS = {};
let IMP = null;

function semTxt(i) { const c = i.c; return c.apr ? c.apr : (c.stage ? c.stage : ''); }
function bdLbl(k, extra) { const L = BK[k].l; return L + (extra ? ' · ' + extra : ''); }
const bd = (k, extra) => `<span class="bd" style="--c:var(${BK[k].c})">${BK[k].l}${extra ? ' · ' + extra : ''}</span>`;
const itemBd = i => i.st === 'semprev' ? bdSem(semTxt(i), i.c) : bd(i.st, i.parcial ? 'parcial' : '');
function bdSem(nm, c) { const l = (c && c.apr) ? 'Aguardando aprovação · ' + nm : (nm || 'Sem previsão de entrega'); return `<span class="bd" style="--c:var(--teal)">${esc(l)}</span>`; }
const semPlain = i => i.st === 'semprev' ? ((i.c.apr) ? 'Aguardando aprovação · ' + i.c.apr : (i.c.stage || 'Sem previsão de entrega')) : null;
const reqNum = r => r.num || '(sem nº)';
const dt = iso => iso ? fmt(iso) : '—';
const nn = v => v == null ? '—' : nfmt(v);
function toast(m, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 3000); }
const uniq = f => [...new Set(S.C.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));

/* ---------- tabela interativa ---------- */
function mkTable(el, name, cols, rows, o = {}) {
  const st = TS[name] || (TS[name] = { q: '', sk: o.sort != null ? o.sort : null, sd: o.dir || 1, pg: 0 });
  const size = o.size || 15;
  el.innerHTML = `<div class="tb"><input type="search" placeholder="Pesquisar…" value="${esc(st.q)}" aria-label="Pesquisar"><span class="cnt"></span><span class="sp"></span><button class="btn sec sm" data-csv>Exportar CSV</button><button class="btn sec sm" data-copy>Copiar tabela</button></div><div class="tw"><table><thead><tr>${cols.map((c, i) => `<th class="${c.n ? 'n' : ''}" data-ci="${i}">${esc(c.l)}<span></span></th>`).join('')}</tr></thead><tbody></tbody></table></div><div class="pg"></div>`;
  const tbody = $('tbody', el), cnt = $('.cnt', el), pg = $('.pg', el);
  let cur = [];
  const sv = (c, r) => { const v = c.s ? c.s(r) : c.t(r); return v == null ? '' : v; };
  function view() {
    const q = nz(st.q);
    cur = q ? rows.filter(r => cols.some(c => nz(c.t(r)).includes(q))) : rows.slice();
    if (st.sk != null) { const c = cols[st.sk]; cur.sort((a, b) => { const x = sv(c, a), y = sv(c, b); const r = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'pt', { numeric: true }); return r * st.sd; }); }
    const pages = Math.max(1, Math.ceil(cur.length / size)); if (st.pg >= pages) st.pg = pages - 1;
    const slice = cur.slice(st.pg * size, st.pg * size + size);
    tbody.innerHTML = slice.length ? slice.map((r, i) => `<tr data-i="${st.pg * size + i}"${o.rowCls ? ` class="${o.rowCls(r)}"` : ''}>${cols.map(c => `<td class="${c.n ? 'n' : ''} ${c.w ? 'w' : ''}">${c.h ? c.h(r) : esc(c.t(r))}</td>`).join('')}</tr>`).join('') : `<tr><td class="empty" colspan="${cols.length}">${esc(o.empty || 'Nenhum registro para os filtros atuais.')}</td></tr>`;
    cnt.textContent = `${cur.length} registro${cur.length === 1 ? '' : 's'}`;
    pg.innerHTML = pages > 1 ? `<button class="btn sec sm" data-pp ${st.pg === 0 ? 'disabled' : ''}>‹</button> página ${st.pg + 1} de ${pages} <button class="btn sec sm" data-np ${st.pg >= pages - 1 ? 'disabled' : ''}>›</button>` : '';
    $$('th', el).forEach((th, i) => { $('span', th).textContent = st.sk === i ? (st.sd > 0 ? ' ▲' : ' ▼') : ''; });
  }
  el.onclick = e => {
    const th = e.target.closest('th'); if (th) { const i = +th.dataset.ci; if (st.sk === i) st.sd = -st.sd; else { st.sk = i; st.sd = 1; } view(); return; }
    if (e.target.closest('[data-pp]')) { st.pg--; view(); return; }
    if (e.target.closest('[data-np]')) { st.pg++; view(); return; }
    if (e.target.closest('[data-csv]')) { exportCsv(name, [cols.map(c => c.l), ...cur.map(r => cols.map(c => String(c.t(r))))]); return; }
    if (e.target.closest('[data-copy]')) { copyText([cols.map(c => c.l).join('\t'), ...cur.map(r => cols.map(c => String(c.t(r)).replace(/[\t\n\r]+/g, ' ')).join('\t'))].join('\n')); return; }
    const tr = e.target.closest('tr[data-i]'); if (tr && o.onRow) o.onRow(cur[+tr.dataset.i]);
  };
  $('input', el).oninput = e => { st.q = e.target.value; st.pg = 0; view(); };
  view();
}
async function exportCsv(name, rows) {
  const csv = '\ufeff' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  try { const dl = await window.claude.use('downloads'); if (!dl) throw 0; await dl.save({ filename: name.replace(/[^a-z0-9]+/gi, '_') + '_' + S.today + '.csv', data: csv }); }
  catch (e) { if (e && e.code === 'declined') return; copyText(rows.map(r => r.join('\t')).join('\n')); }
}
function copyText(txt) {
  const fallback = () => openModal('Copiar tabela', `<p class="mut">A cópia automática não está disponível aqui. Selecione o texto abaixo e copie (Ctrl+C). Cole no Excel.</p><textarea class="ta" readonly>${esc(txt)}</textarea>`);
  try { navigator.clipboard.writeText(txt).then(() => toast('Tabela copiada. Cole no Excel.'), fallback); } catch (e) { fallback(); }
}
/* ---------- modal ---------- */
function openModal(title, html, o = {}) {
  closeModal();
  const ov = document.createElement('div'); ov.className = 'ov' + (o.drawer ? ' dr' : ''); ov.id = 'ov';
  ov.innerHTML = `<div class="md" role="dialog" aria-label="${esc(title)}"><div class="mh"><h2>${title}</h2><button class="x" data-act="close" aria-label="Fechar">×</button></div><div id="mb">${html}</div></div>`;
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  return ov;
}
function closeModal() { const o = $('#ov'); if (o) o.remove(); document.body.style.overflow = ''; S.openReq = null; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function openList(title, cols, rows, o = {}) {
  const ov = openModal(`${title} <span class="mut" style="font-size:14px;font-weight:500">(${rows.length})</span>`, `<div id="ml"></div>`);
  mkTable($('#ml', ov), 'm:' + title, cols, rows, { onRow: o.onRow || (r => openReq(r.id || (r.c && r.c.id))), size: 12, rowCls: o.rowCls, empty: o.empty });
}

/* ---------- colunas ---------- */
const cItem = {
  req: { l: 'Nº Requisição', t: i => reqNum(i.r) },
  ped: { l: 'Nº Pedido', t: i => pedLabel(i.c) },
  proj: { l: 'Projeto', t: i => i.r.projeto, w: 1 },
  base: { l: 'Base', t: i => i.r.base || '—' },
  desc: { l: 'Descrição do material', t: i => i.it.desc, w: 1 },
  qs: { l: 'Qtd solicitada', n: 1, t: i => i.qtd == null ? '—' : nfmt(i.qtd) + ' ' + i.un, s: i => i.qtd || 0 },
  qr: { l: 'Qtd recebida', n: 1, t: i => i.qtd == null ? '—' : nfmt(i.rec), s: i => i.rec },
  qp: { l: 'Qtd pendente', n: 1, t: i => i.qtd == null ? '—' : nfmt(i.pend), s: i => i.pend },
  qa: { l: 'Qtd atrasada', n: 1, t: i => i.st === 'atr' ? nfmt(i.pend) : '0', s: i => i.st === 'atr' ? i.pend : 0 },
  qc: { l: 'Qtd cancelada', n: 1, t: i => i.qtd == null ? '—' : nfmt(i.canc), s: i => i.canc },
  st: { l: 'Status', t: i => semPlain(i) || (BK[i.st].l + (i.parcial ? ' (parcial)' : '')), h: i => itemBd(i) },
  resp: { l: 'Aprovação pendente', t: i => i.c.apr || (i.c.stage ? i.c.stage : '—') },
  apd: { l: 'Aprovações (data · quem)', t: i => apTxt(i.c), w: 1 },
  est: { l: 'Data estimada', t: i => i.est ? fmt(i.est) : (i.c.dates.length ? i.c.dates.map(fmt).join(' · ') : '—'), s: i => i.est || i.c.dates[0] || '' },
  dias: { l: 'Dias úteis de atraso', n: 1, t: i => i.st === 'atr' ? i.dias : (i.possivel ? 'possível' : '—'), s: i => i.st === 'atr' ? i.dias : 0 },
  sol: { l: 'Solicitante', t: i => i.r.solicitante || '—' },
  obs: { l: 'Observações', t: i => i.r.obs || '', w: 1 },
  un: { l: 'Un.', t: i => i.un },
  mot: { l: 'Motivo / regra', t: i => i.reason || '', w: 1 }
};
const rowCls = i => '';
function approvalsOf(c) {
  const r = c.r, out = []; const seen = new Set();
  const add = (d, n) => { const k = (d || '') + '|' + (n || ''); if (seen.has(k)) return; seen.add(k); out.push({ d, n: n || '' }); };
  (r.movs || []).forEach(m => add(m.d, m.n));
  const mm = (r.statusReq || '').match(/^aprovad[oa]\s+(.+)$/i); const nm = mm ? mm[1].trim() : '';
  const ds = (r.aprovDatas || []).filter(Boolean);
  if (!(r.movs || []).length) ds.forEach(d => add(d, ds.length === 1 ? nm : ''));
  (r.ap || []).forEach(a => add(a.d, a.n));
  return out.sort((a, b) => (a.d || '').localeCompare(b.d || ''));
}
const apTxt = c => approvalsOf(c).map(a => (a.d ? fmt(a.d) : '?') + (a.n ? ' · ' + a.n : '')).join(' | ') || c.r.aprovTxt || '—';
const lastApproval = (r, extra) => [...(r.aprovDatas || []), ...(r.movs || []).map(m => m.d), ...(r.ap || []).map(a => a.d), ...(extra || [])].filter(Boolean).sort().pop() || null;

/* ---------- filtros ---------- */
function opts(list, sel, all) { return `<option value="">${all || 'Todos'}</option>` + list.map(v => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join(''); }
function filtersHTML() {
  const F = S.F, n = Object.keys(F).filter(k => F[k] && k !== 'un').length;
  const sel = (k, l, list, all) => `<label>${l}<select data-f="${k}">${opts(list, F[k], all)}</select></label>`;
  const dtp = (k, l) => `<label>${l}<input type="date" data-f="${k}" value="${esc(F[k] || '')}"></label>`;
  return `<details class="filters" id="flt"${S.fopen ? ' open' : ''}><summary>Filtros <span class="chip-n">${n}</span></summary><div class="fgrid">
  <label>Unidade dos totais<select data-f="un">${S.units.map(u => `<option${(F.un || S.units[0]) === u ? ' selected' : ''}>${esc(u)}</option>`).join('')}</select></label>
  ${dtp('from', 'Abertura de')}${dtp('to', 'Abertura até')}
  ${sel('proj', 'Projeto', uniq(c => c.r.projeto))}${sel('base', 'Base', uniq(c => c.r.base))}${sel('solic', 'Solicitante', uniq(c => c.r.solicitante))}
  ${sel('mov', 'Tipo de movimento', uniq(c => c.r.mov))}${sel('sreq', 'Status da requisição', ['Aprovado', 'Aguardando aprovação', 'Aguardando pedido de compra', 'Aguardando cotação', 'Aguardando outra etapa', 'Cancelado', 'Outro / não informado'])}
  <label>Status do pedido<select data-f="sped"><option value="">Todos</option>${Object.entries(BK).map(([k, v]) => `<option value="${k}"${F.sped === k ? ' selected' : ''}>${v.l}</option>`).join('')}</select></label>
  <label>Situação do material<select data-f="sit"><option value="">Todas</option>${Object.entries(BK).map(([k, v]) => `<option value="${k}"${F.sit === k ? ' selected' : ''}>${v.l}</option>`).join('')}</select></label>
  ${sel('apr', 'Responsável pela aprovação', uniq(c => c.apr))}
  ${dtp('estFrom', 'Entrega estimada de')}${dtp('estTo', 'Entrega estimada até')}
  <button class="btn sec clr" data-act="clr">Limpar filtros</button></div></details>`;
}
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.sit !== undefined) { const lf = t.form.querySelector('[data-falta]'); if (lf) lf.hidden = t.value === 'concl'; }
  if (t.dataset && t.dataset.f) { S.F[t.dataset.f] = t.value || undefined; render(); }
  else if (t.id === 'imp-file') handleFile(t.files[0]);
  else if (t.id === 'logo-file') setLogo(t.files[0]);
});
document.addEventListener('toggle', e => { if (e.target.id === 'flt') S.fopen = e.target.open; }, true);

/* ---------- páginas ---------- */
function head(title, extra) {
  const l = S.imps[0];
  const d = new Date(); const wd = WEEK[new Date(D(S.today) * 864e5).getUTCDay()];
  return `<div class="top"><h1>${title}</h1>${extra || ''}<div class="meta">Hoje: ${wd}, ${fmt(S.today)}<br>${l ? `Última atualização da base: ${new Date(l.ts).toLocaleString('pt-BR', { timeZone: S.cfg.tz })} · ${esc(l.origem || '')}` : 'Base ainda não importada'}</div></div>`;
}
function qtyKpi(label, key, st, un, cls, sub) {
  return `<button class="kpi ${cls || ''}" data-act="card" data-k="${key}"><div class="l">${label}</div><div class="v">${nfmt(st.q[key] != null ? st.q[key] : 0)}<small>${esc(un)}</small></div><div class="s">${sub}</div></button>`;
}
function pageResumo() {
  const un = S.F.un || S.units[0];
  const { rows, reqs } = applyFilters(); const st = stats(rows, reqs, un);
  S.cur = { rows, reqs, st, un };
  const atr = rows.filter(i => i.st === 'atr'), pos = rows.filter(i => i.st === 'val' && i.possivel);
  const q = st.q, tot = q.rec + q.pend + q.atr + q.canc;
  const pb = ['rec', 'pend', 'atr', 'canc'].map(k => ({ k, l: BK[k].l, n: q[k], c: BK[k].c }));
  const pedBars = [['rec', 'Recebido'], ['pend', 'Pendente'], ['atr', 'Atrasado'], ['canc', 'Cancelado'], ['semprev', 'Aguardando aprovação'], ['val', 'A validar']].map(([k, l]) => ({ k, l, n: st.pc[k], c: BK[k].c }));
  const max = Math.max(1, ...pedBars.map(d => d.n));
  const byAprTxt = Object.entries(st.byApr).map(([n, v]) => `${esc(n)} ${v}`).join(' · ') || 'nenhuma';
  const R = 70, C = 2 * Math.PI * R; let off = 0;
  const segs = pb.filter(p => p.n > 0).map(p => { const len = p.n / tot * C; const s = `<circle data-act="seg" data-k="${p.k}" r="${R}" cx="100" cy="100" fill="none" stroke="var(${p.c})" stroke-width="30" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"><title>${p.l}: ${nfmt(p.n)} ${esc(un)}</title></circle>`; off += len; return s; }).join('');
  return head('Resumo') + filtersHTML() + `<div class="res">
  <div class="kpis">
    <button class="kpi" data-act="card" data-k="req"><div class="l">Total de requisições</div><div class="v">${reqs.length}</div><div class="s">${st.semPed} sem nº de pedido</div></button>
    <button class="kpi" data-act="card" data-k="ped"><div class="l">Total de pedidos</div><div class="v">${st.peds.size}</div><div class="s">nº únicos e válidos</div></button>
    ${qtyKpi('Materiais recebidos', 'rec', st, un, '', st.nIt.rec + ' itens')}
    ${qtyKpi('Materiais pendentes', 'pend', st, un, '', 'no prazo · + ' + nfmt(q.semprev) + ' aguardando aprovação')}
    ${qtyKpi('Materiais atrasados', 'atr', st, un, 'k-atr', st.nIt.atr + ' itens')}
    <button class="kpi" data-act="card" data-k="apr"><div class="l">Aprovações pendentes</div><div class="v">${st.apr.length}</div><div class="s">${byAprTxt}</div></button>
    <button class="kpi" data-act="card" data-k="pct"><div class="l">Percentual de recebimento</div><div class="v">${st.pct == null ? 'N/A' : st.pct.toFixed(1).replace('.', ',') + '%'}</div><div class="s">recebido ÷ (recebido + saldo ativo), ${esc(un)}; exclui cancelados</div></button>
    ${qtyKpi('A validar', 'val', st, un, '', st.nIt.val + ' itens sem classificação segura')}
  </div>
  <div class="col">
    <button class="alertbox ${atr.length ? '' : 'zero'}" data-act="atrasos"><div><b>${atr.length} ${atr.length === 1 ? 'item' : 'itens'} em atraso — ${unitSum(atr, i => i.pend)} pendentes</b><br><span>Itens em Atraso — Clique para visualizar${pos.length ? ` · ${pos.length} ${pos.length === 1 ? 'item' : 'itens'} com possível atraso, vínculo a validar` : ''}</span></div><div class="go">Ver lista ›</div></button>
    <div class="panel"><h3>Acompanhamento de Requisições e Pedidos</h3><div id="t-central"></div><p class="note">Exibe os itens com saldo ativo de entrega. Clique em uma linha para abrir o detalhamento.</p></div>
  </div>
  <div class="col right">
    <div class="panel"><h3>Status dos Pedidos</h3>${pedBars.map(d => `<button class="bar" data-act="bar" data-k="${d.k}"><span class="bl">${d.l}</span><span class="bt"><i style="width:${d.n / max * 100}%;background:var(${d.c})"></i></span><b>${d.n}</b></button>`).join('')}<p class="note">Pedidos únicos, pelo status consolidado dos itens (prioridade: atrasado, a validar, pendente, sem previsão, recebido, cancelado).</p></div>
    <div class="panel"><h3>Status dos Materiais · ${esc(un)}</h3>${tot > 0 ? `<div class="donut"><svg viewBox="0 0 200 200" role="img" aria-label="Distribuição das quantidades por status"><circle r="${R}" cx="100" cy="100" fill="none" stroke="var(--soft)" stroke-width="30"/>${segs}<text x="100" y="98" text-anchor="middle" style="font:700 24px var(--f-d);fill:var(--ink)">${nfmt(tot)}</text><text x="100" y="116" text-anchor="middle" style="font:500 11px var(--f-b);fill:var(--mut)">${esc(un)} classificadas</text></svg><div class="legend">${pb.map(p => `<button data-act="seg" data-k="${p.k}"><i style="background:var(${p.c})"></i>${p.l}: <b>${(p.n / tot * 100).toFixed(1).replace('.', ',')}%</b> <span class="mut">(${nfmt(p.n)})</span></button>`).join('')}</div></div>` : '<p class="mut">Sem quantidades nesta unidade.</p>'}<p class="note">Fora do gráfico: ${nfmt(q.semprev)} aguardando aprovação e ${nfmt(q.val)} a validar. Percentual sobre recebidos, pendentes, atrasados e cancelados.</p></div>
  </div></div>`;
}
function postResumo() {
  const { rows } = S.cur;
  const list = rows.filter(i => i.pend > 0 && i.st !== 'canc');
  mkTable($('#t-central'), 'central', [cItem.req, cItem.ped, cItem.proj, cItem.base, cItem.desc, cItem.qs, cItem.qr, cItem.qp, cItem.st, cItem.resp, cItem.apd, cItem.est, cItem.dias, cItem.sol], list, { onRow: i => openReq(i.id), size: 12, sort: null });
}
function pageReqs() {
  const { rows, reqs } = applyFilters(); S.cur = { rows, reqs };
  return head('Requisições') + filtersHTML() + `<div class="panel"><div id="t-main"></div></div>`;
}
function postReqs() {
  const cols = [
    { l: 'Nº Requisição', t: c => reqNum(c.r) }, { l: 'Tipo mov.', t: c => c.r.mov || '—' }, { l: 'Base', t: c => c.r.base || '—' },
    { l: 'Abertura', t: c => dt(c.r.abertura), s: c => c.r.abertura || '' }, { l: 'Projeto', t: c => c.r.projeto, w: 1 },
    { l: 'Materiais', t: c => c.items.map(i => i.it.desc).join('; '), w: 1 }, { l: 'Itens', n: 1, t: c => c.items.length },
    { l: 'Status requisição', t: c => c.r.statusReq || '—' }, { l: 'Pedidos', t: c => pedLabel(c) },
    { l: 'Status geral (origem)', t: c => c.sg || '—' },
    { l: 'Situação', t: c => { const L = [...new Set(c.items.map(i => i.st))]; return L.map(k => BK[k].l).join(', '); }, h: c => [...new Set(c.items.map(i => i.st))].map(k => bd(k)).join(' ') },
    { l: 'Alertas', n: 1, t: c => c.flags.length }, { l: 'Solicitante', t: c => c.r.solicitante || '—' }];
  mkTable($('#t-main'), 'reqs', cols, S.cur.reqs, { onRow: c => openReq(c.id) });
}
function pedRows(reqs) {
  const m = buildPeds(reqs);
  return [...m.values()].map(o => {
    const cs = o.entries.map(e => e.c), r0 = o.entries[0];
    const its = [...new Set(cs.flatMap(c => c.items))];
    const ests = o.entries.map(e => e.p.e).filter(Boolean).sort();
    const dias = Math.max(0, ...its.filter(i => i.st === 'atr').map(i => i.dias));
    return { num: o.num, st: o.st, mov: (o.entries.find(e => e.p.mov) || r0).p.mov || '—', reqs: [...new Set(cs.map(c => reqNum(c.r)))], proj: [...new Set(cs.map(c => c.r.projeto))].join(' / '), n: its.length, est: ests[0] || null, prazo: o.entries.map(e => e.p.prazo).filter(Boolean).join(' · '), aprov: [...new Set(cs.flatMap(c => (c.r.aprovDatas || []).filter(Boolean)))].sort().map(fmt).join(' · '), dias, its, cs };
  });
}
function pagePeds() {
  const { rows, reqs } = applyFilters(); S.cur = { rows, reqs };
  return head('Pedidos de Compra') + filtersHTML() + `<div class="panel"><div id="t-main"></div></div>`;
}
const pedCols = [
  { l: 'Nº Pedido', t: o => o.num }, { l: 'Tipo mov. pedido', t: o => o.mov }, { l: 'Requisições', t: o => o.reqs.join(' · ') }, { l: 'Projeto', t: o => o.proj, w: 1 },
  { l: 'Itens', n: 1, t: o => o.n }, { l: 'Aprovação', t: o => o.aprov || '—' }, { l: 'Prazo (dias úteis)', t: o => o.prazo || '—' },
  { l: 'Data estimada', t: o => dt(o.est), s: o => o.est || '' }, { l: 'Status', t: o => BK[o.st].l, h: o => o.st === 'semprev' ? bdSem([...new Set(o.cs.map(c => c.apr || c.stage).filter(Boolean))].join(', '), o.cs.find(c => c.apr)) : bd(o.st) }, { l: 'Dias úteis de atraso', n: 1, t: o => o.dias || '—', s: o => o.dias }];
function openPed(o) {
  openList(`Pedido ${esc(o.num)}`, [cItem.req, cItem.proj, cItem.desc, cItem.qs, cItem.qr, cItem.qp, cItem.st, cItem.est, cItem.mot], o.its);
}
function postPeds() { mkTable($('#t-main'), 'peds', pedCols, pedRows(S.cur.reqs), { onRow: openPed }); }
function pageMat() {
  const { rows, reqs } = applyFilters(); S.cur = { rows, reqs };
  return head('Materiais') + filtersHTML() + `<div class="panel"><div id="t-main"></div><p class="note">Quantidades por item. Unidades diferentes (UN, MT) nunca são somadas entre si.</p></div>`;
}
function postMat() { mkTable($('#t-main'), 'mat', [cItem.req, cItem.ped, cItem.proj, cItem.desc, cItem.un, cItem.qs, cItem.qr, cItem.qp, cItem.qa, cItem.qc, cItem.st, cItem.est, cItem.mot], S.cur.rows, { onRow: i => openReq(i.id) }); }
function pageApr() {
  const { rows, reqs } = applyFilters(); S.cur = { rows, reqs };
  return head('Aprovações Pendentes') + filtersHTML() + `<div class="panel"><h3>Requisições com Status Geral PENDENTE (${reqs.filter(c => c.pendGeral).length})</h3><div id="t-main"></div><p class="note">Mesma contagem do filtro "STATUS GERAL = PENDENTE" da planilha: requisições ainda não concluídas, com a etapa pendente ou o responsável pela aprovação indicado em cada linha.</p></div>`;
}
function movsTxt(r) { const m = (r.movs || []).map(x => `${x.d ? fmt(x.d).slice(0, 5) : '?'} ${x.n}`); return m.join(' · ') || r.aprovTxt || '—'; }
function postApr() {
  const cols = [{ l: 'Nº Requisição', t: c => reqNum(c.r) }, { l: 'Tipo mov.', t: c => c.r.mov || '—' }, { l: 'Base', t: c => c.r.base || '—' }, { l: 'Abertura', t: c => dt(c.r.abertura), s: c => c.r.abertura || '' }, { l: 'Projeto', t: c => c.r.projeto, w: 1 },
    { l: 'Materiais', t: c => c.items.map(i => i.it.desc + (i.qtd != null ? ' (' + nfmt(i.qtd) + ' ' + i.un + ')' : '')).join('; '), w: 1 },
    { l: 'Status requisição', t: c => c.sr }, { l: 'Etapa / responsável pendente', t: c => c.apr ? 'Aguardando aprovação · ' + c.apr : (c.stage || 'Aprovada, aguardando entrega'), h: c => c.apr ?  `<span class="bd info">Aguardando aprovação · ${esc(c.apr)}</span>` : esc(c.stage || 'Aprovada, aguardando entrega') },
    { l: 'Aprovações realizadas (data · quem)', t: c => apTxt(c), w: 1 },
    { l: 'Última movimentação', t: c => { const d = [...(c.r.movs || []).map(m => m.d), ...(c.r.ap || []).map(a => a.d)].filter(Boolean).sort().pop(); return dt(d); }, s: c => [...(c.r.movs || []).map(m => m.d), ...(c.r.ap || []).map(a => a.d)].filter(Boolean).sort().pop() || '' },
    { l: 'Observações', t: c => c.r.obs || '', w: 1 }, { l: 'Solicitante', t: c => c.r.solicitante || '—' }];
  mkTable($('#t-main'), 'apr', cols, S.cur.reqs.filter(c => c.pendGeral), { onRow: c => openReq(c.id), empty: 'Nenhuma requisição com status geral pendente.' });
}
function pageAtr() {
  const { rows, reqs } = applyFilters(); S.cur = { rows, reqs };
  return head('Atrasos') + filtersHTML() + `<div class="panel"><h3>Itens com saldo atrasado</h3><div id="t-main"></div><p class="note">Atraso = data estimada anterior a hoje e saldo ainda não recebido. Dias contados em dias úteis (sábados, domingos e feriados cadastrados não contam). Aprovação pendente não é atraso.</p></div><div style="height:14px"></div><div class="panel"><h3>Possíveis atrasos · vínculo item↔pedido a validar</h3><div id="t-main2"></div><p class="note">Requisições com vários pedidos e datas diferentes, em que o PDF não informa quais materiais pertencem a cada pedido. Há pedido com data vencida, mas não é possível afirmar qual item está atrasado.</p></div>`;
}
function postAtr() {
  const cols = [cItem.req, cItem.ped, cItem.proj, cItem.base, cItem.desc, cItem.qs, cItem.qr, cItem.qp, cItem.qa, cItem.apd, cItem.est, cItem.dias, cItem.sol, cItem.obs];
  mkTable($('#t-main'), 'atr', cols, S.cur.rows.filter(i => i.st === 'atr'), { onRow: i => openReq(i.id), empty: 'Nenhum item em atraso.' });
  mkTable($('#t-main2'), 'atr2', [cItem.req, cItem.ped, cItem.proj, cItem.desc, cItem.qs, cItem.est, cItem.sol], S.cur.rows.filter(i => i.st === 'val' && i.possivel), { onRow: i => openReq(i.id), empty: 'Nenhum caso.' });
}

/* ---------- detalhamento ---------- */
function openReq(id) {
  S.openReq = id; const c = S.C.find(x => x.id === id); if (!c) return;
  const r = c.r; const ov = $('#ov');
  const body = reqHTML(c);
  if (ov && ov.classList.contains('dr')) { $('#mb', ov).innerHTML = body; $('.mh h2', ov).innerHTML = `Requisição ${esc(reqNum(r))}`; }
  else { openModal(`Requisição ${esc(reqNum(r))}`, body, { drawer: true }); }
  S.openReq = id;
}
function reqHTML(c) {
  const r = c.r, W = S.canWrite;
  const hist = S.hist.filter(h => h.req === r.num && (r.num || h.reqId === c.id));
  const fl = c.flags;
  const pedRowsH = c.peds.map(p => {
    const apv = (r.aprovDatas || []).filter(Boolean); const idx = c.peds.indexOf(p);
    const a = apv.length === c.peds.length ? apv[idx] : (apv.length === 1 ? apv[0] : null);
    const calc = a && p.prazo ? addBD(a, +p.prazo) : null;
    return `<tr><td>${esc(p.num)}</td><td>${esc(p.mov || '—')}</td><td class="n">${p.prazo || '—'}</td><td>${dt(p.e)}${p.estOv ? ' <span class="mut">(ajustada)</span>' : ''}</td><td>${calc ? fmt(calc) : '—'}</td><td>${bd(p.st)}</td></tr>`;
  }).join('');
  const itemsH = c.items.map(i => `<tr><td>${esc(i.it.desc)}</td><td class="n">${i.qtd == null ? '—' : nfmt(i.qtd) + ' ' + i.un}</td><td class="n">${nn(i.qtd == null ? null : i.rec)}</td><td class="n">${nn(i.qtd == null ? null : i.pend)}</td><td class="n">${nn(i.qtd == null ? null : i.canc)}</td><td>${itemBd(i)}${i.reason ? `<div class="mut" style="font-size:11.5px">${esc(i.reason)}</div>` : ''}${i.st === 'atr' ? `<div class="mut" style="font-size:11.5px">${i.dias} dia(s) útil(eis) de atraso</div>` : ''}</td></tr>`).join('');
  const recH = c.items.flatMap(i => (i.it.rec || []).map(x => `<tr><td>${esc(i.it.desc.slice(0, 60))}</td><td class="n">${nfmt(x.q)}</td><td>${fmt(x.d)}</td><td>${esc(x.by || '')}</td></tr>`)).join('');
  const forms = !W ? '<p class="mut">Seu acesso é somente leitura.</p>' : `
  <div class="sec">Atualizar registro</div>
  <details class="dts"><summary>Registrar recebimento</summary><form class="f" data-form="rec" data-id="${c.id}"><label class="wide">Material<select name="i">${c.items.map((i, k) => i.qtd != null ? `<option value="${k}">${esc(i.it.desc.slice(0, 70))} · pendente ${nfmt(i.pend)} ${i.un}</option>` : '').join('')}</select></label><label>Quantidade recebida<input name="q" type="number" step="any" min="0" required></label><label>Data do recebimento<input name="d" type="date" value="${S.today}" max="${S.today}" required></label><div class="wide"><button class="btn">Registrar</button></div></form></details>
  <details class="dts"><summary>Cancelar quantidade</summary><form class="f" data-form="canc" data-id="${c.id}"><label class="wide">Material<select name="i">${c.items.map((i, k) => i.qtd != null ? `<option value="${k}">${esc(i.it.desc.slice(0, 70))} · pendente ${nfmt(i.pend)} ${i.un}</option>` : '').join('')}</select></label><label>Quantidade cancelada<input name="q" type="number" step="any" min="0" required></label><label class="wide">Motivo<input name="m" required></label><div class="wide"><button class="btn red">Cancelar quantidade</button></div></form></details>
  ${c.peds.some(p => validPed(p.num)) ? `<details class="dts"><summary>Alterar data estimada de entrega</summary><form class="f" data-form="est" data-id="${c.id}"><label>Pedido<select name="n">${c.peds.filter(p => validPed(p.num)).map(p => `<option>${esc(p.num)}</option>`).join('')}</select></label><label>Nova data<input name="d" type="date" required></label><label class="wide">Motivo<input name="m" required></label><div class="wide"><button class="btn">Salvar data</button></div></form></details>` : ''}
  <details class="dts"><summary>Registrar aprovação / quem falta aprovar</summary><form class="f" data-form="appr" data-id="${c.id}"><label>Quem aprovou (opcional)<input name="n" placeholder="Nome do aprovador"></label><label>Data da aprovação<input name="d" type="date" value="${S.today}" max="${S.today}"></label>
  <label class="wide">Situação das aprovações<select name="fim" data-sit><option value="falta">Ainda falta aprovar</option><option value="concl">Acabaram as aprovações (aprovado)</option></select></label>
  <label class="wide" data-falta>Quem falta aprovar<input name="falta" placeholder="Nome de quem ainda precisa aprovar" value="${esc(c.apr && c.apr !== '(não informado)' ? c.apr : '')}"></label>
  <div class="wide"><button class="btn">Salvar aprovações</button></div></form></details>
  <details class="dts"><summary>Adicionar pedido de compra</summary><form class="f" data-form="ped" data-id="${c.id}"><label>Nº do pedido<input name="n" required></label><label>Tipo mov. do pedido<input name="m"></label><label>Prazo de entrega (dias úteis)<input name="p" type="number" min="0"></label><label>Data estimada de entrega<input name="e" type="date"></label><p class="mut wide" style="margin:0">Prazo 0 = sem aprovação final da diretoria (status continua aguardando aprovação). Com prazo maior que 0 e aprovação registrada, a data estimada é calculada em dias úteis.</p><div class="wide"><button class="btn">Adicionar pedido</button></div></form></details>
  <details class="dts"><summary>Alterar status</summary><form class="f" data-form="status" data-id="${c.id}"><label>Status da requisição<input name="sr" value="${esc(c.sr)}"></label><label>Status geral do pedido<select name="sg"><option value="">(manter origem: ${esc(r.statusGeral || 'vazio')})</option><option>PENDENTE</option><option>MATERIAL RECEBIDO</option><option>CANCELADO</option></select></label><p class="mut wide" style="margin:0">A alteração fica registrada como ajuste manual e não é apagada por novas importações.</p><div class="wide"><button class="btn">Salvar status</button></div></form></details>
  <details class="dts"><summary>Adicionar observação</summary><form class="f" data-form="note" data-id="${c.id}"><label class="wide">Observação<textarea name="t" rows="2" required></textarea></label><div class="wide"><button class="btn">Adicionar</button></div></form></details>
  ${r.fonte === 'Cadastro manual' ? `<p><button class="btn sec" data-act="edit" data-id="${c.id}">Editar cadastro</button></p>` : ''}`;
  return `<div class="kv"><div><dt>Tipo de movimento</dt><dd>${esc(r.mov || '—')}</dd></div><div><dt>Base de abertura</dt><dd>${esc(r.base || '—')}</dd></div><div><dt>Data de abertura</dt><dd>${dt(r.abertura)}${r.aberturaTxt && !r.abertura ? esc(r.aberturaTxt) : ''}</dd></div><div><dt>Projeto</dt><dd>${esc(r.projeto || '—')}</dd></div><div><dt>Solicitante</dt><dd>${esc(r.solicitante || '—')}</dd></div><div><dt>Status da requisição</dt><dd>${esc(c.sr || '—')}${(r.ov && r.ov.statusReq != null) ? ' <span class="mut">(ajustado)</span>' : ''}</dd></div><div><dt>Status geral (origem)</dt><dd>${esc(c.sg || '—')}${(r.ov && r.ov.statusGeral != null) ? ' <span class="mut">(ajustado)</span>' : ''}</dd></div><div><dt>Responsável pela aprovação pendente</dt><dd>${esc(c.apr || '—')}</dd></div><div style="grid-column:1/-1"><dt>Aprovações realizadas (data · quem)</dt><dd>${esc(apTxt(c))}</dd></div><div><dt>Nº de pedido (origem)</dt><dd>${esc((r.raw && r.raw.pedido) || pedLabel(c))}</dd></div></div>
  ${r.obs || (r.obsMan || []).length ? `<div class="sec">Observações</div><p style="margin:0">${esc(r.obs || '')}</p>${(r.obsMan || []).map(o => `<p style="margin:4px 0"><span class="mut">${fmt(o.d)} · ${esc(o.by || '')}:</span> ${esc(o.t)}</p>`).join('')}` : ''}
  <div class="sec">Materiais</div><div class="tw"><table><thead><tr><th>Descrição</th><th class="n">Solicitada</th><th class="n">Recebida</th><th class="n">Pendente</th><th class="n">Cancelada</th><th>Status</th></tr></thead><tbody>${itemsH}</tbody></table></div>
  ${c.peds.length ? `<div class="sec">Pedidos</div><div class="tw"><table><thead><tr><th>Nº pedido</th><th>Tipo mov.</th><th class="n">Prazo (d.u.)</th><th>Data estimada</th><th>Calculada</th><th>Status</th></tr></thead><tbody>${pedRowsH}</tbody></table></div>` : ''}
  ${recH ? `<div class="sec">Recebimentos registrados</div><div class="tw"><table><thead><tr><th>Material</th><th class="n">Qtd</th><th>Data</th><th>Por</th></tr></thead><tbody>${recH}</tbody></table></div>` : ''}
  ${fl.length ? `<div class="sec">Alertas e validações</div>${fl.map(f => `<div class="sev ${f.s}"><b>${f.s === 'alta' ? 'Validar' : f.s === 'media' ? 'Atenção' : 'Nota'}</b><span>${esc(f.m)}</span></div>`).join('')}` : ''}
  ${(r.movs || []).some(m => m.inf) ? '<p class="note">Datas sem ano na origem: assumido 2026.</p>' : ''}
  ${forms}
  <div class="sec">Histórico de alterações</div>${hist.length ? `<div class="tw"><table class="hist"><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>De</th><th>Para</th></tr></thead><tbody>${hist.flatMap(h => (h.changes && h.changes.length ? h.changes : [{ campo: h.campo, de: h.de, para: h.para }]).map(x => `<tr><td>${new Date(h.ts).toLocaleString('pt-BR', { timeZone: S.cfg.tz })}</td><td>${esc(h.user || '')}</td><td>${esc(h.tipo || '')}${x.campo ? ': ' + esc(x.campo) : ''}</td><td>${esc(x.de == null ? '' : x.de)}</td><td>${esc(x.para == null ? '' : x.para)}</td></tr>`)).join('')}</tbody></table></div>` : '<p class="mut">Sem alterações registradas após a carga inicial.</p>'}`;
}

/* ---------- gravação ---------- */
let Q = Promise.resolve();
function enqueue(fn) { const p = Q.then(fn); Q = p.catch(() => { }); return p; }
async function withRetry(fn) { try { return await fn(); } catch (e) { if (e && e.code === 'unavailable') { await new Promise(r => setTimeout(r, 400 + Math.random() * 400)); return await fn(); } throw e; } }
const errMsg = e => e && e.code === 'invalid_argument' ? 'Você não tem permissão para editar. Peça ao dono da página para liberar seu acesso em Compartilhar (Administração › Acesso explica como).' : e && e.code === 'quota_exceeded' ? 'Limite de armazenamento atingido.' : 'Não foi possível salvar: ' + ((e && e.message) || 'erro desconhecido');
async function logH(o) { await withRetry(() => S.db.collection('historico').add({ ts: Date.now(), iso: S.today, uid: S.uid || '', user: S.uname || 'Usuário', ...o })); }
async function mutate(id, fn, logs) {
  try {
    await enqueue(async () => {
      const ref = S.db.doc('requisicoes/' + id); const snap = await withRetry(() => ref.get());
      if (!snap.exists) throw { message: 'Requisição não encontrada.' };
      const cur = JSON.parse(JSON.stringify(snap.data())); fn(cur);
      await withRetry(() => ref.set(cur));
      for (const l of logs) await logH({ req: cur.num, reqId: id, ...l });
    });
    toast('Salvo.'); return true;
  } catch (e) { toast(errMsg(e), true); return false; }
}
const FORMS = {
  async rec(f) {
    const id = f.dataset.id, i = +f.i.value, q = parseFloat(f.q.value), d = f.d.value; const c = S.C.find(x => x.id === id); const it = c.items[i];
    if (!(q > 0)) return toast('Informe uma quantidade maior que zero.', true);
    if (q > it.pend) return toast(`A quantidade recebida (${nfmt(q)}) é maior que o saldo pendente (${nfmt(it.pend)}).`, true);
    if (d > S.today) return toast('A data do recebimento não pode ser futura.', true);
    await mutate(id, r => { const t = r.items[i]; t.rec = t.rec || []; t.rec.push({ d, q, by: S.uname || 'Usuário', ts: Date.now() }); }, [{ tipo: 'Recebimento', campo: it.it.desc.slice(0, 60), de: nfmt(it.rec), para: nfmt(it.rec + q) + ' (em ' + fmt(d) + ')' }]);
  },
  async canc(f) {
    const id = f.dataset.id, i = +f.i.value, q = parseFloat(f.q.value); const c = S.C.find(x => x.id === id); const it = c.items[i];
    if (!(q > 0) || q > it.pend) return toast(`A quantidade cancelada deve ser maior que zero e até o saldo pendente (${nfmt(it.pend)}).`, true);
    await mutate(id, r => { const t = r.items[i]; t.canc = (t.canc || 0) + q; t.cancMot = f.m.value; }, [{ tipo: 'Cancelamento', campo: it.it.desc.slice(0, 60), de: nfmt(it.canc), para: nfmt(it.canc + q), motivo: f.m.value }]);
  },
  async est(f) {
    const id = f.dataset.id, n = f.n.value, d = f.d.value; const c = S.C.find(x => x.id === id); const p = c.peds.find(x => x.num === n);
    await mutate(id, r => { const t = r.pedidos.find(x => x.num === n); t.estOv = d; }, [{ tipo: 'Data estimada', campo: 'Pedido ' + n, de: dt(p.e), para: fmt(d), motivo: f.m.value }]);
  },
  async appr(f) {
    const id = f.dataset.id; const n = f.n.value.trim(), d = f.d.value, fim = f.fim.value, falta = f.falta.value.trim();
    const c = S.C.find(x => x.id === id);
    if (n && !d) return toast('Informe a data da aprovação.', true);
    if (d > S.today) return toast('A data da aprovação não pode ser futura.', true);
    if (fim === 'falta' && !falta) return toast('Informe quem falta aprovar ou escolha "Acabaram as aprovações".', true);
    if (fim === 'concl' && !n && !c.r.aprovDatas.length && !(c.r.movs || []).length && !(c.r.ap || []).length) return toast('Informe quem aprovou e a data para concluir as aprovações.', true);
    const novo = fim === 'concl' ? 'Aprovado' + (n ? ' ' + n : '') : 'Aguardando aprovação ' + falta;
    const logs = []; if (n) logs.push({ tipo: 'Aprovação', campo: 'Aprovador', de: '', para: n + ' em ' + fmt(d) });
    logs.push({ tipo: 'Status', campo: 'Status da requisição', de: c.sr, para: novo });
    await mutate(id, r => { if (n) { r.ap = r.ap || []; r.ap.push({ n, d, by: S.uname || 'Usuário' }); } r.ov = r.ov || {}; r.ov.statusReq = novo; delete r.ov.auto; }, logs);
  },
  async ped(f) {
    const id = f.dataset.id, num = f.n.value.trim(), mov = f.m.value.trim(), p = f.p.value, e = f.e.value; const c = S.C.find(x => x.id === id);
    if (!validPed(num)) return toast('Número de pedido inválido (use só o número do pedido, com ' + (S.cfg.minDigitsPedido || 4) + ' ou mais dígitos, ou o formato da origem).', true);
    if (c.r.pedidos.some(x => x.num === num)) return toast('Este pedido já está nesta requisição.', true);
    const ap = lastApproval(c.r); let est = e || null, calc = false;
    if (!est && p !== '' && +p > 0 && ap) { est = addBD(ap, +p); calc = true; }
    await mutate(id, r => { r.pedidos.push({ num, mov: mov || null, prazo: p === '' ? null : +p, estTxt: est ? fmt(est) : null, est, manual: true, ...(calc ? { calc: true } : {}) }); if (p !== '' && +p === 0) { r.ov = r.ov || {}; r.ov.statusReq = 'Aguardando aprovação ' + (c.apr && c.apr !== '(não informado)' ? c.apr : ''); r.ov.auto = true; } },
      [{ tipo: 'Pedido', campo: 'Pedido adicionado', de: '', para: num + (est ? ' · estimada ' + fmt(est) : '') }]);
  },
  async status(f) {
    const id = f.dataset.id; const c = S.C.find(x => x.id === id); const sr = f.sr.value.trim(), sg = f.sg.value;
    const logs = []; if (sr !== c.sr) logs.push({ tipo: 'Status', campo: 'Status da requisição', de: c.sr, para: sr }); if (sg && sg !== c.sg) logs.push({ tipo: 'Status', campo: 'Status geral', de: c.sg, para: sg });
    if (!logs.length) return toast('Nada para alterar.');
    await mutate(id, r => { r.ov = r.ov || {}; if (sr !== c.sr) r.ov.statusReq = sr; if (sg && sg !== c.sg) r.ov.statusGeral = sg; }, logs);
  },
  async note(f) { const id = f.dataset.id, t = f.t.value.trim(); await mutate(id, r => { r.obsMan = r.obsMan || []; r.obsMan.push({ d: S.today, by: S.uname || 'Usuário', t }); }, [{ tipo: 'Observação', campo: '', de: '', para: t }]); }
};
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target; const k = f.dataset.form;
  if (FORMS[k]) FORMS[k](f);
  else if (k === 'nova') saveReq(f);
  else if (k === 'cad') doCadastro(f);
  else if (k === 'log') doLogin(f);
  else if (k === 'hol') addHoliday(f);
  else if (k === 'par') saveParams(f);
});

/* ---------- Nova Requisição ---------- */
const SREQ = ['Aprovado', 'Aguardando aprovação', 'Aguardando pedido de compra', 'Aguardando cotação', 'Cancelado'];
function itemRow(v = {}) { return `<div class="rw" data-row="i"><label>Descrição do material ou serviço<input name="d" value="${esc(v.desc || '')}" required></label><label>Quantidade<input name="q" type="number" step="any" min="0" value="${v.qtd == null ? '' : v.qtd}" required></label><label>Unidade<input name="u" list="uns" value="${esc(v.un || S.cfg.defaultUnit || 'UN')}"></label><button type="button" class="btn sec sm" data-act="rm" aria-label="Remover material">Remover</button></div>`; }
function pedRow(v = {}) { return `<div class="rw p" data-row="p"><label>Nº do pedido<input name="n" value="${esc(v.num || '')}"></label><label>Tipo mov. pedido<input name="m" value="${esc(v.mov || '')}"></label><label>Prazo (dias úteis)<input name="p" type="number" min="0" value="${v.prazo || ''}"></label><label>Data estimada<input name="e" type="date" value="${esc(v.est || '')}"></label><button type="button" class="btn sec sm" data-act="rm">Remover</button></div>`; }
function pageNova() {
  const e = S.edit ? S.reqs[S.edit] : null; const r = e || {};
  const sr = (r.statusReq || '').match(/^(Aprovado|Aguardando aprovação|Aguardando pedido de compra|Aguardando cotação|Cancelado)\s*(.*)$/i);
  const srv = sr ? SREQ.find(x => x.toLowerCase() === sr[1].toLowerCase()) : 'Aprovado';
  const resp = sr ? sr[2] : '';
  return head(e ? 'Editar Requisição' : 'Nova Requisição') + `<div class="panel"><form class="f" data-form="nova" id="nova" novalidate>
  <label>Nº da requisição<input name="num" value="${esc(r.num || '')}" ${e ? 'readonly' : ''} required></label>
  <label>Tipo de movimento<input name="mov" value="${esc(r.mov || '')}" placeholder="1.1.13"></label>
  <label>Base de abertura<input name="base" value="${esc(r.base || '')}" placeholder="GRU"></label>
  <label>Data de abertura<input name="ab" type="date" value="${esc(r.abertura || S.today)}" required></label>
  <label>Projeto<input name="proj" value="${esc(r.projeto || '')}" required></label>
  <label>Solicitante<input name="sol" value="${esc(r.solicitante || '')}" required></label>
  <label>Status da requisição<select name="sr">${SREQ.map(x => `<option${x === srv ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
  <label>Responsável pela aprovação<input name="resp" value="${esc(resp)}" placeholder="Godoy, Edgar…"></label>
  <label>Data de aprovação da diretoria<input name="ap" type="date" value="${esc((r.aprovDatas || [])[0] || '')}"></label>
  <label>Status geral do pedido<select name="sg"><option value="">(vazio)</option>${['PENDENTE', 'MATERIAL RECEBIDO', 'CANCELADO'].map(x => `<option${x === r.statusGeral ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
  <label class="wide">Observações<textarea name="obs" rows="2">${esc(r.obs || '')}</textarea></label>
  <div class="wide"><div class="sec" style="margin-top:0">Materiais ou serviços</div><datalist id="uns"><option>UN</option><option>MT</option><option>KG</option><option>L</option><option>CX</option></datalist><div class="rows" id="rows-i">${(r.items && r.items.length ? r.items : [{}]).map(itemRow).join('')}</div><p><button type="button" class="btn sec sm" data-act="add-i">+ Adicionar material</button></p></div>
  <div class="wide"><div class="sec" style="margin-top:0">Pedidos de compra <span class="mut" style="text-transform:none;font-weight:400">(opcional)</span></div><div class="rows" id="rows-p">${(r.pedidos || []).map(p => pedRow({ ...p, est: p.estOv || p.est })).join('')}</div><p><button type="button" class="btn sec sm" data-act="add-p">+ Adicionar pedido</button> <button type="button" class="btn sec sm" data-act="calc-est">Calcular datas estimadas</button></p><p class="note">A data estimada calculada usa o prazo em dias úteis a partir da aprovação (o primeiro dia útil seguinte conta como dia 1) e o calendário cadastrado. Se você digitar uma data, ela é mantida.</p></div>
  <div class="wide" id="nerr"></div>
  <div class="wide"><button class="btn" ${S.canWrite ? '' : 'disabled'}>${e ? 'Salvar alterações' : 'Cadastrar requisição'}</button> ${e ? '<button type="button" class="btn sec" data-act="cancel-edit">Cancelar edição</button>' : ''} ${S.canWrite ? '' : '<span class="mut">Acesso somente leitura.</span>'}</div></form></div>`;
}
function collectItems(f) { return $$('[data-row="i"]', f).map(r => ({ d: $('[name=d]', r).value.trim(), q: $('[name=q]', r).value, u: $('[name=u]', r).value.trim() })); }
async function saveReq(f) {
  const E = []; const g = n => f.elements[n].value.trim();
  const num = g('num'); if (!num) E.push('Informe o número da requisição.');
  if (!/^[A-Za-z0-9_-]+$/.test(num)) E.push('O número deve ter só letras, números, hífen ou sublinhado.');
  const id = S.edit || 'r_' + num;
  if (!S.edit && (S.reqs[id] || Object.values(S.reqs).some(r => r.num === num))) E.push(`A requisição ${num} já existe. Abra-a em Requisições para atualizar.`);
  if (!g('ab')) E.push('Informe a data de abertura.'); else if (g('ab') > S.today) E.push('A data de abertura não pode ser futura.');
  if (!g('proj')) E.push('Informe o projeto.'); if (!g('sol')) E.push('Informe o solicitante.');
  const sr = g('sr'), resp = g('resp');
  if (/^(Aprovado|Aguardando aprovação)$/.test(sr) && !resp) E.push('Informe o responsável pela aprovação.');
  if (sr === 'Aprovado' && !g('ap')) E.push('Informe a data de aprovação da diretoria.');
  if (g('ap') && g('ap') > S.today) E.push('A data de aprovação não pode ser futura.');
  const its = collectItems(f).filter(x => x.d || x.q);
  if (!its.length) E.push('Inclua ao menos um material.');
  its.forEach((x, k) => { if (!x.d) E.push(`Material ${k + 1}: informe a descrição.`); if (!(parseFloat(x.q) > 0)) E.push(`Material ${k + 1}: informe uma quantidade maior que zero.`); });
  const peds = $$('[data-row="p"]', f).map(r => ({ n: $('[name=n]', r).value.trim(), m: $('[name=m]', r).value.trim(), p: $('[name=p]', r).value, e: $('[name=e]', r).value })).filter(p => p.n || p.p || p.e);
  const seenP = new Set(); peds.forEach(p => { if (!p.n) E.push('Informe o número de cada pedido.'); else if (seenP.has(p.n)) E.push(`Pedido ${p.n} repetido.`); seenP.add(p.n); });
  $('#nerr').innerHTML = E.map(x => `<div class="err">${esc(x)}</div>`).join('');
  if (E.length) return;
  const apIso = g('ap') || null;
  const doc = {
    num, mov: g('mov'), base: g('base'), abertura: g('ab'), aberturaTxt: fmt(g('ab')), projeto: g('proj'), statusReq: sr + (resp && /^(Aprovado|Aguardando aprovação)$/.test(sr) ? ' ' + resp : ''),
    aprovTxt: apIso ? fmt(apIso) : '', aprovDatas: apIso ? [apIso] : [], movs: [], obs: g('obs'), solicitante: g('sol'), statusGeral: g('sg'), estReq: null,
    pedidos: peds.map(p => { let est = p.e || null, calc = false; if (!est && p.p && apIso) { est = addBD(apIso, +p.p); calc = true; } return { num: p.n, mov: p.m || null, prazo: p.p ? +p.p : null, estTxt: est ? fmt(est) : null, est, ...(calc ? { calc: true } : {}) }; }),
    raw: { pedido: peds.map(p => p.n).join(' '), prazo: peds.map(p => p.p).filter(Boolean).join(' '), est: peds.map(p => p.e).filter(Boolean).join(' ') },
    fl: [], validar: [], fonte: 'Cadastro manual', ov: {}, obsMan: [], ap: []
  };
  if (doc.pedidos.some(p => p.calc)) doc.fl.push({ s: 'info', m: 'Data estimada calculada pelo sistema (dias úteis a partir da aprovação).' });
  const old = S.edit ? S.reqs[S.edit] : null;
  const seen = {}; const full = /recebid/i.test(doc.statusGeral);
  doc.items = its.map((x, k) => { const k0 = slugK(x.d); seen[k0] = (seen[k0] || 0) + 1; const q = parseFloat(x.q); const prev = old && old.items && old.items[k];
    return { k: `${k0}#${seen[k0]}`, desc: x.d, qtd: q, un: normUn(x.u), recBase: full ? q : 0, full, ...(prev && prev.rec ? { rec: prev.rec } : {}), ...(prev && prev.canc ? { canc: prev.canc } : {}) }; });
  if (old) { doc.ov = old.ov || {}; doc.obsMan = old.obsMan || []; doc.ap = old.ap || []; doc.pedidos.forEach(p => { const o = (old.pedidos || []).find(x => x.num === p.num); if (o && o.estOv) p.estOv = o.estOv; }); }
  try {
    await enqueue(async () => { await withRetry(() => S.db.doc('requisicoes/' + id).set(doc)); await logH({ req: num, reqId: id, tipo: old ? 'Edição de cadastro' : 'Cadastro', campo: '', de: '', para: old ? 'Dados do cadastro atualizados' : `Requisição criada com ${doc.items.length} material(is)` }); });
    toast(old ? 'Requisição atualizada.' : 'Requisição cadastrada.'); S.edit = null; S.page = 'requisicoes'; render(); setTimeout(() => openReq(id), 300);
  } catch (e) { toast(errMsg(e), true); }
}

/* ---------- Administração ---------- */
function pageAdmin() {
  const tabs = [['import', 'Importar Excel'], ['inc', 'Inconsistências'], ['hist', 'Histórico'], ['cal', 'Calendário'], ['par', 'Parâmetros'], ...(S.isAdm ? [['usuarios', 'Usuários']] : []), ['acesso', 'Acesso']];
  return head('Administração') + `<div class="tabs">${tabs.map(([k, l]) => `<button data-act="tab" data-k="${k}" class="${S.adm === k ? 'on' : ''}">${l}${k === 'inc' ? ` (${S.C.reduce((a, c) => a + c.flags.filter(f => f.s !== 'info').length, 0)})` : ''}</button>`).join('')}</div>` + ({ import: admImport, inc: admInc, hist: admHist, cal: admCal, par: admPar, usuarios: admUsers, acesso: admAcesso }[S.adm])();
}
function admImport() {
  const l = S.imps[0];
  return `<div class="panel"><h3>Importar planilha Excel</h3>
  <p style="margin-top:0">Selecione a planilha (.xlsx ou .xls) com as colunas do relatório. A importação só atualiza as requisições que já existem no sistema; requisições e materiais que não existem são desconsiderados, e nada é duplicado. O que foi cadastrado ou ajustado manualmente é preservado. Regra do Prazo de Entrega: 0 = ainda sem a última aprovação da diretoria (status Aguardando aprovação); acima de 0 = data estimada recalculada em dias úteis a partir da última aprovação.</p>
  <p><input type="file" id="imp-file" accept=".xlsx,.xls,.csv" ${S.canEdit ? '' : 'disabled'}> ${typeof XLSX === 'undefined' ? '<span class="err">A biblioteca de leitura de Excel não carregou. Recarregue a página.</span>' : ''}</p>
  <div id="imp-out"></div>
  <p class="note">Colunas esperadas: <button class="btn sec sm" data-act="copyhead">Copiar cabeçalho</button> (cole na linha 1 de uma planilha em branco). Pode haver várias linhas por requisição, ou vários materiais e pedidos separados por quebra de linha na mesma célula. Colunas extras são preservadas.</p></div>
  <div style="height:14px"></div><div class="panel"><h3>Atualização automática</h3><p style="margin:0">Ainda não configurada. Hoje a atualização é feita por nova importação do arquivo. A leitura automática de uma planilha no OneDrive ou SharePoint depende de um conector da Microsoft ligado à sua conta Claude, que não está disponível nesta sessão.</p></div>
  ${l ? `<div style="height:14px"></div><div class="panel"><h3>Última importação</h3><p style="margin:0">${new Date(l.ts).toLocaleString('pt-BR', { timeZone: S.cfg.tz })} · ${esc(l.arquivo)} · ${l.atualizadas} atualizadas, ${l.iguais} sem alteração, ${l.erros} erros.</p></div>` : ''}`;
}
function admAcesso() {
  const nivel = S.isAdm ? 'Administrador: gerencia usuários e permissões, importa Excel, edita calendário, parâmetros e logo, e registra todas as atualizações.' : S.role === 'editor' ? 'Editor: registra recebimentos, cancelamentos, aprovações, pedidos, observações e novas requisições, e importa o Excel. Não altera calendário, parâmetros, logo nem permissões.' : 'Leitor: consulta tudo, mas não salva alterações. Peça ao administrador a permissão de Editor.';
  return `<div class="panel"><h3>Seu acesso</h3><p style="margin:0"><b>${esc(S.uname || 'Você')}</b> · ${esc(nivel)}</p></div><div style="height:14px"></div><div class="panel"><h3>Como funcionam as contas</h3>
  <ul style="margin:0;padding-left:18px;line-height:1.8"><li>Cada pessoa cria a conta na primeira entrada, com <b>nome</b> (usuário) e <b>matrícula</b> (senha). A matrícula é guardada só como código de verificação, nunca em texto.</li><li>Todo cadastro entra como <b>Leitor</b>. O administrador libera <b>Editor</b> em Administração › Usuários.</li><li>O administrador é o dono da página (ou quem ele colocar como Editor em Compartilhar).</li><li>Para a pessoa conseguir criar a conta, o acesso dela à página, em Compartilhar, precisa ser no mínimo <b>Colaborador</b>.</li></ul>
  <p class="note">As regras de Leitor e Editor são aplicadas pela tela. Permissões, usuários e configurações são protegidos pela plataforma.</p></div>`;
}
function admUsers() {
  return `<div class="panel"><h3>Usuários que já entraram (${S.perfis.length})</h3><div id="t-main"></div><p class="note">Todo cadastro entra como Leitor. Use "Dar permissão de Editor" para liberar a edição. O nível Administrador é do dono da página e dos Editores definidos em Compartilhar.</p></div>`;
}
const nivelDe = p => (p.uid === S.uid && S.isAdm) ? 'Administrador' : (S.perms[p.uid] && S.perms[p.uid].role === 'editor' ? 'Editor' : 'Leitor');
function postUsers() {
  const dtm = t => t ? new Date(t).toLocaleString('pt-BR', { timeZone: S.cfg.tz }) : '—';
  mkTable($('#t-main'), 'users', [
    { l: 'Nome', t: p => p.nome }, { l: 'Cadastro', t: p => dtm(p.criado), s: p => p.criado || 0 }, { l: 'Último acesso', t: p => dtm(p.ultimoLogin), s: p => p.ultimoLogin || 0 }, { l: 'Acessos', n: 1, t: p => p.logins || 0 },
    { l: 'Nível', t: p => nivelDe(p), h: p => `<span class="bd ${nivelDe(p) === 'Leitor' ? 'info' : ''}" style="${nivelDe(p) === 'Leitor' ? '' : '--c:var(--ok)'}">${nivelDe(p)}</span>` },
    { l: 'Ação', t: p => '', h: p => nivelDe(p) === 'Administrador' ? '—' : nivelDe(p) === 'Editor' ? `<button class="btn sec sm" data-act="role" data-uid="${esc(p.uid)}" data-to="leitor">Remover permissão de Editor</button>` : `<button class="btn sm" data-act="role" data-uid="${esc(p.uid)}" data-to="editor">Dar permissão de Editor</button>` }
  ], S.perfis.slice().sort((a, b) => (b.ultimoLogin || 0) - (a.ultimoLogin || 0)), { onRow: () => { }, empty: 'Ninguém criou conta ainda.' });
}
async function setRole(uid, to) {
  const p = S.perfis.find(x => x.uid === uid); if (!p) return; const de = nivelDe(p);
  try {
    await enqueue(async () => {
      if (to === 'editor') await withRetry(() => S.db.doc('permissoes/' + uid).set({ role: 'editor', nome: p.nome, por: S.uname, em: Date.now() })); else await withRetry(() => S.db.doc('permissoes/' + uid).delete());
      await logH({ req: '', reqId: '', tipo: 'Permissão', campo: p.nome, de, para: to === 'editor' ? 'Editor' : 'Leitor' });
    });
    toast(to === 'editor' ? p.nome + ' agora é Editor.' : 'Permissão de Editor removida.');
  } catch (e) { toast(errMsg(e), true); }
}
function admInc() {
  return `<div class="panel"><h3>Inconsistências e validações</h3><div id="t-main"></div><p class="note">Os alertas vêm da leitura do PDF e das regras de datas, quantidades e vínculos. Nada foi corrigido automaticamente: confirme na origem e atualize a planilha.</p></div>`;
}
function postInc() {
  const L = []; S.C.forEach(c => c.flags.forEach(f => L.push({ c, f })));
  const rank = { alta: 0, media: 1, info: 2 };
  L.sort((a, b) => rank[a.f.s] - rank[b.f.s]);
  mkTable($('#t-main'), 'inc', [{ l: 'Gravidade', t: x => x.f.s === 'alta' ? 'Validar' : x.f.s === 'media' ? 'Atenção' : 'Nota' }, { l: 'Nº Requisição', t: x => reqNum(x.c.r) }, { l: 'Projeto', t: x => x.c.r.projeto, w: 1 }, { l: 'Descrição', t: x => x.f.m, w: 1 }], L, { onRow: x => openReq(x.c.id) });
}
function admHist() { return `<div class="panel"><h3>Histórico de importações e alterações</h3><div id="t-main"></div></div>`; }
function postHist() {
  const L = S.imps.map(i => ({ ts: i.ts, user: i.usuario || '', tipo: 'Importação', req: '', campo: i.arquivo, de: '', para: `${i.atualizadas} atualizadas · ${i.iguais} iguais · ${i.erros} erros` }));
  S.hist.forEach(h => (h.changes && h.changes.length ? h.changes : [{ campo: h.campo, de: h.de, para: h.para }]).forEach(x => L.push({ ts: h.ts, user: h.user, tipo: h.tipo, req: h.req, reqId: h.reqId, campo: x.campo || '', de: x.de, para: x.para })));
  L.sort((a, b) => b.ts - a.ts);
  mkTable($('#t-main'), 'hist', [{ l: 'Quando', t: x => new Date(x.ts).toLocaleString('pt-BR', { timeZone: S.cfg.tz }), s: x => x.ts }, { l: 'Quem', t: x => x.user }, { l: 'Tipo', t: x => x.tipo }, { l: 'Requisição', t: x => x.req || '—' }, { l: 'Campo', t: x => x.campo, w: 1 }, { l: 'De', t: x => x.de == null ? '' : x.de, w: 1 }, { l: 'Para', t: x => x.para == null ? '' : x.para, w: 1 }], L, { onRow: x => { if (x.reqId && S.reqs[x.reqId]) openReq(x.reqId); } });
}
function admCal() {
  const H = (S.cfg.feriados || []).slice().sort();
  return `<div class="panel"><h3>Calendário de dias úteis</h3><p style="margin-top:0">Sábados e domingos nunca contam como dia útil. Os feriados abaixo também não contam no cálculo de prazos e de dias de atraso. ${esc(S.cfg.feriadosNota || '')}</p>
  <form class="f" data-form="hol" style="margin-bottom:12px"><label>Adicionar feriado<input name="d" type="date" required></label><div style="align-self:end"><button class="btn" ${S.canEdit ? '' : 'disabled'}>Adicionar</button> <button type="button" class="btn sec" data-act="nat" ${S.canEdit ? '' : 'disabled'}>Adicionar feriados nacionais 2026–2027</button></div></form>
  ${H.length ? `<div class="tw"><table><thead><tr><th>Data</th><th>Dia da semana</th><th></th></tr></thead><tbody>${H.map(d => `<tr style="cursor:default"><td>${fmt(d)}</td><td>${WEEK[new Date(D(d) * 864e5).getUTCDay()]}</td><td><button class="btn sec sm" data-act="rmhol" data-k="${d}" ${S.canEdit ? '' : 'disabled'}>Remover</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="mut">Nenhum feriado cadastrado. Somente fins de semana são descontados.</p>'}</div>`;
}
function admPar() {
  const c = S.cfg;
  return `<div class="panel"><h3>Parâmetros de negócio</h3><form class="f" data-form="par"><label>Fuso horário da operação<input name="tz" value="${esc(c.tz)}"></label><label>Unidade padrão (quando a origem não informa)<input name="un" value="${esc(c.defaultUnit)}"></label><label>Dígitos mínimos do nº de pedido (para alerta)<input name="md" type="number" min="1" value="${c.minDigitsPedido || 4}"></label><div class="wide"><button class="btn" ${S.canEdit ? '' : 'disabled'}>Salvar parâmetros</button></div></form>
  <div class="sec">Logo da empresa</div><p style="margin:0 0 8px">Aparece no topo do menu lateral. Use um PNG ou JPG, de preferência com fundo transparente ou branco.</p><p style="margin:0"><input type="file" id="logo-file" accept="image/*" ${S.canEdit ? '' : 'disabled'}> ${c.logo ? `<button class="btn sec sm" data-act="rmlogo" ${S.canEdit ? '' : 'disabled'}>Remover logo</button>` : ''}</p>
  <div class="sec">Regras aplicadas em todo o sistema</div><ul style="margin:0;padding-left:18px;line-height:1.7">
  <li>Requisições e pedidos contados por número único; materiais somados por quantidade, separados por unidade.</li>
  <li>Pendente = solicitada − recebida − cancelada (nunca negativa). Recebimento sem quantidade não é presumido.</li>
  <li>Atrasado = data estimada anterior a hoje com saldo pendente. Aprovação pendente e item sem data nunca são atraso.</li>
  <li>Percentual de recebimento = recebida ÷ (recebida + saldo ativo), sem canceladas. Gráfico de materiais: percentual sobre recebidas, pendentes, atrasadas e canceladas.</li>
  <li>Datas informadas na origem nunca são substituídas por datas calculadas; divergências aparecem como alerta.</li></ul></div>`;
}
async function saveCfg(patch) { try { await enqueue(() => withRetry(() => S.db.doc('config/main').set({ ...S.cfg, ...patch }))); toast('Salvo.'); } catch (e) { toast(errMsg(e), true); } }
function addHoliday(f) { const d = f.d.value; const H = new Set(S.cfg.feriados || []); H.add(d); saveCfg({ feriados: [...H].sort() }); f.reset(); }
function saveParams(f) { saveCfg({ tz: f.tz.value.trim() || 'America/Sao_Paulo', defaultUnit: f.un.value.trim().toUpperCase() || 'UN', minDigitsPedido: +f.md.value || 4 }); }

/* ---------- importação de Excel ---------- */
const cs = v => v == null ? '' : (v instanceof Date ? '' : String(v)).trim();
const lines = v => cs(v).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const nh = s => nz(s).replace(/[º°]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function parseRows(rows) {
  let h = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) if (rows[i].some(c => nh(c).includes('requisicao')) && rows[i].some(c => nh(c).includes('pedido'))) { h = i; break; }
  if (h < 0) throw new Error('Cabeçalho não encontrado. A planilha precisa ter as colunas "Nº Requisição" e "Nº Pedido".');
  const col = {}, extras = [];
  rows[h].forEach((raw, i) => {
    const x = nh(raw); if (!x) return;
    if (/^(n |numero )?requisicao$|^n requisicao/.test(x)) col.num ??= i;
    else if (x.startsWith('tipo do movimento') || x.startsWith('tipo movimento')) { if (x.includes('pedido') || col.pedido != null) col.movPed ??= i; else col.mov ??= i; }
    else if (/^base/.test(x)) col.base ??= i;
    else if (/^data (de )?abertura/.test(x)) col.ab ??= i;
    else if (x === 'projeto') col.proj ??= i;
    else if (/^descricao/.test(x)) col.desc ??= i;
    else if (/^(qtde|qtd|quantidade)$/.test(x)) col.qtd ??= i;
    else if (/^(un|und|unidade)( de medida)?$/.test(x)) col.un ??= i;
    else if (x.startsWith('status requisicao')) col.sreq ??= i;
    else if (/^data de aprovacao|^aprovacao/.test(x)) col.apr ??= i;
    else if (/^observac/.test(x)) col.obs ??= i;
    else if (/^(n |numero )?pedido$|^n pedido|^numero pedido/.test(x)) col.pedido ??= i;
    else if (x.startsWith('tempo para entrega')) col.prazo ??= i;
    else if (x.startsWith('data estimada')) col.est ??= i;
    else if (x.startsWith('status geral')) col.sg ??= i;
    else if (x.startsWith('solicitante')) col.sol ??= i;
    else extras.push([cs(raw), i]);
  });
  if (col.num == null) throw new Error('Coluna "Nº Requisição" não identificada.');
  const docs = {}, errors = [];
  for (let n = h + 1; n < rows.length; n++) {
    const row = rows[n]; if (row.every(x => x === '' || x == null)) continue;
    const g = k => col[k] != null ? row[col[k]] : '';
    const nums = cs(g('num')).split(/[\s,;]+/).filter(Boolean);
    if (!nums.length) { errors.push({ l: n + 1, m: 'Linha sem nº de requisição; não importada.', a: lines(g('desc'))[0] || '' }); continue; }
    const num = nums[0];
    if (nums.length > 1) errors.push({ l: n + 1, m: `Mais de um nº de requisição na mesma linha (${nums.join(', ')}); só a primeira (${num}) foi importada. Separe em linhas distintas.`, a: '' });
    const id = 'r_' + num.replace(/[^A-Za-z0-9_-]/g, '_');
    const ab = pdate(g('ab')); const ctx = ab.iso ? +ab.iso.slice(0, 4) : new Date().getFullYear();
    let inferred = ab.inf; const fl = [];
    const aprTxt = g('apr') instanceof Date ? fmt(pdate(g('apr')).iso) : cs(g('apr'));
    const aprovDatas = [], movs = [];
    if (g('apr') instanceof Date || typeof g('apr') === 'number') { const d = pdate(g('apr')); if (d.iso) aprovDatas.push(d.iso); }
    else if (aprTxt) {
      if (/^[\d/\s\n]+$/.test(aprTxt)) (aprTxt.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g) || []).forEach(t => { const d = pdate(t, ctx); aprovDatas.push(d.iso); inferred = inferred || d.inf; });
      for (const m of aprTxt.matchAll(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–—]\s*([^\n;]+)/g)) { const d = pdate(m[1], ctx); movs.push({ d: d.iso, n: m[2].trim(), inf: d.inf }); inferred = inferred || d.inf; }
    }
    const sg = cs(g('sg')), obs = cs(g('obs'));
    const validar = [];
    const recebido = /recebid/i.test(sg), cancelado = /cancel/i.test(sg) || /^cancel/i.test(nz(cs(g('sreq'))));
    if (recebido && /cancelad/i.test(obs)) validar.push('Status geral "MATERIAL RECEBIDO" conflita com observação que cita cancelamento.');
    if (recebido && /entreg\w*\s+parcial|entreg\w*\s+\d+\s*un/i.test(nz(obs))) validar.push('Status geral "MATERIAL RECEBIDO" conflita com observação de entrega parcial.');
    const full = recebido && !validar.length && !cancelado;
    // materiais
    const dl = lines(g('desc')), ql = lines(g('qtd')), ul = lines(g('un')); let its = [];
    const q1 = i => { const t = ql[i]; if (t == null) return { q: null, un: normUn(ul[i]) }; const p = pq(t); if (p.q == null) fl.push({ s: 'media', m: `Quantidade não reconhecida: "${t}".` }); return { q: p.q, un: ul[i] ? normUn(ul[i]) : p.un }; };
    if (dl.length === ql.length || ql.length <= 1 && dl.length <= 1) its = dl.map((d, i) => ({ desc: d, ...q1(i) }));
    else { its = dl.map((d, i) => ({ desc: d, ...q1(i) })); fl.push({ s: 'media', m: `Descrições (${dl.length}) e quantidades (${ql.length}) com contagens diferentes; confira os materiais.` }); }
    if (!its.length) its = [{ desc: '(sem descrição)', q: null, un: normUn('') }];
    const seen = {}; const items = its.map(x => { const k0 = slugK(x.desc); seen[k0] = (seen[k0] || 0) + 1; return { k: `${k0}#${seen[k0]}`, desc: x.desc, qtd: x.q, un: x.un, recBase: full ? (x.q || 0) : 0, full }; });
    // pedidos
    const pnums = cs(g('pedido')).split(/[\s,;\/]+/).filter(validPed), prz = (cs(g('prazo')).match(/\d+/g) || []), movp = cs(g('movPed')).split(/[\s,;]+/).filter(Boolean);
    const ests = g('est') instanceof Date || typeof g('est') === 'number' ? [g('est')] : (cs(g('est')).match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g) || []);
    const pick = (arr, i, bro) => arr.length === pnums.length ? arr[i] : (arr.length === 1 && bro ? arr[0] : null);
    const pedidos = pnums.map((pn, i) => { const e = pick(ests, i, false); const d = e != null ? pdate(e, ctx) : { iso: null, inf: false }; inferred = inferred || d.inf; const p = pick(prz, i, false); return { num: pn, mov: pick(movp, i, true) || null, prazo: p != null ? +p : null, estTxt: e == null ? null : (e instanceof Date ? fmt(d.iso) : String(e)), est: d.iso }; });
    let estReq = null;
    if (pnums.length > 1 && ests.length === 1) { const d = pdate(ests[0], ctx); estReq = d.iso; inferred = inferred || d.inf; fl.push({ s: 'info', m: 'Vários pedidos com uma única data estimada; a data não foi atribuída a cada pedido.' }); }
    if (pnums.length > 1 && prz.length === 1) fl.push({ s: 'info', m: 'Vários pedidos com um único prazo; o prazo não foi atribuído a cada pedido.' });
    if (inferred) fl.push({ s: 'media', m: 'A planilha traz datas sem ano; o ano da data de abertura foi assumido. Conferir na origem.' });
    const ex = {}; extras.forEach(([name, i]) => { const v = row[i]; if (v !== '' && v != null) ex[name] = v instanceof Date ? fmt(pdate(v).iso) : String(v); });
    const doc = { num, mov: cs(g('mov')), base: cs(g('base')), abertura: ab.iso, aberturaTxt: cs(g('ab') instanceof Date ? fmt(ab.iso) : g('ab')), projeto: cs(g('proj')), statusReq: cs(g('sreq')), aprovTxt: aprTxt, aprovDatas, movs, obs, pedidos, estReq, raw: { pedido: cs(g('pedido')), prazo: cs(g('prazo')), est: ests.map(e => e instanceof Date ? fmt(pdate(e).iso) : String(e)).join(' ') }, statusGeral: sg, solicitante: cs(g('sol')), items, fl, validar, extras: ex, fonte: '' };
    if (docs[id]) { // mesma requisição em outra linha: une materiais e pedidos
      const d0 = docs[id]; const keys = new Set(d0.items.map(i => i.k));
      doc.items.forEach(i => { let k = i.k; let c = 1; while (keys.has(k)) { c++; k = i.k.replace(/#\d+$/, '#' + (parseInt(i.k.split('#')[1]) + c - 1)); } i.k = k; keys.add(k); d0.items.push(i); });
      doc.pedidos.forEach(p => { if (!d0.pedidos.some(x => x.num === p.num)) d0.pedidos.push(p); });
      ['mov', 'base', 'projeto', 'statusReq', 'aprovTxt', 'obs', 'statusGeral', 'solicitante'].forEach(k => { if (!d0[k] && doc[k]) d0[k] = doc[k]; });
      d0.aprovDatas = [...new Set([...d0.aprovDatas, ...doc.aprovDatas])]; d0.fl.push(...doc.fl); d0.validar.push(...doc.validar);
    } else docs[id] = doc;
  }
  return { docs, errors };
}
const SRC = ['mov', 'base', 'abertura', 'projeto', 'statusReq', 'aprovTxt', 'aprovDatas', 'movs', 'obs', 'estReq', 'raw', 'statusGeral', 'solicitante'];
const LBL = { mov: 'Tipo de movimento', base: 'Base', abertura: 'Data de abertura', projeto: 'Projeto', statusReq: 'Status da requisição', aprovTxt: 'Aprovação diretoria', aprovDatas: 'Datas de aprovação', movs: 'Movimentações', obs: 'Observações', estReq: 'Data estimada (requisição)', raw: 'Dados originais', statusGeral: 'Status geral', solicitante: 'Solicitante' };
const shw = v => v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
let ignItems = [];
function mergeDoc(old, nw, fname) {
  if (!old) return { doc: { ...nw, ov: {}, obsMan: [], ap: [], fonte: 'Excel ' + fname }, isNew: true, changes: [] };
  const d = JSON.parse(JSON.stringify(old)); const ch = [];
  SRC.forEach(k => { const emp = v => v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v).some(x => x !== '' && x != null)); if (emp(nw[k]) && !emp(d[k])) return; if (JSON.stringify(d[k] == null ? null : d[k]) !== JSON.stringify(nw[k] == null ? null : nw[k])) { if (!(k === 'raw' || k === 'movs')) ch.push({ campo: LBL[k], de: shw(k === 'abertura' ? fmt(d[k]) : d[k]), para: shw(k === 'abertura' ? fmt(nw[k]) : nw[k]) }); d[k] = nw[k]; } });
  const oldP = Object.fromEntries((d.pedidos || []).map(p => [p.num, p]));
  const np = nw.pedidos.map(p => { const o = oldP[p.num]; if (o && p.est == null && o.est) { p.est = o.est; p.estTxt = o.estTxt; } if (!o) { ch.push({ campo: 'Novo pedido', de: '', para: p.num }); return p; } if ((o.est || null) !== (p.est || null)) ch.push({ campo: 'Data estimada do pedido ' + p.num, de: fmt(o.est), para: fmt(p.est) }); if ((o.prazo || null) !== (p.prazo || null)) ch.push({ campo: 'Prazo do pedido ' + p.num, de: shw(o.prazo), para: shw(p.prazo) }); return { ...p, ...(o.estOv ? { estOv: o.estOv } : {}), ...(o.manual ? { manual: true } : {}) }; });
  (d.pedidos || []).forEach(o => { if (o.manual && !np.some(p => p.num === o.num)) np.push(o); });
  d.pedidos = np;
  // Regra do "Prazo de Entrega": 0 = sem a última aprovação da diretoria; >0 = data estimada em dias úteis a partir da última aprovação
  d.ov = d.ov || {};
  const sheetPrz = nw.pedidos.filter(p => p.prazo != null);
  if (sheetPrz.some(p => p.prazo === 0)) {
    const ja = /aguardando/.test(nz(d.ov.statusReq != null ? d.ov.statusReq : d.statusReq));
    if (!ja) { const prev = d.ov.statusReq != null ? d.ov.statusReq : d.statusReq; const om = (((old.ov && old.ov.statusReq != null) ? old.ov.statusReq : old.statusReq) || '').match(/aguardando\s+aprova\S*\s+(\S+)/i); const novo = 'Aguardando aprovação' + (om ? ' ' + om[1] : ''); d.ov.statusReq = novo; d.ov.auto = true; ch.push({ campo: 'Status da requisição (prazo de entrega 0)', de: prev, para: novo }); }
  } else if (sheetPrz.length) {
    if (d.ov.auto) { delete d.ov.statusReq; delete d.ov.auto; ch.push({ campo: 'Status da requisição', de: 'Aguardando aprovação (prazo 0)', para: 'conforme a origem' }); }
    const la = lastApproval(d);
    if (la) d.pedidos.forEach(p => { if (p.prazo > 0 && !p.estOv) { const e = addBD(la, +p.prazo); if (e !== p.est) { ch.push({ campo: 'Data estimada do pedido ' + p.num + ' (dias úteis desde ' + fmt(la) + ')', de: fmt(p.est), para: fmt(e) }); p.est = e; p.estTxt = fmt(e); p.calc = true; } } });
  }
  const oi = Object.fromEntries(d.items.map(i => [i.k, i]));
  nw.items.forEach(ni => { const o = oi[ni.k]; if (!o) { ignItems.push(d.num + ': ' + ni.desc); return; } if (o.qtd !== ni.qtd) { ch.push({ campo: 'Quantidade de ' + ni.desc.slice(0, 40), de: shw(o.qtd), para: shw(ni.qtd) }); o.qtd = ni.qtd; } if (o.un !== ni.un) o.un = ni.un; if (o.recBase !== ni.recBase) { ch.push({ campo: 'Recebido (origem) de ' + ni.desc.slice(0, 40), de: shw(o.recBase), para: shw(ni.recBase) }); o.recBase = ni.recBase; } o.full = ni.full; });
  d.fl = nw.fl; d.validar = nw.validar; d.extras = nw.extras;
  if (ch.length) d.fonte = 'Excel ' + fname;
  return { doc: d, isNew: false, changes: ch };
}
async function handleFile(file) {
  const out = $('#imp-out'); if (!file) return;
  if (typeof XLSX === 'undefined') { out.innerHTML = '<div class="err">A biblioteca de Excel não carregou.</div>'; return; }
  out.innerHTML = '<p class="mut">Lendo planilha…</p>';
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sh = wb.SheetNames.find(n => /requisi|pedido|dados|base/i.test(n)) || wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sh], { header: 1, raw: true, defval: '' });
    const { docs, errors } = parseRows(rows);
    const plan = []; let nUp = 0, nSame = 0; const ign = []; ignItems = [];
    for (const [id, nd] of Object.entries(docs)) {
      if (!S.reqs[id]) { ign.push(nd.num); continue; }
      const m = mergeDoc(S.reqs[id], nd, file.name);
      if (m.changes.length) { nUp++; plan.push({ id, ...m }); } else nSame++;
    }
    IMP = { file: file.name, plan, errors, nNew: 0, nUp, nSame, ign, ignItems: ignItems.slice(), total: Object.keys(docs).length };
    out.innerHTML = `<div class="cards3"><div class="mini"><div class="l">Linhas lidas (requisições)</div><div class="v">${IMP.total}</div></div><div class="mini"><div class="l">Fora do sistema (desconsideradas)</div><div class="v">${ign.length}</div></div><div class="mini"><div class="l">Com alterações</div><div class="v">${nUp}</div></div><div class="mini"><div class="l">Sem alteração</div><div class="v">${nSame}</div></div><div class="mini"><div class="l">Erros</div><div class="v">${errors.length}</div></div></div>
    ${ign.length ? `<p class="note">Requisições que não existem no sistema e foram desconsideradas: ${esc(ign.slice(0, 40).join(', '))}${ign.length > 40 ? '…' : ''}.</p>` : ''}${IMP.ignItems.length ? `<p class="note">Materiais que não existem nas requisições do sistema e foram desconsiderados: ${IMP.ignItems.length}.</p>` : ''}
    ${errors.length ? `<div class="sec">Erros de importação</div>${errors.slice(0, 30).map(e => `<div class="sev alta"><b>Linha ${e.l}</b><span>${esc(e.m)} ${esc(e.a)}</span></div>`).join('')}` : ''}
    ${plan.length ? `<div class="sec">O que será gravado</div><div class="tw" style="max-height:280px"><table><thead><tr><th>Requisição</th><th>Situação</th><th>Alterações</th></tr></thead><tbody>${plan.slice(0, 80).map(p => `<tr style="cursor:default"><td>${esc(p.doc.num)}</td><td>${p.isNew ? 'Nova' : 'Atualizada'}</td><td>${p.isNew ? esc(p.doc.items.length + ' material(is)') : esc(p.changes.slice(0, 4).map(c => c.campo + ': ' + c.de + ' → ' + c.para).join(' | '))}</td></tr>`).join('')}</tbody></table></div>` : '<p>Nada a gravar: a planilha não traz diferenças em relação à base.</p>'}
    <p><button class="btn" data-act="apply" ${plan.length || errors.length ? '' : 'disabled'}>${plan.length ? 'Aplicar importação' : 'Registrar importação'}</button></p>`;
  } catch (e) { out.innerHTML = `<div class="err">${esc(e.message || 'Não foi possível ler a planilha.')}</div>`; }
}
async function applyImport() {
  if (!IMP) return; const P = IMP; const out = $('#imp-out'); let k = 0;
  try {
    for (const p of P.plan) {
      await enqueue(async () => { await withRetry(() => S.db.doc('requisicoes/' + p.id).set(p.doc)); await logH({ req: p.doc.num, reqId: p.id, tipo: p.isNew ? 'Importação Excel (nova)' : 'Importação Excel', changes: p.isNew ? [{ campo: 'Requisição criada', de: '', para: P.file }] : p.changes.slice(0, 25) }); });
      k++; out.innerHTML = `<p class="mut">Gravando… ${k} de ${P.plan.length}</p>`;
    }
    await enqueue(() => withRetry(() => S.db.collection('importacoes').add({ ts: Date.now(), iso: S.today, arquivo: P.file, origem: 'Excel', novas: 0, ignoradas: P.ign.length, atualizadas: P.nUp, iguais: P.nSame, erros: P.errors.length, usuario: S.uname || 'Usuário' })));
    toast('Importação concluída.'); IMP = null; out.innerHTML = '<p>Importação concluída. A base, os indicadores e a notificação de atrasos já foram atualizados.</p>';
  } catch (e) { toast(errMsg(e), true); out.innerHTML += `<div class="err">Importação interrompida após ${k} registro(s). Reimporte o mesmo arquivo para concluir; nada será duplicado.</div>`; }
}

/* ---------- cartões, gráficos e ações ---------- */
function openCard(k) {
  const { rows, reqs, st, un } = S.cur; const un2 = un;
  const itemCols = [cItem.req, cItem.ped, cItem.proj, cItem.base, cItem.desc, cItem.qs, cItem.qr, cItem.qp, cItem.st, cItem.est, cItem.dias, cItem.sol];
  if (k === 'req') return openList('Requisições', [{ l: 'Nº Requisição', t: c => reqNum(c.r) }, { l: 'Projeto', t: c => c.r.projeto, w: 1 }, { l: 'Base', t: c => c.r.base || '—' }, { l: 'Status requisição', t: c => c.sr || '—' }, { l: 'Pedidos', t: c => pedLabel(c) }, { l: 'Solicitante', t: c => c.r.solicitante || '—' }], reqs, { onRow: c => openReq(c.id) });
  if (k === 'ped') return openList('Pedidos de compra', pedCols, pedRows(reqs), { onRow: openPed });
  if (k === 'apr') return openList('Aprovações pendentes', [{ l: 'Nº Requisição', t: c => reqNum(c.r) }, { l: 'Projeto', t: c => c.r.projeto, w: 1 }, { l: 'Responsável pendente', t: c => c.apr }, { l: 'Aprovações realizadas (data · quem)', t: c => apTxt(c), w: 1 }, { l: 'Solicitante', t: c => c.r.solicitante || '—' }], reqs.filter(c => c.pendGeral), { onRow: c => openReq(c.id) });
  if (k === 'pct') return openList(`Recebimento por material · ${un2}`, itemCols, rows.filter(i => i.un === un2 && i.qtd != null && i.st !== 'canc'));
  const names = { rec: 'Materiais recebidos', pend: 'Materiais pendentes (no prazo)', atr: 'Materiais atrasados', val: 'Materiais a validar', canc: 'Materiais cancelados', semprev: 'Materiais aguardando aprovação' };
  const keep = k === 'rec' ? (i => i.rec > 0) : k === 'canc' ? (i => i.canc > 0) : (i => i.pend > 0 && i.pbk === k);
  openList(names[k] + ' · ' + un2, itemCols, rows.filter(i => (i.un === un2 || i.qtd == null) && keep(i)));
}
const ACT = {
  nav(el) { S.page = el.dataset.k; S.edit = null; closeModal(); render(); window.scrollTo(0, 0); },
  close: closeModal,
  clr() { S.F = {}; render(); },
  card(el) { openCard(el.dataset.k); },
  seg(el) { openCard(el.dataset.k); },
  atrasos() { const { rows } = S.cur; openList('Itens em atraso', [cItem.req, cItem.ped, cItem.proj, cItem.base, cItem.desc, cItem.qs, cItem.qr, cItem.qp, cItem.qa, cItem.apd, cItem.est, cItem.dias, cItem.sol, cItem.obs], rows.filter(i => i.st === 'atr'), { onRow: i => openReq(i.id), empty: 'Nenhum item em atraso.' }); },
  bar(el) { const k = el.dataset.k; const m = S.cur.st.peds; openList('Pedidos: ' + BK[k].l, pedCols, pedRows(S.cur.reqs).filter(o => o.st === k), { onRow: openPed }); },
  tab(el) { S.adm = el.dataset.k; IMP = null; render(); },
  'add-i'() { $('#rows-i').insertAdjacentHTML('beforeend', itemRow()); },
  'add-p'() { $('#rows-p').insertAdjacentHTML('beforeend', pedRow()); },
  rm(el) { el.closest('[data-row]').remove(); },
  'calc-est'() { const f = $('#nova'); const ap = f.elements.ap.value; if (!ap) return toast('Informe a data de aprovação para calcular.', true); $$('[data-row="p"]', f).forEach(r => { const p = $('[name=p]', r).value, e = $('[name=e]', r); if (p && !e.value) e.value = addBD(ap, +p); }); },
  edit(el) { S.edit = el.dataset.id; S.page = 'nova'; closeModal(); render(); },
  'cancel-edit'() { S.edit = null; S.page = 'requisicoes'; render(); },
  apply: applyImport,
  copyhead() { copyText(HEADERS.join('\t')); },
  nat() { const H = new Set([...(S.cfg.feriados || []), ...NATIONAL]); saveCfg({ feriados: [...H].sort() }); },
  role(el) { setRole(el.dataset.uid, el.dataset.to); },
  logout() { try { sessionStorage.removeItem('rq_ok_' + S.uid); } catch (e) { } S.auth = S.perfil ? 'login' : 'novo'; S.authErr = ''; closeModal(); render(); },
  rmlogo() { saveCfg({ logo: '' }); },
  gologo() { S.page = 'admin'; S.adm = 'par'; render(); },
  rmhol(el) { saveCfg({ feriados: (S.cfg.feriados || []).filter(d => d !== el.dataset.k) }); }
};
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el); } });

/* ---------- render ---------- */
const PAGES = { resumo: [pageResumo, postResumo], requisicoes: [pageReqs, postReqs], pedidos: [pagePeds, postPeds], materiais: [pageMat, postMat], aprovacoes: [pageApr, postApr], atrasos: [pageAtr, postAtr], nova: [pageNova, null], admin: [pageAdmin, () => { if (S.adm === 'inc') postInc(); if (S.adm === 'hist') postHist(); if (S.adm === 'usuarios') postUsers(); }] };
function navHTML() {
  const { rows } = applyFilters ? { rows: S.C.flatMap(c => c.items) } : { rows: [] };
  const nAtr = rows.filter(i => i.st === 'atr').length, nApr = S.C.filter(c => c.pendGeral).length;
  return NAV.map(([k, l]) => `<a data-act="nav" data-k="${k}" class="${S.page === k ? 'on' : ''}" role="link" tabindex="0"><i></i>${l}${k === 'atrasos' && nAtr ? `<span class="nb red">${nAtr}</span>` : ''}${k === 'aprovacoes' && nApr ? `<span class="nb">${nApr}</span>` : ''}</a>`).join('');
}
function setLogo(file) {
  if (!file) return; const img = new Image(), fr = new FileReader();
  fr.onload = () => { img.onload = () => { const k = Math.min(1, 320 / img.width, 120 / img.height); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); saveCfg({ logo: cv.toDataURL('image/png') }); }; img.onerror = () => toast('Imagem inválida.', true); img.src = fr.result; };
  fr.readAsDataURL(file);
}
function logoHTML() { return S.cfg.logo ? `<div class="logo"><img src="${esc(S.cfg.logo)}" alt="Logo"></div>` : (S.canEdit ? `<div class="logo ph" data-act="gologo" role="button" tabindex="0">Inserir logo WFS</div>` : ''); }
function render() {
  const main = $('#main'); if (!main) return;
  const lg = $('#logo'); if (lg) lg.innerHTML = logoHTML();
  $('#nav').innerHTML = S.loaded ? navHTML() : NAV.map(([k, l]) => `<a data-act="nav" data-k="${k}" class="${S.page === k ? 'on' : ''}"><i></i>${l}</a>`).join('');
  if (S.noDb) { main.innerHTML = head('Painel de Requisições') + `<div class="panel empty-st"><h2>Banco de dados indisponível</h2><p>Entre na sua conta Claude para abrir esta página com acesso aos dados salvos.</p></div>`; return; }
  if (S.auth !== 'ok') { $('#nav').innerHTML = ''; const w = $('#who'); if (w) w.innerHTML = ''; main.innerHTML = authHTML(); return; }
  whoRender();
  if (!S.loaded) { main.innerHTML = head('Resumo') + `<div class="panel empty-st"><h2>Carregando a base…</h2></div>`; return; }
  if (!S.C.length && S.page !== 'admin' && S.page !== 'nova') {
    main.innerHTML = head(NAV.find(n => n[0] === S.page)[1]) + `<div class="panel empty-st"><h2>Nenhum dado na base ainda</h2><p>Importe a planilha em Administração para começar, ou cadastre a primeira requisição em Nova Requisição.</p><p><button class="btn" data-act="nav" data-k="admin">Ir para Administração</button></p></div>`; return;
  }
  const [pg, post] = PAGES[S.page]; main.innerHTML = pg(); if (post) post();
  S.rendered = true;
  if (S.openReq && $('#ov')) { const c = S.C.find(x => x.id === S.openReq); if (c && !($('#ov').contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) $('#mb', $('#ov')).innerHTML = reqHTML(c); }
}
let tmr = null;
function changed() { clearTimeout(tmr); tmr = setTimeout(() => { recalc(); if (S.page === 'nova' && S.rendered && S.loaded) { $('#nav').innerHTML = navHTML(); return; } render(); }, 60); }
/* ---------- contas ---------- */
const sessOk = () => { try { return sessionStorage.getItem('rq_ok_' + S.uid) === '1'; } catch (e) { return false; } };
const sessSet = () => { try { sessionStorage.setItem('rq_ok_' + S.uid, '1'); } catch (e) { } };
function recomputeAccess() { S.canEdit = !!S.isAdm; S.canWrite = !!(S.isAdm || S.role === 'editor'); }
function authHTML() {
  const wrap = (t, b) => `<div class="authbox"><div class="panel"><h2 style="margin:0 0 4px;font:700 24px var(--f-d)">${t}</h2>${b}</div></div>`;
  if (S.noDb) return wrap('Banco de dados indisponível', '<p>Entre na sua conta Claude para abrir esta página.</p>');
  if (S.auth === 'load') return wrap('Carregando…', '<p class="mut">Verificando seu acesso.</p>');
  const err = `<div class="err" id="aerr">${esc(S.authErr || '')}</div>`;
  if (!S.platWrite) return wrap('Acesso somente leitura', '<p>Para criar sua conta, o dono da página precisa liberar seu acesso como <b>Colaborador</b> em Compartilhar. Depois, abra a página de novo.</p>');
  if (S.auth === 'novo') return wrap('Criar conta', `<p class="mut" style="margin-top:0">Use seu nome completo como usuário e sua matrícula como senha.</p><form class="f one" data-form="cad" autocomplete="off"><label>Nome (usuário)<input name="nome" required autocomplete="off"></label><label>Matrícula (senha)<input name="mat" type="password" inputmode="numeric" required autocomplete="new-password"></label><label>Confirme a matrícula<input name="mat2" type="password" inputmode="numeric" required autocomplete="new-password"></label>${err}<div><button class="btn">Criar conta e entrar</button></div></form><p class="note">Todo cadastro entra como Leitor. O administrador libera a edição.</p>`);
  return wrap('Entrar', `<p class="mut" style="margin-top:0">Informe seu nome e sua matrícula.</p><form class="f one" data-form="log"><label>Nome (usuário)<input name="nome" value="${esc(S.perfil ? S.perfil.nome : '')}" required autocomplete="off"></label><label>Matrícula (senha)<input name="mat" type="password" inputmode="numeric" required autocomplete="current-password"></label>${err}<div><button class="btn">Entrar</button></div></form>`);
}
function authErr(m) { S.authErr = m; const e = $('#aerr'); if (e) e.textContent = m; }
function whoRender() {
  const w = $('#who'); if (!w) return;
  w.innerHTML = `<div class="nm">${esc(S.uname)}</div><div class="rl">${S.isAdm ? 'Administrador' : S.role === 'editor' ? 'Editor' : 'Leitor'}</div><button class="btn sm lo" data-act="logout">Sair</button>`;
}
async function enterOk() { S.auth = 'ok'; sessSet(); startData(); render(); }
async function doCadastro(f) {
  const nome = f.nome.value.trim().replace(/\s+/g, ' '), mat = f.mat.value.trim(), mat2 = f.mat2.value.trim();
  if (nome.length < 3 || !slugN(nome)) return authErr('Informe o nome completo.');
  if (!/^[0-9A-Za-z]{3,20}$/.test(mat)) return authErr('A matrícula deve ter de 3 a 20 letras ou números.');
  if (mat !== mat2) return authErr('As duas matrículas não são iguais.');
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x => x.toString(16).padStart(2, '0')).join(''), slug = slugN(nome);
  const perfil = { uid: S.uid, nome, slug, salt, hash: pwHash(salt, slug, mat), criado: Date.now(), ultimoLogin: Date.now(), logins: 1 };
  try { await withRetry(() => S.db.doc('perfis/' + S.uid).set(perfil)); } catch (e) { return authErr(errMsg(e)); }
  S.perfil = perfil; S.uname = nome; await enterOk();
}
let tries = 0;
async function doLogin(f) {
  if (tries >= 5) return authErr('Muitas tentativas. Recarregue a página para tentar de novo.');
  const p = S.perfil, nome = f.nome.value.trim().replace(/\s+/g, ' '), mat = f.mat.value.trim();
  if (!p || slugN(nome) !== p.slug || pwHash(p.salt, p.slug, mat) !== p.hash) { tries++; return authErr('Usuário ou senha incorretos.'); }
  S.uname = p.nome; p.ultimoLogin = Date.now(); p.logins = (p.logins || 0) + 1;
  try { await withRetry(() => S.db.doc('perfis/' + S.uid).set(p)); } catch (e) { }
  await enterOk();
}
let started = false;
function startData() {
  if (started) return; started = true; const db = S.db;
  const err = e => { S.loaded = true; toast('Falha ao ler a base: ' + ((e && e.message) || ''), true); render(); };
  db.collection('requisicoes').onSnapshot(s => { const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); }); S.reqs = m; S.loaded = true; changed(); }, err);
  db.doc('config/main').onSnapshot(s => { if (s.exists) S.cfg = { ...S.cfg, ...s.data() }; changed(); }, () => { });
  db.collection('historico').orderBy('ts', 'desc').limit(500).onSnapshot(s => { S.hist = s.docs.map(d => d.data()); changed(); }, () => { });
  db.collection('importacoes').orderBy('ts', 'desc').limit(60).onSnapshot(s => { S.imps = s.docs.map(d => d.data()); changed(); }, () => { });
  if (S.isAdm) {
    db.collection('perfis').onSnapshot(s => { S.perfis = s.docs.map(d => d.data()); changed(); }, () => { });
    db.collection('permissoes').onSnapshot(s => { const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); }); S.perms = m; changed(); }, () => { });
  }
}
async function boot() {
  const hash = (location.hash || '').slice(1); if (PAGES[hash]) S.page = hash;
  render();
  setInterval(() => { if (S.loaded && todayISO() !== S.today) { recalc(); render(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.loaded && todayISO() !== S.today) { recalc(); render(); } });
  if (!window.claude || !window.claude.use) { S.noDb = true; render(); return; }
  const db = await window.claude.use('db'); const u = await window.claude.use('user');
  if (!db || !u) { S.noDb = true; render(); return; }
  S.db = db;
  try { S.uid = await u.id(); } catch (e) { }
  try { S.isOwner = !!(await u.isOwner()); } catch (e) { }
  try { S.isAdm = !!(await u.canEdit()) || S.isOwner; } catch (e) { S.isAdm = S.isOwner; }
  try { S.platWrite = (await u.can('data.write')) !== false; } catch (e) { }
  if (!S.uid) { S.noDb = true; render(); return; }
  recomputeAccess();
  db.doc('permissoes/' + S.uid).onSnapshot(s => { S.role = s.exists && s.data().role === 'editor' ? 'editor' : 'leitor'; recomputeAccess(); if (S.auth === 'ok') changed(); }, () => { });
  try {
    const ps = await db.doc('perfis/' + S.uid).get();
    if (ps.exists) { S.perfil = ps.data(); S.uname = S.perfil.nome; if (sessOk()) { S.auth = 'ok'; startData(); } else S.auth = 'login'; }
    else {
      let claimed = false;
      if (S.isOwner) { // pré-cadastro do administrador
        try { const pc = await db.collection('preCadastros').get(); const d = pc.docs.map(x => x.data()).find(x => x && x.role === 'admin' && x.hash);
          if (d) { const perfil = { uid: S.uid, nome: d.nome, slug: d.slug, salt: d.salt, hash: d.hash, criado: Date.now(), ultimoLogin: Date.now(), logins: 1, preCadastro: true }; await db.doc('perfis/' + S.uid).set(perfil); S.perfil = perfil; S.uname = d.nome; claimed = true; } } catch (e) { }
      }
      if (claimed) { S.auth = 'ok'; sessSet(); startData(); } else S.auth = 'novo';
    }
  } catch (e) { S.auth = S.platWrite ? 'novo' : 'novo'; }
  render();
}
boot();
/*UI-END*/
