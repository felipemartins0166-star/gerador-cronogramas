/*LOGIC-START*/
const S = { reqs: {}, hist: [], imps: [], cfg: { feriados: [], tz: 'America/Sao_Paulo', defaultUnit: 'UN', minDigitsPedido: 4 },
  today: '', H: new Set(), C: [], F: {}, page: 'resumo', adm: 'import', db: null, canWrite: false, canEdit: false, auth: 'load', role: 'leitor', isOwner: false, isAdm: false, platWrite: true, perfil: null, perfis: [], perms: {}, uid: null, uname: '', ready: false, units: ['UN'], edit: null };

const BK = {
  rec: { l: 'Recebido', c: '--ok' }, pend: { l: 'Pendente', c: '--warn' }, atr: { l: 'Atrasado', c: '--bad' },
  canc: { l: 'Cancelado', c: '--off' }, semprev: { l: 'Aguardando aprovação', c: '--teal' }, val: { l: 'A validar', c: '--vio' }
};
const nz = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const fromD = n => new Date(n * 864e5).toISOString().slice(0, 10);
const fmt = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—';
const isBiz = n => { const w = new Date(n * 864e5).getUTCDay(); return w !== 0 && w !== 6 && !S.H.has(fromD(n)); };
function addBD(iso, k) { let n = D(iso); while (k > 0) { n++; if (isBiz(n)) k--; } return fromD(n); }
function bdBetween(a, b) { let n = D(a), e = D(b), c = 0; while (n < e) { n++; if (isBiz(n)) c++; } return c; }
function todayISO() { try { return new Intl.DateTimeFormat('sv-SE', { timeZone: S.cfg.tz || 'America/Sao_Paulo' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
function swapDM(iso) { if (!iso) return null; const [y, m, d] = iso.split('-'); if (+d > 12) return null; return `${y}-${d}-${m}`; }

/* ---- leitura de datas e quantidades (importação) ---- */
function pdate(v, ctxYear) {
  if (v == null || v === '') return { iso: null, inf: false };
  if (v instanceof Date) { if (isNaN(v)) return { iso: null, inf: false }; return { iso: new Date(v.getTime() + 12 * 36e5).toISOString().slice(0, 10), inf: false }; }
  if (typeof v === 'number') { if (v > 20000 && v < 80000) return { iso: fromD(Math.floor(v) - 25569), inf: false }; return { iso: null, inf: false }; }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { iso: `${m[1]}-${m[2]}-${m[3]}`, inf: false };
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return { iso: null, inf: false };
  let d = +m[1], mo = +m[2], y = m[3], inf = false;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return { iso: null, inf: false };
  if (y == null) { y = ctxYear || new Date().getFullYear(); inf = true; } else { y = +y; if (y < 100) y += 2000; }
  return { iso: `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, inf };
}
function normUn(u) { u = String(u || '').trim().toUpperCase(); if (!u) return S.cfg.defaultUnit || 'UN'; if (/^(MTS?|M|METROS?)$/.test(u)) return 'MT'; if (/^(UN|UND|UNID|UNIDADES?)$/.test(u)) return 'UN'; return u; }
function pq(tok) {
  const m = String(tok).trim().match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-zÀ-ú]{1,10})?$/);
  if (!m) return { q: null, un: normUn('') };
  return { q: parseFloat(m[1].replace(',', '.')), un: normUn(m[2]) };
}
const slugK = s => nz(s).replace(/[^a-z0-9]/g, '').slice(0, 60);
const validPed = n => /\d/.test(String(n || ''));

/* ---- cálculo por requisição ---- */
function calcReq(id, r) {
  const T = S.today, ov = r.ov || {};
  const sg = ov.statusGeral != null ? ov.statusGeral : (r.statusGeral || '');
  const sr = ov.statusReq != null ? ov.statusReq : (r.statusReq || '');
  const nsg = nz(sg), nsr = nz(sr);
  const cancelled = /cancel/.test(nsg) || /^cancel/.test(nsr);
  const awaiting = /aguardando/.test(nsr);
  let apr = null, stage = null;
  if (awaiting && !cancelled) {
    if (/aguardando\s+(pedido|cotac|abertura)/.test(nsr)) stage = sr;
    else { const m = sr.match(/aguardando\s+(?:a\s+)?(?:aprova\S*\s+)?(?:d[eo]\s+)?(\S+)/i); apr = (m && !/^aprova/i.test(m[1])) ? m[1] : '(não informado)'; }
  }
  const peds = (r.pedidos || []).map(p => ({ ...p, e: p.estOv || p.est || null }));
  let dates = [...new Set(peds.map(p => p.e).filter(Boolean))];
  if (!dates.length && r.estReq) dates = [r.estReq];
  const multi = dates.length > 1;
  const validar = r.validar && r.validar.length ? r.validar : null;
  const items = (r.items || []).map((it, idx) => {
    const q = (it.qtd == null || isNaN(it.qtd)) ? null : Number(it.qtd);
    const recMan = (it.rec || []).reduce((a, x) => a + Number(x.q || 0), 0);
    const o = { id, r, idx, it, qtd: q, un: it.un || S.cfg.defaultUnit, rec: (it.recBase || 0) + recMan, canc: Number(it.canc || 0), pend: 0, pbk: null, st: 'val', reason: '', est: null, dias: 0, possivel: false, parcial: false, incons: false };
    if (q == null) {
      o.rec = 0; o.canc = 0;
      if (cancelled) o.st = 'canc'; else if (it.full && !validar) o.st = 'rec'; else { o.st = 'val'; o.reason = 'Quantidade ausente'; }
      return o;
    }
    if (cancelled) o.canc = Math.max(o.canc, q - o.rec);
    let pend = q - o.rec - o.canc;
    if (pend < 0) { o.incons = true; pend = 0; }
    o.pend = pend;
    if (pend === 0) { o.st = o.rec > 0 ? 'rec' : 'canc'; return o; }
    let pbk;
    if (validar) { pbk = 'val'; o.reason = validar[0]; }
    else if (awaiting) { pbk = 'semprev'; o.reason = apr ? 'Aguardando aprovação de ' + apr : sr; }
    else if (!sg) { pbk = 'val'; o.reason = 'Sem status geral na origem'; }
    else if (multi) { pbk = 'val'; o.reason = 'Vínculo item↔pedido pendente de validação'; o.possivel = dates.some(d => d < T); }
    else if (!dates.length) { pbk = 'semprev'; o.reason = 'Sem data estimada de entrega'; }
    else { const e = dates[0]; o.est = e; if (e < T) { pbk = 'atr'; o.dias = bdBetween(e, T); } else pbk = 'pend'; }
    o.pbk = pbk; o.st = pbk; o.parcial = o.rec > 0;
    return o;
  });
  const pendGeral = /pendente/.test(nsg) && !cancelled && !(items.length && items.every(i => i.qtd != null && i.pend === 0));
  const c = { id, r, num: r.num, sg, sr, cancelled, awaiting, apr, stage, items, dates, multi, validar, pendGeral };
  items.forEach(i => { i.c = c; });
  c.peds = peds.map(p => ({ ...p, st: pedSt(c, p) }));
  c.flags = flagsOf(c, peds);
  return c;
}
function pedSt(c, p) {
  if (c.cancelled) return 'canc';
  const act = c.items.filter(i => !(i.qtd != null && i.pend === 0 && i.rec === 0));
  if (!act.length) return 'canc';
  if (act.every(i => i.st === 'rec')) return 'rec';
  if (c.validar || !c.sg) return 'val';
  if (c.awaiting) return 'semprev';
  if (c.multi) { const e = p.e; if (!e) return 'semprev'; return e < S.today ? 'val' : 'pend'; }
  const i0 = act.find(i => i.pend > 0);
  return i0 ? i0.pbk : 'rec';
}
function flagsOf(c, peds) {
  const r = c.r, F = [], T = S.today;
  (r.fl || []).forEach(f => F.push({ s: f.s, m: f.m }));
  (r.validar || []).forEach(m => F.push({ s: 'alta', m }));
  const ap = (r.aprovDatas || []).filter(Boolean);
  if (r.abertura && r.abertura > T) F.push({ s: 'media', m: `Data de abertura (${fmt(r.abertura)}) é posterior à data de hoje. Possível dia/mês invertido.` });
  if (r.abertura && ap.length && r.abertura > ap.slice().sort()[0]) F.push({ s: 'media', m: `Data de abertura (${fmt(r.abertura)}) é posterior à data de aprovação (${fmt(ap.slice().sort()[0])}). Possível dia/mês invertido.` });
  peds.forEach((p, i) => {
    const apv = ap.length === peds.length ? ap[i] : (ap.length === 1 ? ap[0] : null);
    if (!p.e || !apv) return;
    if (p.e < apv) {
      const sw = swapDM(p.e); const calc = p.prazo ? addBD(apv, +p.prazo) : null;
      F.push({ s: 'media', m: `Pedido ${p.num}: data estimada (${fmt(p.e)}) anterior à aprovação (${fmt(apv)}).` + (sw && calc && sw === calc ? ' Invertendo dia e mês, coincide com a data calculada (' + fmt(calc) + ').' : '') });
    } else if (p.prazo) {
      const calc = addBD(apv, +p.prazo);
      if (calc !== p.e) {
        const sa = swapDM(apv); const hint = (sa && addBD(sa, +p.prazo) === p.e) ? ` Invertendo dia e mês da aprovação (${fmt(sa)}), a data calculada coincide com a informada.` : '';
        F.push({ s: 'media', m: `Pedido ${p.num}: data informada (${fmt(p.e)}) diverge da calculada (${fmt(calc)}), com ${p.prazo} dias úteis após a aprovação de ${fmt(apv)}.` + hint });
      }
    }
  });
  if (c.items.length > 1 && peds.length > 1 && !(r.fl || []).some(f => /distribuição|quantidade de cada pedido|prazo/.test(f.m)))
    F.push({ s: 'media', m: 'Vários materiais e vários pedidos: vínculo item↔pedido pendente de validação.' });
  c.items.forEach(i => { if (i.incons) F.push({ s: 'alta', m: `Material "${i.it.desc.slice(0, 50)}": recebido + cancelado maior que o solicitado.` }); });
  return F;
}
function sreqNorm(c) {
  if (c.cancelled) return 'Cancelado';
  const n = nz(c.sr);
  if (c.apr) return 'Aguardando aprovação';
  if (/aguardando pedido/.test(n)) return 'Aguardando pedido de compra';
  if (/aguardando cotac/.test(n)) return 'Aguardando cotação';
  if (/aprovado/.test(n)) return 'Aprovado';
  if (c.stage) return 'Aguardando outra etapa';
  return 'Outro / não informado';
}
function recalc() {
  S.H = new Set(S.cfg.feriados || []);
  S.today = todayISO();
  S.C = Object.entries(S.reqs).map(([id, r]) => calcReq(id, r));
  const u = {};
  S.C.forEach(c => c.items.forEach(i => { if (i.qtd != null) u[i.un] = (u[i.un] || 0) + i.qtd; }));
  S.units = Object.keys(u).sort((a, b) => (b === (S.cfg.defaultUnit || 'UN')) - (a === (S.cfg.defaultUnit || 'UN')) || u[b] - u[a]);
  if (!S.units.length) S.units = [S.cfg.defaultUnit || 'UN'];
}
function buildPeds(cs) {
  const m = new Map();
  for (const c of cs) for (const p of c.peds) {
    if (!validPed(p.num)) continue;
    let o = m.get(p.num); if (!o) { o = { num: p.num, entries: [] }; m.set(p.num, o); }
    o.entries.push({ c, p });
  }
  for (const o of m.values()) {
    const L = o.entries.map(e => e.p.st);
    o.st = L.includes('atr') ? 'atr' : L.includes('val') ? 'val' : L.includes('pend') ? 'pend' : L.includes('semprev') ? 'semprev' : L.includes('rec') ? 'rec' : 'canc';
  }
  return m;
}
function applyFilters() {
  const F = S.F, rows = [], reqs = [];
  for (const c of S.C) {
    const r = c.r;
    if (F.from && (!r.abertura || r.abertura < F.from)) continue;
    if (F.to && (!r.abertura || r.abertura > F.to)) continue;
    if (F.proj && r.projeto !== F.proj) continue;
    if (F.base && r.base !== F.base) continue;
    if (F.solic && r.solicitante !== F.solic) continue;
    if (F.mov && r.mov !== F.mov) continue;
    if (F.sreq && sreqNorm(c) !== F.sreq) continue;
    if (F.apr && c.apr !== F.apr) continue;
    if (F.estFrom && !c.dates.some(d => d >= F.estFrom)) continue;
    if (F.estTo && !c.dates.some(d => d <= F.estTo)) continue;
    if (F.sped && !c.peds.some(p => p.st === F.sped)) continue;
    const its = c.items.filter(i => !F.sit || i.st === F.sit);
    if (!its.length) continue;
    reqs.push(c); rows.push(...its);
  }
  return { rows, reqs };
}
function stats(rows, reqs, un) {
  const q = { rec: 0, pend: 0, atr: 0, canc: 0, semprev: 0, val: 0 };
  rows.forEach(i => { if (i.qtd == null || i.un !== un) return; q.rec += i.rec; q.canc += i.canc; if (i.pend) q[i.pbk] += i.pend; });
  const nIt = { rec: 0, pend: 0, atr: 0, canc: 0, semprev: 0, val: 0 };
  rows.forEach(i => { nIt[i.st]++; });
  const active = q.pend + q.atr + q.semprev + q.val;
  const pct = (q.rec + active) > 0 ? q.rec / (q.rec + active) * 100 : null;
  const peds = buildPeds(reqs);
  const pc = { rec: 0, pend: 0, atr: 0, canc: 0, semprev: 0, val: 0 };
  peds.forEach(o => pc[o.st]++);
  const apr = reqs.filter(c => c.pendGeral);
  const byApr = {}; apr.forEach(c => { const k = c.apr || 'sem aprovação pendente'; byApr[k] = (byApr[k] || 0) + 1; });
  const semPed = reqs.filter(c => !c.peds.some(p => validPed(p.num))).length;
  return { q, nIt, pct, peds, pc, apr, byApr, semPed };
}
function unitSum(rows, f) { const m = {}; rows.forEach(i => { if (i.qtd == null) return; const v = f(i); if (v) m[i.un] = (m[i.un] || 0) + v; }); return Object.entries(m).map(([u, v]) => nfmt(v) + ' ' + u).join(' · ') || '0'; }
const nfmt = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function pedLabel(c) { const n = c.peds.filter(p => validPed(p.num)).map(p => p.num); if (!n.length) return c.r.raw && c.r.raw.pedido ? c.r.raw.pedido : '—'; return n.join(' · '); }
/*LOGIC-END*/
