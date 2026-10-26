const fs = require('fs');
const dir = '/tmp/claude-0/-home-claude/313432f9-c562-5b66-943b-1b40d15f7c72/scratchpad/';
const src = fs.readFileSync(dir + 'logic.js', 'utf8');
const T = {};
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FALHOU:', m); } };
const body = src + `
const cfg = JSON.parse(fs.readFileSync(dir + 'seed/config_main.json', 'utf8'));
S.cfg = cfg; S.H = new Set(cfg.feriados); S.today = '2026-10-22';
for (const f of fs.readdirSync(dir + 'seed')) { if (f.startsWith('r_')) S.reqs[f.replace('.json','')] = JSON.parse(fs.readFileSync(dir + 'seed/' + f, 'utf8')); }
todayISO = () => '2026-10-22'; recalc();
return {S, calcReq, addBD, bdBetween, stats, applyFilters, buildPeds, pdate, pq, fmt, sreqNorm};`;
const L = new Function('fs', 'dir', body)(fs, dir);
const { S, addBD, bdBetween, stats, applyFilters, pdate, pq } = L;

// dias úteis: aprovação 20/08/2026 + 10 úteis = 03/09/2026
ok(addBD('2026-08-20', 10) === '2026-09-03', 'addBD 20/08+10 => ' + addBD('2026-08-20', 10));
// segunda 5 dias úteis => segunda seguinte
ok(addBD('2026-10-05', 5) === '2026-10-12', 'addBD 05/10+5 => ' + addBD('2026-10-05', 5));
S.H.add('2026-10-12'); ok(addBD('2026-10-05', 5) === '2026-10-13', 'com feriado 12/10'); S.H.delete('2026-10-12');
ok(addBD('2026-09-21', 10) === '2026-10-05', '21/09+10 => ' + addBD('2026-09-21', 10));
ok(addBD('2026-09-24', 20) === '2026-10-22', '24/09+20 => ' + addBD('2026-09-24', 20));
ok(addBD('2026-10-13', 15) === '2026-11-03', '13/10+15 => ' + addBD('2026-10-13', 15));
ok(bdBetween('2026-10-21', '2026-10-22') === 1, 'atraso 1 dia útil');
ok(bdBetween('2026-10-09', '2026-10-22') === 9, 'atraso 09/10->22/10 = ' + bdBetween('2026-10-09', '2026-10-22'));
ok(bdBetween('2026-10-16', '2026-10-19') === 1, 'sexta->segunda = 1 dia útil');
// parse
ok(pdate('05/10', 2026).iso === '2026-10-05' && pdate('05/10', 2026).inf, 'data sem ano');
ok(pdate('09/03/26').iso === '2026-03-09', 'dd/mm/yy');
ok(pq('300 MTS').un === 'MT' && pq('300 MTS').q === 300, 'pq MTS');
ok(pq('02').q === 2 && pq('02').un === 'UN', 'pq 02');

const { rows, reqs } = applyFilters();
const st = stats(rows, reqs, 'UN');
console.log('requisições', reqs.length, 'itens', rows.length);
console.log('qtd UN', JSON.stringify(st.q), 'pct', st.pct && st.pct.toFixed(1));
console.log('itens por status', JSON.stringify(st.nIt));
console.log('pedidos únicos', st.peds.size, JSON.stringify(st.pc));
console.log('aprovações pendentes', st.apr.length, JSON.stringify(st.byApr), 'sem pedido', st.semPed);
const st2 = stats(rows, reqs, 'MT'); console.log('qtd MT', JSON.stringify(st2.q));

const byNum = n => S.C.find(c => c.num === n);
const atr = rows.filter(i => i.st === 'atr');
ok(atr.length === 2 && atr.map(i => i.r.num).sort().join() === '42174,42298', 'atrasados = 42174 e 42298: ' + atr.map(i => i.r.num));
ok(atr.find(i => i.r.num === '42298').dias === 9, 'dias 42298');
ok(atr.find(i => i.r.num === '42174').dias === 1, 'dias 42174');
// aprovação pendente nunca é atraso
ok(byNum('43064').items.every(i => i.st === 'semprev'), '43064 sem previsão (aprovação pendente)');
ok(byNum('41621').items[0].st === 'semprev', '41621 aprovação pendente != atraso');
// recebido integral fora dos atrasos
ok(byNum('41379').items.every(i => i.st === 'rec' && i.pend === 0), '41379 recebido');
// cancelado
ok(byNum('34562').items.every(i => i.st === 'canc' && i.canc === i.qtd), '34562 cancelado');
// vínculo pendente
ok(byNum('41493').items.every(i => i.st === 'val' && i.possivel), '41493 vínculo a validar com possível atraso');
ok(byNum('43693').items.every(i => i.st === 'pend'), '43693 pendente (data única 03/11)');
ok(byNum('44012').items.every(i => i.st === 'pend'), '44012 pendente');
// conflitos
ok(byNum('31124').items[0].st === 'val', '31124 conflito');
ok(byNum('30102').items[0].st === 'val', '30102 conflito');
// pedidos únicos: 60917 aparece em 3 requisições e conta 1
const peds = st.peds;
ok(S.C.filter(c=>c.pendGeral).length === 24, 'pendentes status geral = 24'); ok(peds.get('60917').entries.length === 3, '60917 em 3 requisições: ' + peds.get('60917').entries.length);
ok(peds.get('648').entries.length === 2, '648 em 2 requisições');
ok(!peds.has('PENDENTE'), 'PENDENTE não é pedido');
// requisição com 5 itens e 3 pedidos conta 1
ok(reqs.filter(c => c.num === '41493').length === 1, 'req única');
// reimportação: idempotente na contagem (docs únicos por id)
ok(reqs.length === Object.keys(S.reqs).length, 'req = docs');
// donut soma
const tot = st.q.rec + st.q.pend + st.q.atr + st.q.canc;
console.log('total classificado donut UN', tot, ['rec', 'pend', 'atr', 'canc'].map(k => (st.q[k] / tot * 100).toFixed(1)).join(' / '));
// flags de data
const f41379 = byNum('41379').flags.map(f => f.m);
ok(f41379.some(m => /Invertendo dia e mês/.test(m)), '41379 sinaliza dia/mês invertido: ' + f41379.join('|'));
console.log('passou', pass, 'falhou', fail);
