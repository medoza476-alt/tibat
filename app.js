/* ตีแบต — LIFF web app (customer / owner / admin) on Supabase */
const CFG = window.TIBAT;
const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const bkkNow = () => new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}));
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ds(d); };
const today = () => ds(bkkNow());
const nowH = () => bkkNow().getHours();
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const thD = s => parseD(s).toLocaleDateString('th-TH', {weekday: 'short', day: 'numeric', month: 'short'});
const hh = h => `${pad(h)}:00`;
const baht = n => '฿' + Number(n || 0).toLocaleString('th-TH', {maximumFractionDigits: 2});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const groupBy = (arr, k) => arr.reduce((m, x) => ((m[x[k]] = m[x[k]] || []).push(x), m), {});
function km(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const ERR = {
  not_authenticated: 'กรุณาเข้าสู่ระบบใหม่', venue_not_found: 'ไม่พบสนามนี้', date_out_of_range: 'วันที่เลือกเกินช่วงที่สนามเปิดให้จอง',
  slot_taken: 'มีคนจองช่องนี้ไปแล้ว กรุณาเลือกใหม่', slot_in_past: 'ช่วงเวลานี้ผ่านไปแล้ว', invalid_slot: 'ช่วงเวลาไม่ถูกต้อง', invalid_slots: 'กรุณาเลือกช่วงเวลา',
  name_required: 'กรุณากรอกชื่อผู้จอง', too_many_holds: 'คุณมีรายการรอชำระค้างอยู่ 3 รายการ กรุณาชำระหรือยกเลิกก่อน',
  online_disabled: 'สนามนี้ยังไม่เปิดรับจองออนไลน์', package_unavailable: 'คอร์ทว่างไม่พอสำหรับแพ็กเกจนี้', package_not_found: 'ไม่พบแพ็กเกจ', package_invalid: 'แพ็กเกจไม่ตรงกับเวลาทำการของสนาม',
  frontdesk_required: 'ต้องเปิดใช้ระบบหน้าร้านก่อน', forbidden: 'ไม่มีสิทธิ์ทำรายการนี้', nothing_due: 'ไม่มีค่าบริการค้างชำระ',
  payment_account_required: 'กรุณากรอกพร้อมเพย์และชื่อบัญชีรับเงิน', too_many_pending: 'มีสนามรออนุมัติมากเกินไป', order_not_found: 'ไม่พบรายการ', order_not_in_review: 'รายการนี้ไม่ได้รอตรวจสลิปแล้ว', reason_required: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ ลูกค้าจะเห็นข้อความนี้', order_not_free: 'รายการนี้ยังมียอดที่ต้องโอน', too_many_leads: 'คุณแนะนำสนามที่รอติดต่ออยู่ครบ 5 แห่งแล้ว', lead_contact_required: 'กรุณาใส่เบอร์โทรหรือลิงก์ของสนามอย่างน้อยหนึ่งอย่าง', invite_not_found: 'ลิงก์คำเชิญนี้ใช้ไม่ได้หรือถูกใช้ไปแล้ว', line_required: 'ต้องเข้าสู่ระบบด้วย LINE ก่อนลงทะเบียนสนาม', documents_required: 'กรุณาแนบรูปหลักฐานให้ครบ 3 รูป', public_link_required: 'กรุณาใส่ลิงก์ Google Maps หรือเพจของสนาม (ขึ้นต้นด้วย https://)', verification_incomplete: 'ยังตรวจสอบไม่ครบทุกข้อ และต้องบันทึกชื่อบัญชีที่เห็นจากการโอนทดสอบ', probation_limit: 'สนามนี้เพิ่งเข้าระบบ จึงจำกัดยอดต่อรายการไว้ชั่วคราว กรุณาลดจำนวนชั่วโมง', report_requires_booking: 'รายงานได้เฉพาะผู้ที่เคยจองสนามนี้', locked_after_approval: 'ข้อมูลนี้ล็อกหลังอนุมัติ กรุณาติดต่อทีมตีแบต',
};
const errMsg = e => ERR[e?.message] || e?.message || 'เกิดข้อผิดพลาด';
function toast(t) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); }
function modal(html) { $('modal').innerHTML = `<div class="modal" onclick="if(event.target===this)closeModal()"><div class="sheet">${html}</div></div>`; }
function closeModal() { $('modal').innerHTML = ''; }
async function rpc(fn, args) { const { data, error } = await sb.rpc(fn, args); if (error) throw error; return data; }
function photoOf(v) {
  if (v.photo_url) return v.photo_url;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#dfeee6"/><rect x="60" y="50" width="200" height="110" fill="#2f9e62" stroke="#fff" stroke-width="3"/><line x1="60" y1="105" x2="260" y2="105" stroke="#fff" stroke-width="3"/><line x1="160" y1="50" x2="160" y2="160" stroke="#fff"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const DEEP0 = new URLSearchParams(location.search);
function appLink(q) { return (S.settings.liff_id ? `https://liff.line.me/${S.settings.liff_id}` : location.origin + location.pathname) + '?' + q; }
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว'); } catch (_) { toast('คัดลอกไม่ได้ — กดค้างที่ข้อความเพื่อคัดลอก'); } }

// ---------- state ----------
const S = {
  role: 'customer', route: 'home', homeTab: 'list', q: '', settings: {}, user: null, profile: null,
  me: null, meFallback: {lat: 13.2885, lng: 100.9135}, venues: [], free: {},
  venue: null, date: null, sel: [], taken: {}, order: null, payInfo: null, slipFile: null,
  myVenues: [], ownerVenueId: null, ownerDate: null, regPick: null, regPhoto: null, adminTab: 'approve',
};
let leaf = null, timer = null;

// ---------- auth ----------
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function exchange(body) {
  const r = await fetch(`${CFG.SUPABASE_URL}/functions/v1/line-auth`, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: CFG.SUPABASE_KEY}, body: JSON.stringify(body)});
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'login_failed');
  const { error } = await sb.auth.verifyOtp({token_hash: j.token_hash, type: 'email'});
  if (error) throw error;
}
async function login() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) return;
  if (S.settings.liff_id) {
    await loadScript('https://static.line-scdn.net/liff/edge/2/sdk.js');
    await liff.init({liffId: S.settings.liff_id});
    if (!liff.isLoggedIn()) { liff.login({redirectUri: location.href}); return new Promise(() => {}); }
    try { await exchange({id_token: liff.getIDToken()}); }
    catch (e) { if (e.message === 'invalid_line_token') { liff.logout(); liff.login({redirectUri: location.href}); return new Promise(() => {}); } throw e; }
  } else if (S.settings.allow_guest_login === 'true') {
    let g = null;
    try { g = localStorage.getItem('tibat_guest'); if (!g) { g = crypto.randomUUID(); localStorage.setItem('tibat_guest', g); } } catch (_) { g = crypto.randomUUID(); }
    await exchange({guest_id: g});
  } else throw new Error('ยังไม่ได้ตั้งค่า LINE Login');
}
async function boot() {
  try {
    const { data: st, error } = await sb.from('app_settings').select('key,value');
    if (error) throw error;
    S.settings = Object.fromEntries(st.map(r => [r.key, r.value]));
    await login();
    const { data: { user } } = await sb.auth.getUser();
    S.user = user;
    const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    S.profile = prof || {};
    $('who').textContent = S.profile.display_name || 'จองสนามแบดมินตัน';
    const b = [];
    if (!S.settings.liff_id) b.push('โหมดทดลอง: ยังไม่ได้เชื่อม LINE Login');
    if (S.settings.slip_test_mode === 'true') b.push('โหมดทดสอบสลิป: ยังไม่ตรวจสลิปจริง');
    $('banner').innerHTML = b.length ? `<div class="banner">${b.join(' · ')}</div>` : '';
    locate();
    S.date = today(); S.ownerDate = today();
    const dp = new URLSearchParams(location.search), inv = dp.get('invite') || DEEP0.get('invite'), dv = dp.get('v') || DEEP0.get('v');
    const rf = dp.get('ref') || DEEP0.get('ref');
    if (rf) { S.refCode = rf; S.role = 'owner'; S.route = 'register'; }
    if (inv) { S.role = 'owner'; S.route = 'claim'; S.inviteCode = inv; }
    else if (dv) { await loadVenues(); const v = S.venues.find(x => x.id === dv); if (v) { S.venue = v; S.route = 'venue'; S.sel = []; } }
    render();
  } catch (e) {
    $('view').innerHTML = `<div class="wrap"><div class="card"><b>เข้าสู่ระบบไม่สำเร็จ</b><p class="sm mut" style="margin:6px 0 12px">${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">ลองใหม่</button></div></div>`;
  }
}
function locate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(p => { S.me = {lat: p.coords.latitude, lng: p.coords.longitude}; if (S.role === 'customer' && S.route === 'home') render(); }, () => {}, {timeout: 8000, maximumAge: 60000});
}
function showMe() {
  modal(`<h2>บัญชีของฉัน</h2><div class="kv"><span>ชื่อ</span><b>${esc(S.profile?.display_name || '-')}</b></div>
    <div class="kv"><span>รหัสผู้ใช้</span><b style="font-family:monospace">${esc((S.user?.id || '').slice(0, 8))}</b></div>
    <div class="kv"><span>สิทธิ์</span><span>${S.profile?.is_admin ? 'แอดมินตีแบต' : 'ผู้ใช้ทั่วไป'}</span></div>
    <button class="btn ghost" style="margin-top:14px" onclick="logout()">ออกจากระบบ</button>`);
}
async function logout() { await sb.auth.signOut(); try { if (window.liff && liff.isLoggedIn()) liff.logout(); } catch (_) {} location.reload(); }

// ---------- router ----------
function go(route, extra) {
  Object.assign(S, extra || {}); S.route = route;
  if (timer) { clearInterval(timer); timer = null; }
  render(); window.scrollTo(0, 0);
}
function setRole(r) { S.role = r; go({customer: 'home', owner: 'today', admin: 'approve'}[r]); }
const VIEWS = {
  customer: {home: vHome, venue: vVenue, pay: vPay, bookings: vMyBookings, refer: vRefer},
  owner: {today: vOwnerToday, pricing: vPricing, venue: vOwnerVenue, register: vRegister, pay: vPay, claim: vClaim},
  admin: {approve: vApprove, invite: vInvite, revenue: vRevenue, slips: vSlips, settings: vSettings},
};
let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const roles = [['customer', '👤 ลูกค้า'], ['owner', '🏸 เจ้าของสนาม']];
  if (S.profile?.is_admin) roles.push(['admin', '🛠 แอดมิน']);
  $('roles').innerHTML = roles.map(([k, t]) => `<button class="${S.role === k ? 'on' : ''}" onclick="setRole('${k}')">${t}</button>`).join('');
  const navs = {
    customer: [['home', '🔍', 'หาสนาม'], ['bookings', '🎫', 'การจองของฉัน'], ['refer', '🎁', 'ชวนสนาม']],
    owner: [['today', '📅', 'ตารางจอง'], ['pricing', '🏷️', 'ราคา/โปร'], ['venue', '🏟️', 'สนามของฉัน'], ['register', '➕', 'ลงทะเบียน']],
    admin: [['approve', '✅', 'อนุมัติ'], ['invite', '📞', 'ชวนสนาม'], ['revenue', '💰', 'รายได้'], ['slips', '🧾', 'สลิป'], ['settings', '⚙️', 'ตั้งค่า']],
  }[S.role];
  const act = S.role === 'customer' && ['venue', 'pay'].includes(S.route) ? 'home' : S.route;
  $('nav').innerHTML = navs.map(([r, i, t]) => `<button class="${act === r ? 'on' : ''}" onclick="go('${r}')"><span class="i">${i}</span>${t}</button>`).join('');
  if (leaf) { leaf.remove(); leaf = null; }
  if (!$('view').querySelector('.wrap')) $('view').innerHTML = `<div class="loading"><div class="spin"></div></div>`;
  try {
    const html = await VIEWS[S.role][S.route]();
    if (seq !== renderSeq) return;
    $('view').innerHTML = `<div class="wrap">${html}</div>`;
    afterRender();
  } catch (e) {
    if (seq !== renderSeq) return;
    $('view').innerHTML = `<div class="wrap"><div class="card"><b>โหลดข้อมูลไม่สำเร็จ</b><p class="sm mut" style="margin:6px 0 12px">${esc(errMsg(e))}</p><button class="btn" onclick="render()">ลองใหม่</button></div></div>`;
  }
}
function afterRender() {
  if (S.role === 'customer' && S.route === 'home' && S.homeTab === 'map') drawHomeMap();
  if ((S.role === 'owner' && S.route === 'register') || (S.role === 'admin' && S.route === 'invite' && !S.lastInvite)) drawPickMap();
  if (S.role === 'admin' && S.route === 'approve') drawApproveMaps();
  if (S.route === 'pay') startCountdown();
}

// ---------- pricing (mirror of server; server decides the real price) ----------
function priceFor(v, date, h) {
  const dow = parseD(date).getDay();
  const p = (v.promos || []).filter(p => p.active && p.days.includes(dow) && h >= p.from_hour && h < p.to_hour).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!p) return {price: Number(v.price_per_hour), promo: null};
  return {price: p.mode === 'fixed' ? Number(p.value) : Math.round(v.price_per_hour * (1 + p.value / 100)), promo: p};
}
function promoText(p, v) {
  if (p.mode === 'fixed') return `ราคา ${baht(p.value)}/ชม.`;
  const np = baht(Math.round(v.price_per_hour * (1 + p.value / 100)));
  return p.value < 0 ? `ลด ${-p.value}% (${np})` : `บวก ${p.value}% (${np})`;
}
const fee = () => Number(S.settings.booking_fee_per_hour || 10);

// ---------- customer: home ----------
async function loadVenues() {
  const { data, error } = await sb.from('venues').select('*, promos(*), packages(*)').eq('status', 'approved');
  if (error) throw error;
  S.venues = data;
  const fr = await rpc('venues_free_today');
  S.free = Object.fromEntries((fr || []).map(r => [r.venue_id, r.free_slots]));
}
async function vHome() {
  await loadVenues();
  const me = S.me || S.meFallback;
  let list = S.venues.map(v => ({...v, d: km(me, v)}));
  if (S.q) list = list.filter(v => (v.name + v.address).toLowerCase().includes(S.q.toLowerCase()));
  list.sort((a, b) => a.d - b.d);
  S._list = list;
  const head = `<div class="card" style="padding:12px">
      <div class="row"><span>📍</span><div style="flex:1" class="sm">${S.me ? 'ใช้ตำแหน่งปัจจุบันของคุณ' : 'ยังไม่ได้ตำแหน่งของคุณ — แสดงระยะจากบางแสน'}</div><button class="btn ghost sm" onclick="locate();toast('กำลังหาตำแหน่ง…')">หาตำแหน่ง</button></div>
      <input id="q" style="margin-top:10px" placeholder="ค้นหาชื่อสนาม / ตำบล / อำเภอ" value="${esc(S.q)}" onchange="S.q=this.value;render()">
    </div>
    <div class="tabs"><button class="${S.homeTab === 'list' ? 'on' : ''}" onclick="S.homeTab='list';render()">ใกล้ฉัน</button><button class="${S.homeTab === 'map' ? 'on' : ''}" onclick="S.homeTab='map';render()">แผนที่</button></div>`;
  if (S.homeTab === 'map') return head + `<div id="map" class="leaf"></div><p class="sm mut" style="margin-top:8px">แตะป้ายราคาเพื่อเปิดสนาม · สนามในระบบ ${list.length} แห่ง</p>`;
  if (!list.length) return head + `<div class="empty">${S.q ? 'ไม่พบสนามที่ค้นหา' : 'ยังไม่มีสนามในระบบ<br>เจ้าของสนามลงทะเบียนได้ที่โหมด "เจ้าของสนาม"'}</div>`;
  return head + `<div class="sm mut" style="margin-bottom:8px">เรียงจากใกล้ที่สุด</div>` + list.map(v => {
    const f = S.free[v.id] ?? 0;
    return `<div class="card vc" onclick="openVenue('${v.id}')"><img src="${esc(photoOf(v))}" alt=""><div style="flex:1;min-width:0">
      <div class="n">${esc(v.name)}</div><div class="sm mut">${v.d.toFixed(1)} กม. · ${v.court_count} คอร์ท · ${hh(v.open_hour)}–${hh(v.close_hour)}</div>
      <div class="row wrapf" style="margin-top:6px"><span class="b">${baht(v.price_per_hour)}<span class="sm mut">/ชม.</span></span>
      ${v.promos.some(p => p.active) ? '<span class="chip warn">มีโปร</span>' : ''}${v.packages.some(p => p.active) ? '<span class="chip pur">แพ็กเกจก๊วน</span>' : ''}
      <span class="chip ${f ? '' : 'gray'}">${f ? `วันนี้ว่าง ${f} ช่อง` : 'วันนี้เต็ม'}</span></div></div></div>`;
  }).join('');
}
function osm(map) { L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap'}).addTo(map); }
function drawHomeMap() {
  const me = S.me || S.meFallback, list = S._list || [];
  leaf = L.map('map').setView([me.lat, me.lng], 12);
  osm(leaf);
  if (S.me) L.marker([me.lat, me.lng], {icon: L.divIcon({className: '', html: '<div class="mex"></div>', iconSize: [16, 16], iconAnchor: [8, 8]})}).addTo(leaf);
  const pts = list.map(v => {
    L.marker([v.lat, v.lng], {icon: L.divIcon({className: '', html: `<span class="pinx">🏸 ${baht(v.price_per_hour)}</span>`, iconSize: [0, 0]})})
      .addTo(leaf).on('click', () => openVenue(v.id)).bindTooltip(v.name);
    return [v.lat, v.lng];
  });
  if (pts.length) leaf.fitBounds(L.latLngBounds(pts.concat(S.me ? [[me.lat, me.lng]] : [])).pad(0.2), {maxZoom: 14});
}
function openVenue(id) { go('venue', {venue: S.venues.find(v => v.id === id), date: today(), sel: []}); }

// ---------- customer: venue ----------
async function vVenue() {
  const v = S.venue;
  if (!v) return (S.route = 'home', vHome());
  const av = await rpc('get_availability', {p_venue: v.id, p_date: S.date});
  S.taken = Object.fromEntries((av || []).map(a => [`${a.court_no}-${a.hour}`, a.status]));
  S.sel = S.sel.filter(s => !S.taken[`${s.court}-${s.hour}`]);
  const pa = await rpc('venue_public_account', {p_venue: v.id}).catch(() => null);
  S.feeWaived = !!pa?.fee_waived;
  S.credit = Number(await rpc('my_credit').catch(() => 0)) || 0;
  const me = S.me || S.meFallback, td = today(), nh = nowH();
  const dates = Array.from({length: v.advance_days + 1}, (_, i) => addDays(td, i));
  let rows = '';
  for (let h = v.open_hour; h < v.close_hour; h++) {
    const pr = priceFor(v, S.date, h);
    let tds = '';
    for (let c = 1; c <= v.court_count; c++) {
      const past = S.date === td && h <= nh, tk = S.taken[`${c}-${h}`], sel = S.sel.some(s => s.court === c && s.hour === h);
      const cls = past ? 's-past' : tk ? 's-taken' : sel ? 's-sel' : pr.promo ? 's-promo' : 's-free';
      tds += `<td class="${cls}" data-base="${pr.promo ? 's-promo' : 's-free'}" ${!past && !tk ? `onclick="toggleSlot(this,${c},${h})"` : ''}>${past ? '–' : tk ? 'ไม่ว่าง' : baht(pr.price)}</td>`;
    }
    rows += `<tr><th>${hh(h)}</th>${tds}</tr>`;
  }
  const promos = v.promos.filter(p => p.active).map(p => `<div class="sm">🏷️ <b>${esc(p.name)}</b> — ${promoText(p, v)} (${p.days.map(d => DOW[d]).join(' ')} ${hh(p.from_hour)}–${hh(p.to_hour)})</div>`).join('');
  const pkgs = v.packages.filter(p => p.active).map(p => {
    const units = p.court_count * (p.to_hour - p.from_hour) * p.weeks;
    return `<div class="pk"><div class="row between"><b>${esc(p.name)}</b><span class="chip pur">แพ็กเกจก๊วน</span></div>
      <div class="sm" style="margin:4px 0">${p.court_count} คอร์ท · ทุกวัน${DOW[p.dow]} ${hh(p.from_hour)}–${hh(p.to_hour)} · ${p.weeks} สัปดาห์ (${units} คอร์ท-ชม.)</div>
      <div class="row between"><div><b>${baht(p.price)}</b> <span class="sm mut" style="text-decoration:line-through">${baht(units * v.price_per_hour)}</span></div>
      <button class="btn sm" style="background:var(--pur)" onclick="askCustomer('pkg','${p.id}')">จองแพ็กเกจ</button></div></div>`;
  }).join('');
  return `<div class="row" style="margin-bottom:8px"><button class="btn ghost sm" onclick="go('home')">← กลับ</button></div>
    <img class="hero" src="${esc(photoOf(v))}" alt="">
    <h2 style="margin-bottom:2px">${esc(v.name)}</h2>
    <div class="sm mut">${esc(v.address)} · ${km(me, v).toFixed(1)} กม. · <a href="https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}" target="_blank" rel="noopener">นำทาง</a></div>
    <div class="row wrapf" style="margin:8px 0 4px"><span class="chip">${v.court_count} คอร์ท</span><span class="chip gray">เปิด ${hh(v.open_hour)}–${hh(v.close_hour)}</span><span class="chip gray">จองล่วงหน้าได้ ${v.advance_days} วัน</span><span class="chip gray">ปกติ ${baht(v.price_per_hour)}/ชม.</span></div>
    ${pa ? `<div class="sm" style="margin-top:6px">✅ ผ่านการตรวจสอบโดยตีแบต · เงินโอนเข้าบัญชี <b>${esc(pa.account_name)}</b>${pa.probation ? ' · <span class="chip warn">สนามใหม่</span>' : ''}${pa.can_report ? ` · <a href="#" onclick="reportVenue();return false">แจ้งปัญหา</a>` : ''}</div>` : ''}
    ${v.online_enabled ? '' : '<div class="note" style="margin-top:8px">สนามนี้ปิดรับจองออนไลน์ชั่วคราว กรุณาโทรจองกับสนามโดยตรง</div>'}
    ${promos ? `<div class="card" style="padding:10px;margin-top:8px">${promos}</div>` : ''}
    ${pkgs ? `<h3>แพ็กเกจก๊วน (เช่ายาว หลายคอร์ท)</h3>${pkgs}` : ''}
    <h3>เลือกวัน และช่วงเวลา</h3>
    <div class="dates">${dates.map(d => `<button class="${S.date === d ? 'on' : ''}" onclick="S.date='${d}';S.sel=[];render()">${d === td ? 'วันนี้' : thD(d).split(' ')[0]}<br><b>${parseD(d).getDate()}</b></button>`).join('')}</div>
    <div class="legend" style="margin-bottom:6px"><span><i style="background:var(--gl)"></i>ว่าง</span><span><i style="background:#fff4dd"></i>ราคาโปร</span><span><i style="background:var(--g)"></i>เลือกแล้ว</span><span><i style="background:#eceff0"></i>ไม่ว่าง</span></div>
    <div class="slots"><table><tr><th></th>${Array.from({length: v.court_count}, (_, i) => `<th>คอร์ท ${i + 1}</th>`).join('')}</tr>${rows}</table></div>
    <div class="sum" id="sum">${selSummary()}</div>`;
}
function toggleSlot(td, c, h) {
  const i = S.sel.findIndex(s => s.court === c && s.hour === h);
  if (i >= 0) { S.sel.splice(i, 1); td.className = td.dataset.base; } else { S.sel.push({court: c, hour: h}); td.className = 's-sel'; }
  $('sum').innerHTML = selSummary();
}
function selSummary() {
  const v = S.venue;
  if (!S.sel.length) return `<div class="sm mut" style="text-align:center">แตะช่องว่างในตารางเพื่อเลือก (เลือกได้หลายคอร์ท/หลายชั่วโมง)</div>`;
  const court = S.sel.reduce((a, s) => a + priceFor(v, S.date, s.hour).price, 0), f = S.feeWaived ? 0 : S.sel.length * fee();
  return `<div class="kv"><span>${S.sel.length} คอร์ท-ชม. · ${thD(S.date)}</span><span>${baht(court)}</span></div>
    <div class="kv sm mut"><span>${S.feeWaived ? '🎁 ค่าบริการจอง — ฟรีเพราะคุณชวนสนามนี้' : `ค่าบริการจอง (${fee()} บาท × ${S.sel.length})`}</span><span>${baht(f)}</span></div>
    ${S.credit > 0 ? `<div class="kv sm" style="color:var(--gd)"><span>🎁 ใช้เครดิตของคุณ</span><span>−${baht(Math.min(S.credit, court + f))}</span></div>` : ''}
    <div class="kv t"><span>รวม</span><span>${baht(Math.max(0, court + f - (S.credit || 0)))}</span></div>
    <button class="btn" style="margin-top:8px" onclick="askCustomer('slots')">จองและชำระเงิน</button>`;
}
function askCustomer(kind, id) {
  const p = S.profile || {};
  modal(`<h2>ข้อมูลผู้จอง</h2>
    <label>ชื่อผู้จอง / ชื่อก๊วน</label><input id="cName" value="${esc(p.display_name || '')}">
    <label>เบอร์โทร</label><input id="cPhone" inputmode="tel" value="${esc(p.phone || '')}">
    <label>อีเมลรับการยืนยัน (ไม่บังคับ)</label><input id="cEmail" type="email" value="${esc(p.email || '')}">
    <p class="sm mut" style="margin-top:8px">ระบบจะล็อกคอร์ทให้ ${esc(S.settings.hold_minutes || 10)} นาทีเพื่อรอชำระเงิน</p>
    <button class="btn" id="cGo" style="margin-top:12px" onclick="createOrder('${kind}','${id || ''}')">ยืนยัน</button>`);
}
async function createOrder(kind, id) {
  const name = $('cName').value.trim(), phone = $('cPhone').value.trim(), email = $('cEmail').value.trim();
  $('cGo').disabled = true;
  try {
    const o = kind === 'pkg'
      ? await rpc('create_package_order', {p_package: id, p_name: name, p_phone: phone, p_email: email})
      : await rpc('create_order', {p_venue: S.venue.id, p_date: S.date, p_slots: S.sel, p_name: name, p_phone: phone, p_email: email});
    Object.assign(S.profile, {phone: phone || S.profile.phone, email: email || S.profile.email});
    closeModal(); S.sel = [];
    openPay(o);
  } catch (e) { toast(errMsg(e)); if ($('cGo')) $('cGo').disabled = false; if (e.message === 'slot_taken') { closeModal(); render(); } }
}

function reportVenue() {
  modal(`<h2>แจ้งปัญหาสนามนี้</h2><p class="sm mut">เช่น ไปถึงแล้วไม่มีสนามจริง สนามไม่รับรู้การจอง หรือบัญชีรับเงินไม่ใช่ของสนาม</p>
    <label>รายละเอียด</label><textarea id="rpText" rows="3"></textarea><button class="btn red" style="margin-top:12px" onclick="sendReport()">ส่งรายงาน</button>`);
}
async function sendReport() { try { await rpc('report_venue', {p_venue: S.venue.id, p_reason: $('rpText').value}); closeModal(); toast('ส่งรายงานแล้ว ทีมตีแบตจะตรวจสอบ'); } catch (e) { toast(errMsg(e)); } }

// ---------- payment ----------
function openPay(order) { go('pay', {order, payInfo: null, slipFile: null}); }
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
function promptpayPayload(id, amount) {
  const f = (t, v) => t + pad(v.length) + v;
  const d = String(id).replace(/\D/g, '');
  const acc = d.length >= 15 ? f('03', d) : d.length === 13 ? f('02', d) : f('01', '0066' + d.replace(/^0/, ''));
  const body = f('00', '01') + f('01', '12') + f('29', f('00', 'A000000677010111') + acc) + f('53', '764') + f('54', Number(amount).toFixed(2)) + f('58', 'TH') + '6304';
  return body + crc16(body);
}
function qrSvg(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({cellSize: 4, margin: 2, scalable: true}); }
async function vPay() {
  let o = S.order;
  if (!o) return `<div class="empty">ไม่มีรายการรอชำระ</div>`;
  o = S.order = await rpc('get_order', {p_order: o.id});
  if (o.status === 'confirmed') return confirmedHtml(o) + `<button class="btn" style="margin-top:12px" onclick="afterPay()">เสร็จสิ้น</button>`;
  if (o.status === 'review') return `<div class="card" style="text-align:center"><div style="font-size:40px">⏳</div><h2>รอ${o.kind === 'online' || o.kind === 'package' ? 'สนาม' : 'ทีมตีแบต'}ตรวจสลิป</h2>
      <p class="sm mut">ระบบตรวจอัตโนมัติยืนยันไม่ได้ จึงส่งสลิปให้ผู้รับเงินตรวจเอง คอร์ทยังล็อกไว้ให้</p>
      <div class="sm" style="margin-top:8px">${esc(o.venue.name)} · โทร ${esc(o.venue.phone || '-')} · รหัส ${esc(o.code)}</div>
      <button class="btn ghost" style="margin-top:12px" onclick="afterPay()">กลับ</button></div>`;
  if (o.status === 'rejected') return `<div class="card"><b>ผู้รับเงินไม่อนุมัติสลิปนี้</b><p class="sm" style="margin:6px 0">เหตุผล: ${esc(o.review_note || '-')}</p>
      <p class="sm mut">หากโอนเงินไปแล้วและต้องการเงินคืน กรุณาติดต่อ ${esc(o.venue.name)} โทร ${esc(o.venue.phone || '-')} พร้อมรหัส ${esc(o.code)}</p>
      <button class="btn ghost" style="margin-top:10px" onclick="afterPay()">กลับ</button></div>`;
  if (o.status !== 'hold') return `<div class="card"><b>รายการนี้หมดเวลาชำระแล้ว</b><p class="sm mut" style="margin:6px 0 12px">คอร์ทถูกปล่อยคืนแล้ว กรุณาทำรายการใหม่ หากโอนเงินไปแล้วให้กดส่งสลิปด้านล่างเพื่อให้ระบบพยายามคืนคอร์ทให้</p>
      <input type="file" accept="image/*" onchange="S.slipFile=this.files[0];sendSlip()"><button class="btn ghost" style="margin-top:10px" onclick="afterPay()">กลับ</button></div>`;
  if (Number(o.amount) === 0 && (o.kind === 'online' || o.kind === 'package')) return `<h2>ยืนยันการจอง</h2><div class="card"><b>${esc(o.venue.name)}</b>
      <div class="kv" style="margin-top:8px"><span>ค่าสนาม + ค่าบริการ</span><span>${baht(Number(o.court_total) + Number(o.fee_total))}</span></div>
      <div class="kv" style="color:var(--gd)"><span>🎁 เครดิตที่ใช้</span><span>−${baht(o.credit_used)}</span></div>
      <div class="kv t"><span>ยอดโอน</span><span>${baht(0)}</span></div>
      <button class="btn" style="margin-top:12px" onclick="confirmFree()">ยืนยันการจองด้วยเครดิต</button>
      <button class="btn ghost" style="margin-top:6px" onclick="cancelOrder()">ยกเลิก</button></div>`;
  if (!S.payInfo) S.payInfo = await rpc('get_payment_info', {p_order: o.id});
  const pi = S.payInfo, toVenue = pi.to === 'venue';
  const title = {online: 'ชำระค่าสนาม', package: 'ชำระค่าแพ็กเกจก๊วน', subscription: 'ชำระค่าระบบหน้าร้าน (1 เดือน)', fees: 'ชำระค่าบริการจองออนไลน์'}[o.kind];
  let detail = '';
  if (o.kind === 'online' || o.kind === 'package') {
    const g = groupBy(o.slots, 'play_date');
    detail = (o.package_name ? `<div class="chip pur" style="margin:4px 0">${esc(o.package_name)}</div>` : '') +
      Object.entries(g).map(([d, a]) => `<div class="sm"><b>${thD(d)}</b> · ${a.map(s => `ค${s.court_no} ${hh(s.hour)}`).join(', ')}</div>`).join('');
  }
  const qr = pi.promptpay_id
    ? `<div style="max-width:220px;margin:8px auto">${qrSvg(promptpayPayload(pi.promptpay_id, o.amount))}</div>
       <div class="sm">ผู้รับเงิน: <b>${esc(pi.account_name || '-')}</b>${toVenue ? ' (บัญชีของสนาม)' : ' (ตีแบต)'}</div>
       <div class="sm mut">พร้อมเพย์ ${esc(pi.promptpay_id)}</div>`
    : `<div class="note">ยังไม่ได้ตั้งค่าบัญชีรับเงิน${toVenue ? 'ของสนาม' : 'ของตีแบต'}</div>`;
  return `<div class="row" style="margin-bottom:8px"><button class="btn ghost sm" onclick="cancelOrder()">← ยกเลิกรายการ</button></div>
    <h2>${title}</h2>
    <div class="note" style="margin-bottom:12px">⏱ กรุณาชำระและส่งสลิปภายใน <b id="cd">–</b> ${o.slots.length ? 'ระบบล็อกคอร์ทไว้ให้แล้ว' : ''}</div>
    <div class="card"><div class="row between"><b>${esc(o.venue.name)}</b><span class="sm mut">${o.code}</span></div>${detail}
      <div style="margin-top:10px">${o.kind === 'online' || o.kind === 'package' ? `<div class="kv"><span>ค่าสนาม</span><span>${baht(o.court_total)}</span></div>
      <div class="kv sm mut"><span>ค่าบริการจอง</span><span>${baht(o.fee_total)}</span></div>${Number(o.credit_used) > 0 ? `<div class="kv sm" style="color:var(--gd)"><span>🎁 เครดิตที่ใช้</span><span>−${baht(o.credit_used)}</span></div>` : ''}` : ''}
      <div class="kv t"><span>ยอดโอน</span><span>${baht(o.amount)}</span></div></div></div>
    <div class="card" style="text-align:center"><div class="b" style="color:#0b3d6e">สแกนจ่ายด้วยแอปธนาคาร (PromptPay)</div>${qr}
      <div class="b" style="font-size:20px;margin-top:6px">${baht(o.amount)}</div><div class="sm mut">โอนให้ตรงยอด มิฉะนั้นระบบจะไม่ยืนยันให้</div></div>
    <div class="card"><label style="margin-top:0">แนบสลิปโอนเงิน</label>
      <input type="file" accept="image/*" onchange="S.slipFile=this.files[0];document.getElementById('slipBtn').disabled=!S.slipFile">
      <button class="btn" id="slipBtn" style="margin-top:10px" disabled onclick="sendSlip()">ส่งสลิปเพื่อยืนยัน</button></div>`;
}
async function confirmFree() { try { S.order = await rpc('confirm_free_order', {p_order: S.order.id}); render(); } catch (e) { toast(errMsg(e)); } }
function startCountdown() {
  const el = $('cd'), o = S.order;
  if (!el || !o?.hold_until) return;
  const tick = () => {
    const ms = new Date(o.hold_until) - Date.now();
    if (ms <= 0) { clearInterval(timer); timer = null; render(); return; }
    el.textContent = `${Math.floor(ms / 60000)}:${pad(Math.floor(ms / 1000) % 60)} นาที`;
  };
  tick(); timer = setInterval(tick, 1000);
}
async function cancelOrder() { try { await rpc('cancel_hold', {p_order: S.order.id}); } catch (_) {} afterPay(); }
function afterPay() { const k = S.order?.kind; S.order = null; if (k === 'subscription' || k === 'fees') { S.role = 'owner'; go('today'); } else { S.role = 'customer'; go(k ? 'bookings' : 'home'); } }
async function postSlip(mode) {
  const { data: { session } } = await sb.auth.getSession();
  const fd = new FormData(); fd.append('order_id', S.order.id); fd.append('file', S.slipFile); fd.append('mode', mode);
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 60000);
  try {
    const r = await fetch(`${CFG.SUPABASE_URL}/functions/v1/verify-slip`, {method: 'POST', headers: {Authorization: `Bearer ${session.access_token}`, apikey: CFG.SUPABASE_KEY}, body: fd, signal: ac.signal});
    return await r.json();
  } finally { clearTimeout(t); }
}
async function sendSlip(mode = 'auto') {
  if (!S.slipFile) return;
  modal(`<div style="text-align:center"><div class="spin"></div><div class="b">${mode === 'review' ? 'กำลังส่งสลิปให้ตรวจ…' : 'กำลังตรวจสลิป…'}</div><div class="sm mut">เช็กยอดเงิน บัญชีผู้รับ และสลิปซ้ำ</div></div>`);
  let j;
  try { j = await postSlip(mode); }
  catch (e) { j = {ok: false, can_review: true, network: true, message: 'เชื่อมต่อระบบตรวจสลิปไม่ได้ (สัญญาณอินเทอร์เน็ตหรือระบบขัดข้องชั่วคราว)'}; }
  if (j.ok) {
    S.order = j.order; if (timer) { clearInterval(timer); timer = null; }
    modal(confirmedHtml(j.order, j) + `<button class="btn" style="margin-top:12px" onclick="closeModal();afterPay()">เสร็จสิ้น</button>`);
    return;
  }
  if (j.review) {
    if (timer) { clearInterval(timer); timer = null; }
    modal(`<div style="text-align:center"><div style="font-size:40px">📨</div><h2>ส่งให้ตรวจแล้ว</h2><p class="sm mut">${esc(j.message)}</p><p class="sm" style="margin-top:8px">เมื่อตรวจเสร็จ สถานะจะเปลี่ยนในหน้า "การจองของฉัน"</p><button class="btn" style="margin-top:12px" onclick="closeModal();render()">ตกลง</button></div>`);
    return;
  }
  const who = (S.payInfo?.to === 'platform') ? 'ทีมตีแบต' : 'สนาม';
  modal(`<div style="text-align:center"><div style="font-size:40px">⚠️</div><h2>ระบบยังยืนยันอัตโนมัติไม่ได้</h2><p class="sm mut">${esc(j.message || 'ตรวจสลิปไม่ผ่าน')}</p>
    ${j.final ? '' : `<p class="sm" style="margin:10px 0">ถ้าคุณโอนถูกต้องแล้ว ส่งสลิปนี้ให้${who}ตรวจเองได้เลย คอร์ทจะล็อกไว้ให้ระหว่างรอ</p>
    ${j.can_review !== false ? `<button class="btn" onclick="sendSlip('review')">ส่งให้${who}ตรวจ</button>` : ''}
    ${j.network ? `<button class="btn ghost" style="margin-top:6px" onclick="sendSlip('auto')">ลองตรวจอัตโนมัติอีกครั้ง</button>` : ''}`}
    <button class="btn ghost" style="margin-top:6px" onclick="closeModal()">แนบสลิปใหม่</button></div>`);
}
function confirmedHtml(o, r) {
  if (o.kind === 'subscription' || o.kind === 'fees') return `<div style="text-align:center"><div style="font-size:40px">✅</div><h2>ชำระเรียบร้อย</h2><p class="sm mut">${o.kind === 'subscription' ? 'เปิดใช้ระบบหน้าร้านแล้ว' : 'ชำระค่าบริการจองออนไลน์แล้ว'} · ${baht(o.amount)}</p></div>`;
  const g = groupBy(o.slots, 'play_date');
  return `<div class="email"><div class="hd"><div class="b" style="font-size:16px">✅ ยืนยันการจองสนามแบด</div>${o.email ? `<div class="sm">${r?.emailed ? 'ส่งอีเมลยืนยันไปที่' : 'ผู้จอง:'} ${esc(o.email)}</div>` : ''}</div>
    <div class="bd"><div class="sm mut">รหัสการจอง</div><div class="code">${esc(o.code)}</div>
    <div style="max-width:150px;margin:10px auto">${qrSvg(o.code)}</div>
    <div class="b">${esc(o.venue.name)}</div><div class="sm mut" style="margin-bottom:6px">${esc(o.venue.address)} · โทร ${esc(o.venue.phone || '-')}</div>
    ${o.package_name ? `<div class="chip pur" style="margin-bottom:6px">${esc(o.package_name)}</div>` : ''}
    ${Object.entries(g).map(([d, a]) => `<div class="sm"><b>${thD(d)}</b> · ${a.map(s => `คอร์ท ${s.court_no} ${hh(s.hour)}`).join(', ')}</div>`).join('')}
    <div class="kv t" style="font-size:14px"><span>ชำระแล้ว</span><span>${baht(o.amount)}</span></div>
    <div class="note" style="margin-top:10px">แสดงหน้านี้หรือรหัสการจองที่เคาน์เตอร์สนามได้เลย</div></div></div>`;
}
async function vMyBookings() {
  await rpc('venues_free_today'); // also a cheap keep-alive
  const { data, error } = await sb.from('orders').select('id,code,kind,status,amount,package_name,created_at,hold_until,slots(play_date,court_no,hour),venues(name)')
    .eq('user_id', S.user.id).in('kind', ['online', 'package']).in('status', ['confirmed', 'hold', 'review', 'rejected']).order('created_at', {ascending: false}).limit(50);
  if (error) throw error;
  const live = data.filter(o => o.status !== 'hold' || new Date(o.hold_until) > new Date());
  if (!live.length) return `<h2>การจองของฉัน</h2><div class="empty">ยังไม่มีการจอง<br><br><button class="btn sm" onclick="go('home')">หาสนามใกล้ฉัน</button></div>`;
  return `<h2>การจองของฉัน</h2>` + live.map(o => {
    const first = o.slots.slice().sort((a, b) => (a.play_date + pad(a.hour)).localeCompare(b.play_date + pad(b.hour)))[0];
    return `<div class="card"><div class="row between"><b>${esc(o.venues.name)}</b>${{confirmed: '<span class="chip">ยืนยันแล้ว</span>', hold: '<span class="chip warn">รอชำระ</span>', review: '<span class="chip warn">รอสนามตรวจสลิป</span>', rejected: '<span class="chip bad">ไม่อนุมัติ</span>'}[o.status]}</div>
      <div class="sm mut" style="margin:4px 0">${o.package_name ? esc(o.package_name) + ' · ' : ''}${o.slots.length} คอร์ท-ชม.${first ? ` · เริ่ม ${thD(first.play_date)} ${hh(first.hour)}` : ''}</div>
      <div class="row between"><span class="sm">รหัส <b>${o.code}</b> · ${baht(o.amount)}</span>
      <button class="btn sm" onclick="${o.status === 'confirmed' ? `showOrder('${o.id}')` : `openPay({id:'${o.id}'})`}">${{confirmed: 'ดูใบยืนยัน', hold: 'ชำระเงิน', review: 'ดูสถานะ', rejected: 'ดูเหตุผล'}[o.status]}</button></div></div>`;
  }).join('');
}
async function showOrder(id) { try { const o = await rpc('get_order', {p_order: id}); modal(confirmedHtml(o) + `<button class="btn ghost" style="margin-top:12px" onclick="closeModal()">ปิด</button>`); } catch (e) { toast(errMsg(e)); } }

// ---------- customer: refer a venue ----------
async function vRefer() {
  const [r, code] = await Promise.all([rpc('my_referrals'), rpc('get_ref_code').catch(() => null)]);
  const link = code ? appLink('ref=' + code) : null;
  const st = {pending: ['รอตรวจสอบ', 'warn'], approved: ['เข้าร่วมแล้ว', ''], new: ['ทีมงานกำลังติดต่อ', 'gray'], closed: ['สนามยังไม่สนใจ', 'gray']};
  const vs = r.venues.map(v => `<div class="card" style="padding:10px 12px"><div class="row between"><b>${esc(v.name)}</b><span class="chip ${v.paid ? '' : st[v.status][1]}">${v.paid ? `ได้รับ ${baht(r.reward)} แล้ว` : st[v.status][0]}</span></div>
    ${v.paid ? '' : `<div style="background:#e9edeb;border-radius:99px;height:8px;margin:8px 0 4px;overflow:hidden"><div style="background:var(--g);height:100%;width:${Math.min(100, v.hours / (r.threshold + 1) * 100)}%"></div></div>
    <div class="sm mut">${v.hours > r.threshold ? '✅' : '⏳'} จองออนไลน์แล้ว ${v.hours} ชม. (ต้องเกิน ${r.threshold} ชม.)</div>
    <div class="sm mut">${v.fee_paid ? '✅ สนามชำระค่าบริการให้ตีแบตแล้ว' : '⏳ รอสนามชำระค่าบริการรอบแรกให้ตีแบต'}</div>`}</div>`).join('');
  const ls = r.leads.map(l => `<div class="card row between" style="padding:10px 12px"><span>${esc(l.name)}</span><span class="chip ${st[l.status][1]}">${st[l.status][0]}</span></div>`).join('');
  return `<h2>ชวนสนามที่คุณเล่นประจำ</h2>
    <div class="card" style="background:var(--gl)"><b>🎁 รับเครดิตจองสนาม ${baht(r.reward)} ต่อสนามที่คุณชวนเข้ามา</b>
      <div class="sm" style="margin-top:4px">ได้รับเมื่อสนามนั้น (1) มีการจองออนไลน์จากลูกค้าคนอื่นเกิน ${r.threshold} ชั่วโมง และ (2) ชำระค่าบริการรายเดือนให้ตีแบตแล้ว ใช้เครดิตจองได้ทุกสนามในตีแบต</div>
      <div class="kv t" style="font-size:15px"><span>เครดิตของฉัน</span><span>${baht(r.credit)}</span></div></div>
    <div class="card"><b>วิธีที่ 1 — บอกเรา แล้วทีมตีแบตโทรชวนให้</b>
      <label>ชื่อสนาม</label><input id="lName">
      <label>เบอร์โทรสนาม</label><input id="lPhone" inputmode="tel">
      <label>ลิงก์ Google Maps หรือเพจ (ถ้ามี)</label><input id="lLink" inputmode="url" placeholder="https://">
      <label>ฝากบอกทีมงาน (เช่น ชื่อเจ้าของ เวลาที่สะดวกรับสาย)</label><input id="lNote">
      <button class="btn" id="lGo" style="margin-top:12px" onclick="sendLead()">ส่งให้ทีมตีแบต</button></div>
    ${link ? `<div class="card"><b>วิธีที่ 2 — ส่งลิงก์ให้เจ้าของสนามลงทะเบียนเอง</b><div class="sm" style="word-break:break-all;margin:8px 0">${esc(link)}</div>
      <button class="btn ghost" onclick="copyText('${esc(link)}')">คัดลอกลิงก์ของฉัน</button></div>` : ''}
    ${vs || ls ? `<h3>สนามที่ฉันชวน</h3>${vs}${ls}` : ''}`;
}
async function sendLead() {
  if ($('lName').value.trim().length < 2) { toast('กรอกชื่อสนาม'); return; }
  $('lGo').disabled = true;
  try { await rpc('submit_venue_lead', {p_name: $('lName').value, p_phone: $('lPhone').value, p_link: $('lLink').value, p_note: $('lNote').value}); toast('ส่งแล้ว ขอบคุณที่ช่วยชวน'); render(); }
  catch (e) { toast(errMsg(e)); $('lGo').disabled = false; }
}

// ---------- owner ----------
async function loadMyVenues() {
  const { data, error } = await sb.from('venues').select('*, promos(*), packages(*)').eq('owner_id', S.user.id).neq('status', 'invited').order('created_at');
  if (error) throw error;
  S.myVenues = data;
  if (!data.find(v => v.id === S.ownerVenueId)) S.ownerVenueId = data[0]?.id || null;
  return data.find(v => v.id === S.ownerVenueId) || null;
}
const noVenue = () => `<div class="empty">คุณยังไม่มีสนามในระบบ<br><br><button class="btn sm" onclick="go('register')">ลงทะเบียนสนาม</button></div>`;
const stChip = v => v.status === 'approved' ? '<span class="chip">ออนไลน์อยู่</span>' : v.status === 'pending' ? '<span class="chip warn">รออนุมัติ</span>' : '<span class="chip bad">ไม่ผ่านการอนุมัติ</span>';
function venuePicker() {
  return S.myVenues.length < 2 ? '' : `<select style="margin-bottom:12px" onchange="S.ownerVenueId=this.value;render()">${S.myVenues.map(v => `<option value="${v.id}" ${S.ownerVenueId === v.id ? 'selected' : ''}>${esc(v.name)}${v.status === 'pending' ? ' (รออนุมัติ)' : ''}</option>`).join('')}</select>`;
}
const fdActive = v => v.frontdesk_until && v.frontdesk_until >= today();
async function vOwnerToday() {
  const v = await loadMyVenues();
  if (!v) return noVenue();
  if (v.status !== 'approved') return venuePicker() + `<div class="card"><b>${esc(v.name)}</b> ${stChip(v)}<p style="margin-top:8px" class="sm">${v.status === 'pending' ? 'กำลังรอทีมตีแบตตรวจสอบ — ดูรหัสยืนยันและขั้นตอนที่แท็บ "สนามของฉัน" เมื่ออนุมัติแล้วสนามจะขึ้นบนแผนที่ให้ลูกค้าจองได้ทันที' : 'สนามนี้ไม่ผ่านการอนุมัติ กรุณาติดต่อทีมตีแบต'}</p></div>`;
  const [sch, fs, rv] = await Promise.all([rpc('owner_schedule', {p_venue: v.id, p_date: S.ownerDate}), rpc('owner_fee_summary', {p_venue: v.id}), rpc('owner_reviews', {p_venue: v.id})]);
  S._reviews = rv || [];
  const rvUrls = await Promise.all(S._reviews.map(o => o.slip_path ? sb.storage.from('slips').createSignedUrl(o.slip_path, 1800).then(x => x.data?.signedUrl || '') : ''));
  S._sch = sch;
  const by = Object.fromEntries(sch.map(s => [`${s.court_no}-${s.hour}`, s]));
  const online = sch.filter(s => s.kind !== 'walkin' && s.order_status === 'confirmed'), walk = sch.filter(s => s.kind === 'walkin');
  const td = today();
  const dates = Array.from({length: Math.max(v.advance_days, 7) + 1}, (_, i) => addDays(td, i));
  let rows = '';
  for (let h = v.open_hour; h < v.close_hour; h++) {
    let tds = '';
    for (let c = 1; c <= v.court_count; c++) {
      const b = by[`${c}-${h}`];
      if (!b) tds += `<td class="o-empty" onclick="walkIn(${c},${h})">+</td>`;
      else tds += `<td class="${b.order_status === 'hold' ? 'o-hold' : {online: 'o-online', walkin: 'o-walk', package: 'o-group'}[b.kind]}" onclick="bookingInfo(${b.slot_id})">${esc((b.customer_name || '').slice(0, 7))}</td>`;
    }
    rows += `<tr><th>${hh(h)}</th>${tds}</tr>`;
  }
  const due = Number(fs.fee_due);
  const reviewHtml = S._reviews.length ? `<div class="card" style="border:2px solid var(--bad)"><b style="color:var(--bad)">🧾 สลิปรอคุณตรวจ ${S._reviews.length} รายการ</b>
    <div class="sm mut" style="margin:2px 0 8px">ระบบตรวจอัตโนมัติยืนยันไม่ได้ ลูกค้าส่งสลิปให้คุณตรวจเอง — เช็กว่าเงินเข้าบัญชีสนามจริงตามยอด แล้วกดอนุมัติ</div>` +
    S._reviews.map((o, i) => `<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px">
      <div class="row between"><b>${esc(o.customer_name || '-')}</b><span class="sm mut">${esc(o.code)}</span></div>
      <div class="sm">${o.slots.map(x => `${thD(x.play_date)} ค${x.court_no} ${hh(x.hour)}`).slice(0, 4).join(', ')}${o.slots.length > 4 ? ` +${o.slots.length - 4}` : ''}${o.package_name ? ` · ${esc(o.package_name)}` : ''}</div>
      <div class="kv"><span>ยอดที่ต้องเข้าบัญชีสนาม</span><b>${baht(o.amount)}</b></div>
      <div class="sm mut">สาเหตุ: ${esc(o.review_reason || '-')} · โทร ${esc(o.phone || '-')}</div>
      ${rvUrls[i] ? `<a href="${esc(rvUrls[i])}" target="_blank" rel="noopener"><img src="${esc(rvUrls[i])}" class="slipprev" style="max-height:260px" alt="สลิป"></a>` : ''}
      <div class="grid2" style="margin-top:8px"><button class="btn red" onclick="rejectSlip('${o.id}')">ไม่อนุมัติ</button><button class="btn" onclick="approveSlip('${o.id}', ${Number(o.amount)})">เงินเข้าแล้ว อนุมัติ</button></div></div>`).join('') + `</div>` : '';
  return venuePicker() + reviewHtml + `
    <div class="grid3" style="margin-bottom:12px">
      <div class="stat"><div class="sm mut">จองออนไลน์</div><div class="v">${online.length}</div><div class="sm mut">คอร์ท-ชม.</div></div>
      <div class="stat"><div class="sm mut">หน้าร้าน</div><div class="v">${walk.length}</div><div class="sm mut">คอร์ท-ชม.</div></div>
      <div class="stat"><div class="sm mut">รับออนไลน์วันนี้</div><div class="v" style="font-size:17px">${baht(online.reduce((a, s) => a + Number(s.price), 0))}</div><div class="sm mut">เข้าบัญชีสนาม</div></div>
    </div>
    ${due < 0 ? `<div class="note" style="margin-bottom:10px">ลูกค้าใช้เครดิตตีแบตจองสนามคุณ ตีแบตค้างจ่ายสนาม <b>${baht(-due)}</b> — ระบบจะหักกลบกับค่าบริการรอบถัดไป หรือทีมตีแบตจะโอนให้</div>` : ''}
    ${due > 0 ? `<div class="note" style="margin-bottom:10px">ค่าบริการจองออนไลน์ค้างชำระ <b>${baht(due)}</b> (${fs.orders_due} รายการ — ลูกค้าจ่ายรวมมากับค่าสนามแล้ว)<button class="btn sm" style="margin-top:6px;display:block" onclick="payPlatform('create_fee_order')">ชำระให้ตีแบต</button></div>` : ''}
    ${v.online_enabled ? '' : '<div class="note" style="margin-bottom:10px">การจองออนไลน์ของสนามนี้ถูกปิดชั่วคราว กรุณาติดต่อทีมตีแบต</div>'}
    ${fdActive(v) ? `<div class="chip" style="margin-bottom:8px">ระบบหน้าร้าน: ใช้ได้ถึง ${thD(v.frontdesk_until)}</div>` : `<div class="note" style="margin-bottom:10px">ดูการจองออนไลน์ได้ฟรี · ถ้าต้องการลงจองหน้าร้าน/ทางโทรศัพท์แทนสมุดจด เปิด "ระบบหน้าร้าน" ${esc(S.settings.frontdesk_monthly_fee)} บาท/เดือน <button class="btn sm" style="margin-top:6px;display:block" onclick="payPlatform('create_subscription_order')">เปิดใช้ระบบหน้าร้าน</button></div>`}
    <div class="dates">${dates.map(d => `<button class="${S.ownerDate === d ? 'on' : ''}" onclick="S.ownerDate='${d}';render()">${d === td ? 'วันนี้' : thD(d).split(' ')[0]}<br><b>${parseD(d).getDate()}</b></button>`).join('')}</div>
    <div class="legend" style="margin-bottom:6px"><span><i style="background:var(--g)"></i>ออนไลน์</span><span><i style="background:var(--pur)"></i>แพ็กเกจก๊วน</span><span><i style="background:#5b6762"></i>หน้าร้าน</span><span><i style="background:var(--warn)"></i>รอชำระ/รอตรวจสลิป</span></div>
    <div class="slots"><table><tr><th></th>${Array.from({length: v.court_count}, (_, i) => `<th>คอร์ท ${i + 1}</th>`).join('')}</tr>${rows}</table></div>
    <p class="sm mut" style="margin-top:8px">แตะช่องว่าง (+) เพื่อลงจองหน้าร้าน · แตะช่องที่จองแล้วเพื่อดูรายละเอียด/เช็กรหัสจอง</p>`;
}
function approveSlip(id, amt) {
  modal(`<h2>ยืนยันว่าเงินเข้าแล้ว</h2><p class="sm">เปิดแอปธนาคารของสนาม แล้วเช็กว่ามีเงินเข้า <b>${baht(amt)}</b> ตามสลิปจริง ก่อนกดยืนยัน — กดแล้วการจองจะยืนยันทันที</p>
    <button class="btn" style="margin-top:12px" onclick="decide('${id}', true, '')">เงินเข้าบัญชีแล้ว ยืนยันการจอง</button><button class="btn ghost" style="margin-top:6px" onclick="closeModal()">ยกเลิก</button>`);
}
function rejectSlip(id) {
  modal(`<h2>ไม่อนุมัติสลิป</h2><p class="sm mut">คอร์ทจะถูกปล่อยคืน และลูกค้าจะเห็นเหตุผลนี้ หากลูกค้าโอนมาจริงแต่ยอดไม่ครบ สนามต้องคืนเงินลูกค้าเอง</p>
    <label>เหตุผล</label><select id="rjPick" onchange="document.getElementById('rjText').value=this.value"><option value="">เลือก…</option><option>ไม่พบเงินเข้าบัญชีสนาม</option><option>ยอดเงินไม่ครบ</option><option>สลิปไม่ชัดหรือไม่ใช่สลิปของรายการนี้</option></select>
    <textarea id="rjText" rows="2" style="margin-top:6px" placeholder="หรือพิมพ์เหตุผลเอง"></textarea>
    <button class="btn red" style="margin-top:12px" onclick="decide('${id}', false, document.getElementById('rjText').value)">ยืนยันไม่อนุมัติ</button>`);
}
async function decide(id, ok, note) { try { await rpc('owner_decide', {p_order: id, p_ok: ok, p_note: note}); closeModal(); toast(ok ? 'ยืนยันการจองแล้ว' : 'ไม่อนุมัติแล้ว คอร์ทถูกปล่อยคืน'); render(); } catch (e) { toast(errMsg(e)); } }
async function payPlatform(fn) { try { openPay(await rpc(fn, {p_venue: S.ownerVenueId})); } catch (e) { toast(errMsg(e)); } }
function walkIn(c, h) {
  const v = S.myVenues.find(x => x.id === S.ownerVenueId);
  if (!fdActive(v)) { toast('ต้องเปิดใช้ระบบหน้าร้านก่อน'); return; }
  const by = new Set((S._sch || []).map(s => `${s.court_no}-${s.hour}`));
  let maxH = 0; for (let x = h; x < v.close_hour && !by.has(`${c}-${x}`); x++) maxH++;
  modal(`<h2>ลงจองหน้าร้าน</h2><div class="sm mut">คอร์ท ${c} · ${thD(S.ownerDate)} เริ่ม ${hh(h)}</div>
    <label>ชื่อลูกค้า / ก๊วน</label><input id="wName" placeholder="เช่น พี่เอก (โทรมา)">
    <label>เบอร์โทร</label><input id="wPhone" inputmode="tel" placeholder="ไม่บังคับ">
    <div class="grid2"><div><label>จำนวนชั่วโมง</label><select id="wHrs">${Array.from({length: maxH}, (_, i) => `<option>${i + 1}</option>`).join('')}</select></div>
    <div><label>ราคา/ชม. (แก้ได้)</label><input id="wPrice" type="number" value="${priceFor(v, S.ownerDate, h).price}"></div></div>
    <p class="sm mut" style="margin-top:8px">ไม่มีค่าบริการต่อรายการ — ลูกค้าจ่ายที่สนามตามปกติ</p>
    <button class="btn" style="margin-top:12px" onclick="saveWalkIn(${c},${h})">บันทึก</button>`);
}
async function saveWalkIn(c, h) {
  try {
    await rpc('create_walkin', {p_venue: S.ownerVenueId, p_date: S.ownerDate, p_court: c, p_hour: h, p_hours: +$('wHrs').value, p_name: $('wName').value, p_phone: $('wPhone').value, p_price: +$('wPrice').value});
    closeModal(); toast('บันทึกการจองหน้าร้านแล้ว'); render();
  } catch (e) { toast(errMsg(e)); }
}
function bookingInfo(slotId) {
  const b = S._sch.find(s => s.slot_id === slotId), all = S._sch.filter(s => s.order_id === b.order_id);
  const src = {online: 'จองออนไลน์ (ลูกค้าโอนเข้าบัญชีสนามแล้ว)', walkin: 'หน้าร้าน (เก็บเงินที่สนาม)', package: 'แพ็กเกจก๊วน (ลูกค้าโอนเข้าบัญชีสนามแล้ว)'}[b.kind];
  modal(`<h2>${esc(b.customer_name)}</h2><div class="sm mut">${b.order_status === 'hold' ? 'รอลูกค้าชำระเงิน — ยังไม่ยืนยัน' : b.order_status === 'review' ? 'ลูกค้าส่งสลิปให้คุณตรวจ — ดูด้านบนของหน้าตารางจอง' : src}</div>
    <div class="card" style="margin-top:10px;background:var(--bg)"><div class="kv"><span>รหัสจอง</span><b>${esc(b.code)}</b></div>
    ${b.package_name ? `<div class="kv"><span>แพ็กเกจ</span><span>${esc(b.package_name)}</span></div>` : ''}
    <div class="kv"><span>เบอร์</span><span>${esc(b.phone || '-')}</span></div>
    <div class="kv"><span>วันนี้</span><span>${all.map(x => `ค${x.court_no} ${hh(x.hour)}`).join(', ')}</span></div>
    <div class="kv"><span>ค่าสนาม</span><span>${baht(all.reduce((a, x) => a + Number(x.price), 0))}</span></div></div>
    ${b.kind === 'walkin' ? `<button class="btn red" onclick="cancelWalkin('${b.order_id}')">ยกเลิกการจองนี้</button>` : ''}
    <button class="btn ghost" style="margin-top:6px" onclick="closeModal()">ปิด</button>`);
}
async function cancelWalkin(id) { try { await rpc('cancel_walkin', {p_order: id}); closeModal(); render(); } catch (e) { toast(errMsg(e)); } }

const hOpts = (sel, from, to) => Array.from({length: to - from + 1}, (_, i) => from + i).map(h => `<option value="${h}" ${h === sel ? 'selected' : ''}>${hh(h)}</option>`).join('');
async function vPricing() {
  const v = await loadMyVenues();
  if (!v) return noVenue();
  const promos = v.promos.map(p => `<div class="card" style="padding:12px"><div class="row between"><b>${esc(p.name)}</b>
    <label style="margin:0;display:flex;gap:4px;align-items:center;color:var(--ink)"><input type="checkbox" style="width:auto" ${p.active ? 'checked' : ''} onchange="tbl('promos','${p.id}',{active:this.checked})">เปิด</label></div>
    <div class="sm">${promoText(p, v)} · ${p.days.map(d => DOW[d]).join(' ')} · ${hh(p.from_hour)}–${hh(p.to_hour)}</div>
    <button class="btn ghost sm" style="margin-top:6px" onclick="tbl('promos','${p.id}',null)">ลบ</button></div>`).join('') || '<div class="sm mut" style="margin-bottom:8px">ยังไม่มีโปรโมชั่น</div>';
  const pkgs = v.packages.map(p => `<div class="pk"><div class="row between"><b>${esc(p.name)}</b><button class="btn ghost sm" onclick="tbl('packages','${p.id}',null)">ลบ</button></div>
    <div class="sm">${p.court_count} คอร์ท · ทุกวัน${DOW[p.dow]} ${hh(p.from_hour)}–${hh(p.to_hour)} · ${p.weeks} สัปดาห์ · ราคาเหมา ${baht(p.price)}</div></div>`).join('') || '<div class="sm mut" style="margin-bottom:8px">ยังไม่มีแพ็กเกจ</div>';
  return venuePicker() + `
    <div class="card"><h3 style="margin-top:0">ราคาพื้นฐาน — ${esc(v.name)}</h3>
      <div class="grid2"><div><label>ราคา/คอร์ท/ชม.</label><input type="number" value="${v.price_per_hour}" onchange="saveVenue({price_per_hour:+this.value})"></div>
      <div><label>จองล่วงหน้าได้ (วัน)</label><input type="number" min="0" max="90" value="${v.advance_days}" onchange="saveVenue({advance_days:+this.value})"></div></div>
      <p class="sm mut" style="margin-top:8px">ลูกค้าจ่ายค่าสนาม + ค่าบริการจอง ${fee()} บาท/ชม. เข้าบัญชีสนามโดยตรง แล้วตีแบตเรียกเก็บค่าบริการส่วนนี้จากสนามภายหลัง</p></div>
    <h3>โปรโมชั่น / ปรับราคาตามช่วงเวลา</h3>${promos}
    <div class="card"><b>+ เพิ่มโปรโมชั่น</b>
      <label>ชื่อโปร</label><input id="prName" placeholder="เช่น ลดช่วงบ่ายวันธรรมดา">
      <div class="grid2"><div><label>รูปแบบ</label><select id="prMode"><option value="down">ลดราคา %</option><option value="up">เพิ่มราคา %</option><option value="fixed">ราคาพิเศษ (บาท)</option></select></div>
      <div><label>ค่า</label><input id="prVal" type="number" value="10"></div></div>
      <label>วัน</label><div class="dowp">${DOW.map((d, i) => `<label><input type="checkbox" class="prDay" value="${i}" ${i > 0 && i < 6 ? 'checked' : ''}>${d}</label>`).join('')}</div>
      <div class="grid2"><div><label>ตั้งแต่</label><select id="prFrom">${hOpts(Math.min(13, v.close_hour - 1), v.open_hour, v.close_hour - 1)}</select></div><div><label>ถึง</label><select id="prTo">${hOpts(Math.min(16, v.close_hour), v.open_hour + 1, v.close_hour)}</select></div></div>
      <button class="btn" style="margin-top:12px" onclick="addPromo()">เพิ่มโปรโมชั่น</button></div>
    <h3>แพ็กเกจก๊วน (เช่ายาว หลายคอร์ทพร้อมกัน)</h3>${pkgs}
    <div class="card"><b>+ สร้างแพ็กเกจก๊วน</b>
      <label>ชื่อแพ็กเกจ</label><input id="pkName" placeholder="เช่น ก๊วนพุธเย็น 2 คอร์ท">
      <div class="grid3"><div><label>จำนวนคอร์ท</label><input id="pkCourts" type="number" min="1" max="${v.court_count}" value="${Math.min(2, v.court_count)}"></div>
      <div><label>วัน</label><select id="pkDow">${DOW.map((d, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div><label>กี่สัปดาห์</label><input id="pkWeeks" type="number" min="1" max="52" value="4"></div></div>
      <div class="grid3"><div><label>ตั้งแต่</label><select id="pkFrom">${hOpts(Math.min(19, v.close_hour - 1), v.open_hour, v.close_hour - 1)}</select></div><div><label>ถึง</label><select id="pkTo">${hOpts(Math.min(21, v.close_hour), v.open_hour + 1, v.close_hour)}</select></div>
      <div><label>ราคาเหมา</label><input id="pkPrice" type="number" placeholder="บาท"></div></div>
      <p class="sm mut" style="margin-top:6px">ลูกค้าจ่ายราคาเหมา + ค่าบริการจอง ${fee()} บาท × คอร์ท-ชม. ระบบล็อกคอร์ทให้ทุกสัปดาห์อัตโนมัติ</p>
      <button class="btn" style="margin-top:10px;background:var(--pur)" onclick="addPkg()">สร้างแพ็กเกจ</button></div>`;
}
async function tbl(table, id, patch) {
  const q = patch ? sb.from(table).update(patch).eq('id', id) : sb.from(table).delete().eq('id', id);
  const { error } = await q; if (error) toast(errMsg(error)); else if (!patch) render();
}
async function saveVenue(p) { try { await rpc('update_venue', {p_venue: S.ownerVenueId, p}); toast('บันทึกแล้ว'); } catch (e) { toast(errMsg(e)); } }
async function addPromo() {
  const mode = $('prMode').value, val = Math.abs(+$('prVal').value), days = [...document.querySelectorAll('.prDay:checked')].map(x => +x.value);
  const from_hour = +$('prFrom').value, to_hour = +$('prTo').value;
  if (!days.length || to_hour <= from_hour || !val) { toast('ตรวจสอบวัน/เวลา/ค่าอีกครั้ง'); return; }
  const { error } = await sb.from('promos').insert({venue_id: S.ownerVenueId, name: $('prName').value || 'โปรโมชั่น', mode: mode === 'fixed' ? 'fixed' : 'pct', value: mode === 'down' ? -val : val, days, from_hour, to_hour});
  if (error) toast(errMsg(error)); else { toast('เพิ่มโปรโมชั่นแล้ว'); render(); }
}
async function addPkg() {
  const p = {venue_id: S.ownerVenueId, name: $('pkName').value || 'แพ็กเกจก๊วน', court_count: +$('pkCourts').value, dow: +$('pkDow').value, from_hour: +$('pkFrom').value, to_hour: +$('pkTo').value, weeks: +$('pkWeeks').value, price: +$('pkPrice').value};
  if (p.to_hour <= p.from_hour || p.court_count < 1 || !p.price || p.weeks < 1) { toast('ตรวจสอบข้อมูลแพ็กเกจอีกครั้ง'); return; }
  const { error } = await sb.from('packages').insert(p);
  if (error) toast(errMsg(error)); else { toast('สร้างแพ็กเกจแล้ว'); render(); }
}
async function vOwnerVenue() {
  const v = await loadMyVenues();
  if (!v) return noVenue();
  const { data: vp } = await sb.from('venue_private').select('*').eq('venue_id', v.id).maybeSingle();
  return venuePicker() + `<img class="hero" src="${esc(photoOf(v))}">
    <div class="row between"><h2 style="margin:0">${esc(v.name)}</h2>${stChip(v)}</div>
    <div class="sm mut" style="margin:4px 0 12px">${esc(v.address)}</div>
    ${v.status === 'pending' ? `<div class="card" style="border:2px solid var(--warn)"><b>ขั้นตอนยืนยันสนาม</b>
      <div class="sm mut" style="margin:4px 0">รหัสยืนยันของสนามนี้</div><div class="code">${esc(vp?.verify_code || '-')}</div>
      <ol class="sm" style="margin:8px 0 0 18px"><li>ทีมตีแบตจะโทรไปที่<b>เบอร์สาธารณะของสนาม</b> (จาก Google Maps/เพจ) แล้วขอให้อ่านรหัสนี้ — แจ้งพนักงานหน้าร้านไว้</li><li>ทีมตีแบตจะโอนทดสอบ 1 บาทเข้าพร้อมเพย์ของสนามเพื่อตรวจชื่อบัญชี</li><li>ห้ามบอกรหัสนี้กับคนอื่นที่ไม่ได้โทรมาที่เบอร์ของสนาม</li></ol></div>` : ''}
    <div class="card"><div class="grid3"><div><label>จำนวนคอร์ท</label><input type="number" min="1" value="${v.court_count}" onchange="saveVenue({court_count:+this.value})"></div>
      <div><label>เปิด</label><select onchange="saveVenue({open_hour:+this.value})">${hOpts(v.open_hour, 0, 23)}</select></div>
      <div><label>ปิด</label><select onchange="saveVenue({close_hour:+this.value})">${hOpts(v.close_hour, 1, 24)}</select></div></div>
      <label>เบอร์ติดต่อสนาม</label><input value="${esc(v.phone || '')}" onchange="saveVenue({phone:this.value})">
      <label>เปลี่ยนรูปสนาม</label><input type="file" accept="image/*" onchange="changePhoto(this.files[0])"></div>
    ${v.status === 'approved' ? `<div class="card" style="text-align:center"><b>ลิงก์จองของสนามคุณ</b><div class="sm mut">พิมพ์ QR นี้ติดหน้าเคาน์เตอร์ หรือส่งลิงก์ในกลุ่ม LINE ของก๊วน ลูกค้าเปิดแล้วเข้าหน้าจองของสนามคุณทันที</div>
      <div style="max-width:190px;margin:10px auto">${qrSvg(appLink('v=' + v.id))}</div>
      <div class="sm" style="word-break:break-all;margin-bottom:8px">${esc(appLink('v=' + v.id))}</div>
      <button class="btn sm" onclick="copyText(appLink('v=${v.id}'))">คัดลอกลิงก์</button></div>` : ''}
    <div class="card"><b>บัญชีรับเงินของสนาม</b><div class="sm mut" style="margin-top:2px">${v.status === 'pending' ? 'ลูกค้าสแกนโอนเข้าบัญชีนี้โดยตรง และระบบใช้ตรวจสลิป' : '🔒 ล็อกหลังอนุมัติเพื่อความปลอดภัย — ต้องการเปลี่ยนบัญชีให้ติดต่อทีมตีแบต'}</div>
      <label>พร้อมเพย์ (เบอร์มือถือ หรือเลขประจำตัวผู้เสียภาษี)</label><input inputmode="numeric" value="${esc(vp?.promptpay_id || '')}" onchange="saveVenue({promptpay_id:this.value})" ${v.status === 'pending' ? '' : 'disabled'}>
      <label>ชื่อบัญชี (ตามที่แสดงในแอปธนาคาร)</label><input value="${esc(vp?.account_name || '')}" onchange="saveVenue({account_name:this.value})" ${v.status === 'pending' ? '' : 'disabled'}>
      <label>เลขบัญชีธนาคารที่ผูกพร้อมเพย์ (ช่วยให้ตรวจสลิปแม่นขึ้น)</label><input inputmode="numeric" value="${esc(vp?.bank_account_no || '')}" onchange="saveVenue({bank_account_no:this.value})" ${v.status === 'pending' ? '' : 'disabled'}></div>
    <div class="card"><div class="row between"><div><b>ระบบหน้าร้าน</b><div class="sm mut">${esc(S.settings.frontdesk_monthly_fee)} บาท/เดือน · ลงจอง walk-in/โทรเข้า</div></div>
      ${fdActive(v) ? `<span class="chip">ถึง ${thD(v.frontdesk_until)}</span>` : ''}</div>
      ${v.status === 'approved' ? `<button class="btn sm" style="margin-top:8px" onclick="payPlatform('create_subscription_order')">${fdActive(v) ? 'ต่ออายุ 1 เดือน' : 'เปิดใช้'}</button>` : ''}</div>`;
}
async function uploadPhoto(file) {
  const path = `${S.user.id}/${Date.now()}.${(file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
  const { error } = await sb.storage.from('venue-photos').upload(path, file, {contentType: file.type});
  if (error) throw error;
  return sb.storage.from('venue-photos').getPublicUrl(path).data.publicUrl;
}
async function uploadDoc(file) {
  const path = `${S.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${(file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
  const { error } = await sb.storage.from('venue-docs').upload(path, file, {contentType: file.type});
  if (error) throw error;
  return path;
}
async function changePhoto(file) { if (!file) return; try { toast('กำลังอัปโหลด…'); await saveVenue({photo_url: await uploadPhoto(file)}); render(); } catch (e) { toast('อัปโหลดไม่สำเร็จ: ' + errMsg(e)); } }
function vRegister() {
  return `<h2>ลงทะเบียนสนามใหม่</h2><p class="sm mut" style="margin-bottom:12px">ส่งข้อมูล → ทีมตีแบตตรวจสอบ → อนุมัติแล้วสนามขึ้นแผนที่ให้ลูกค้าจองได้</p>
    <div class="card"><label style="margin-top:0">รูปสนาม</label><input id="rPhoto" type="file" accept="image/*">
      <label>ชื่อสนาม</label><input id="rName" placeholder="เช่น สนามแบดหนองมน">
      <div class="grid2"><div><label>จำนวนคอร์ท</label><input id="rCourts" type="number" value="4" min="1"></div><div><label>ราคา/ชม.</label><input id="rPrice" type="number" value="150"></div></div>
      <div class="grid3"><div><label>เปิด</label><select id="rOpen">${hOpts(9, 0, 23)}</select></div><div><label>ปิด</label><select id="rClose">${hOpts(22, 1, 24)}</select></div><div><label>จองล่วงหน้า (วัน)</label><input id="rAdv" type="number" value="7" min="0" max="90"></div></div>
      <label>ที่อยู่</label><textarea id="rAddr" rows="2" placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด"></textarea>
      <label>ลิงก์ Google Maps หรือเพจ Facebook ของสนาม (ใช้ตรวจสอบเบอร์โทรสาธารณะ)</label><input id="rLink" inputmode="url" placeholder="https://">
      <label>เบอร์โทรสนาม</label><input id="rPhone" inputmode="tel">
      <label>ปักหมุดตำแหน่งสนาม (แตะบนแผนที่)</label>
      <div id="pick" class="leaf" style="height:260px"></div>
      <div class="row between" style="margin-top:6px"><span class="sm mut" id="regLL">ยังไม่ได้ปักหมุด</span><button class="btn ghost sm" onclick="pickHere()">ใช้ตำแหน่งปัจจุบัน</button></div>
      <h3>บัญชีรับเงินของสนาม</h3>
      <label style="margin-top:0">พร้อมเพย์ (เบอร์มือถือ หรือเลขประจำตัวผู้เสียภาษี)</label><input id="rPP" inputmode="numeric">
      <label>ชื่อบัญชี (ตามที่แสดงในแอปธนาคาร)</label><input id="rAcc">
      <label>เลขบัญชีธนาคารที่ผูกพร้อมเพย์ (ไม่บังคับ)</label><input id="rBank" inputmode="numeric">
      <h3>หลักฐานยืนยันความเป็นเจ้าของ (เห็นเฉพาะทีมตีแบต)</h3>
      <label style="margin-top:0">1. รูปหน้าสมุดบัญชี หรือหน้าจอพร้อมเพย์ที่เห็นชื่อบัญชี</label><input id="dAcc" type="file" accept="image/*">
      <label>2. รูปหน้าสนามที่เห็นป้ายชื่อ</label><input id="dFront" type="file" accept="image/*">
      <label>3. รูปภายในสนามที่เห็นคอร์ท</label><input id="dIn" type="file" accept="image/*">
      <p class="sm mut" style="margin-top:8px">หลังส่ง คุณจะได้รหัสยืนยัน 6 หลัก ทีมตีแบตจะโทรไปที่เบอร์สาธารณะของสนามเพื่อขอรหัสนี้ และโอนทดสอบ 1 บาทเพื่อตรวจชื่อบัญชี</p>
      <button class="btn" id="rGo" style="margin-top:14px" onclick="submitReg()">ส่งลงทะเบียน</button></div>`;
}
let pickMarker = null;
function setPick(lat, lng) {
  S.regPick = {lat, lng};
  if (pickMarker) pickMarker.setLatLng([lat, lng]); else pickMarker = L.marker([lat, lng], {icon: L.divIcon({className: '', html: '<span class="pinx" style="background:#e5484d">📍 สนาม</span>', iconSize: [0, 0]})}).addTo(leaf);
  $('regLL').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
function drawPickMap() {
  const c = S.regPick || S.me || S.meFallback;
  pickMarker = null;
  leaf = L.map('pick').setView([c.lat, c.lng], 14); osm(leaf);
  leaf.on('click', e => setPick(e.latlng.lat, e.latlng.lng));
  if (S.regPick) setPick(S.regPick.lat, S.regPick.lng);
}
function pickHere() { if (!S.me) { locate(); toast('ยังไม่ได้ตำแหน่ง — อนุญาตการเข้าถึงตำแหน่งแล้วลองอีกครั้ง'); return; } setPick(S.me.lat, S.me.lng); leaf.setView([S.me.lat, S.me.lng], 16); }
async function submitReg() {
  const name = $('rName').value.trim(), address = $('rAddr').value.trim();
  if (!name || !address || !S.regPick) { toast('กรอกชื่อ ที่อยู่ และปักหมุดตำแหน่ง'); return; }
  if (!$('rPP').value.trim() || !$('rAcc').value.trim()) { toast('กรอกพร้อมเพย์และชื่อบัญชีรับเงิน'); return; }
  if (+$('rClose').value <= +$('rOpen').value) { toast('เวลาปิดต้องหลังเวลาเปิด'); return; }
  const docs = ['dAcc', 'dFront', 'dIn'].map(i => $(i).files[0]);
  if (docs.some(d => !d)) { toast('กรุณาแนบรูปหลักฐานให้ครบ 3 รูป'); return; }
  if (!/^https:\/\//i.test($('rLink').value.trim())) { toast('กรุณาใส่ลิงก์ Google Maps หรือเพจของสนาม'); return; }
  $('rGo').disabled = true;
  try {
    toast('กำลังอัปโหลดหลักฐาน…');
    const [doc_account, doc_front, doc_inside] = await Promise.all(docs.map(uploadDoc));
    const f = $('rPhoto').files[0];
    const photo_url = f ? await uploadPhoto(f) : null;
    S.ownerVenueId = await rpc('register_venue', {p: {name, address, lat: S.regPick.lat, lng: S.regPick.lng, court_count: +$('rCourts').value, open_hour: +$('rOpen').value, close_hour: +$('rClose').value,
      price_per_hour: +$('rPrice').value, advance_days: +$('rAdv').value, phone: $('rPhone').value, photo_url, promptpay_id: $('rPP').value, account_name: $('rAcc').value, bank_account_no: $('rBank').value, doc_account, doc_front, doc_inside, public_link: $('rLink').value.trim()}});
    if (S.refCode) { await rpc('set_referrer', {p_venue: S.ownerVenueId, p_code: S.refCode}).catch(() => {}); S.refCode = null; }
    S.regPick = null;
    modal(`<div style="text-align:center"><div style="font-size:40px">📨</div><h2>ส่งลงทะเบียนแล้ว</h2><p class="sm mut">สถานะ: รอตรวจสอบ — เปิดแท็บ "สนามของฉัน" เพื่อดูรหัสยืนยันและขั้นตอนถัดไป</p><button class="btn" style="margin-top:12px" onclick="closeModal();go('venue')">ดูสนามของฉัน</button></div>`);
  } catch (e) { toast(errMsg(e)); $('rGo').disabled = false; }
}

// ---------- invite: owner claims a venue the team prepared ----------
async function vClaim() {
  const pv = await rpc('invite_preview', {p_code: S.inviteCode});
  if (!pv) return `<div class="card"><b>ลิงก์คำเชิญนี้ใช้ไม่ได้</b><p class="sm mut" style="margin-top:6px">อาจถูกใช้ไปแล้วหรือถูกยกเลิก กรุณาติดต่อทีมตีแบต</p><button class="btn ghost" style="margin-top:10px" onclick="go('today')">ไปหน้าสนามของฉัน</button></div>`;
  return `<h2>ยืนยันเป็นเจ้าของสนาม</h2>
    <div class="card"><b>${esc(pv.name)}</b><div class="sm mut">${esc(pv.address)}</div>
      <div class="sm" style="margin-top:6px">${pv.court_count} คอร์ท · ${baht(pv.price_per_hour)}/ชม. · ${hh(pv.open_hour)}–${hh(pv.close_hour)}</div>
      <div class="sm mut" style="margin-top:4px">ทีมตีแบตกรอกข้อมูลนี้ไว้ให้แล้ว แก้ไขได้ภายหลัง</div>
      ${pv.free_days > 0 ? `<div class="chip" style="margin-top:8px">ฟรีระบบจองหน้าร้าน ${pv.free_days} วันแรก</div>` : ''}</div>
    <div class="card"><b>เหลืออีก 2 อย่าง ใช้เวลาราว 2 นาที</b>
      <h3>1. บัญชีรับเงินของสนาม</h3>
      <label style="margin-top:0">พร้อมเพย์ (เบอร์มือถือ หรือเลขประจำตัวผู้เสียภาษี)</label><input id="cPP" inputmode="numeric">
      <label>ชื่อบัญชี (ตามที่แสดงในแอปธนาคาร)</label><input id="cAcc">
      <label>เลขบัญชีธนาคารที่ผูกพร้อมเพย์ (ไม่บังคับ)</label><input id="cBank" inputmode="numeric">
      <h3>2. รูปยืนยัน 3 รูป (เห็นเฉพาะทีมตีแบต)</h3>
      <label style="margin-top:0">หน้าสมุดบัญชี หรือหน้าจอพร้อมเพย์ที่เห็นชื่อบัญชี</label><input id="dAcc" type="file" accept="image/*">
      <label>หน้าสนามที่เห็นป้ายชื่อ</label><input id="dFront" type="file" accept="image/*">
      <label>ภายในสนามที่เห็นคอร์ท</label><input id="dIn" type="file" accept="image/*">
      <button class="btn" id="cGo2" style="margin-top:14px" onclick="submitClaim()">ยืนยันและส่งให้ตรวจสอบ</button></div>`;
}
async function submitClaim() {
  const docs = ['dAcc', 'dFront', 'dIn'].map(i => $(i).files[0]);
  if (!$('cPP').value.trim() || !$('cAcc').value.trim()) { toast('กรอกพร้อมเพย์และชื่อบัญชีรับเงิน'); return; }
  if (docs.some(d => !d)) { toast('กรุณาแนบรูปให้ครบ 3 รูป'); return; }
  $('cGo2').disabled = true;
  try {
    toast('กำลังอัปโหลด…');
    const [doc_account, doc_front, doc_inside] = await Promise.all(docs.map(uploadDoc));
    S.ownerVenueId = await rpc('claim_invite', {p_code: S.inviteCode, p: {promptpay_id: $('cPP').value, account_name: $('cAcc').value, bank_account_no: $('cBank').value, doc_account, doc_front, doc_inside}});
    S.inviteCode = null;
    try { history.replaceState(null, '', location.pathname); } catch (_) {}
    go('venue');
  } catch (e) { toast(errMsg(e)); $('cGo2').disabled = false; }
}

// ---------- admin: invite a venue during a phone call ----------
function inviteMsg(name, link) { return `สวัสดีครับ ทีมตีแบต (แอปจองสนามแบด) ครับ\nลิงก์เปิดระบบจองออนไลน์ของ ${name}:\n${link}\n\nเปิดในแอป LINE แล้วใส่พร้อมเพย์รับเงิน + รูป 3 รูป ใช้เวลาราว 2 นาทีครับ`; }
async function vInvite() {
  const { data, error } = await sb.from('venues').select('id,name,invite_code,created_at').eq('status', 'invited').order('created_at', {ascending: false});
  if (error) throw error;
  const { data: leads } = await sb.from('venue_leads').select('*').eq('status', 'new').order('created_at');
  S._leads = leads || [];
  const lead = S._leads.find(l => l.id === S.leadId);
  if (S.lastInvite) {
    const L = appLink('invite=' + S.lastInvite.code), M = inviteMsg(S.lastInvite.name, L);
    return `<h2>ส่งลิงก์นี้ให้เจ้าของสนาม</h2><div class="card" style="text-align:center"><b>${esc(S.lastInvite.name)}</b>
      <div style="max-width:170px;margin:10px auto">${qrSvg(L)}</div><div class="sm" style="word-break:break-all">${esc(L)}</div>
      <div class="grid2" style="margin-top:10px"><button class="btn ghost" onclick="copyText(appLink('invite=${S.lastInvite.code}'))">คัดลอกลิงก์</button><button class="btn" onclick="copyText(inviteMsg(S.lastInvite.name, appLink('invite=${S.lastInvite.code}')))">คัดลอกข้อความพร้อมส่ง</button></div>
      <pre class="sm" style="text-align:left;white-space:pre-wrap;background:var(--bg);padding:10px;border-radius:10px;margin-top:10px">${esc(M)}</pre>
      <p class="sm mut">ระหว่างยังคุยสายอยู่: ให้เจ้าของเปิดลิงก์ทำจนได้รหัส 6 หลัก แล้วอ่านรหัสให้ฟัง — ถ้าคุณโทรไปที่เบอร์สาธารณะของสนาม ถือว่าผ่านข้อตรวจเบอร์โทรได้เลย</p>
      <button class="btn ghost" onclick="S.lastInvite=null;S.regPick=null;render()">ชวนสนามถัดไป</button></div>`;
  }
  return `<h2>ชวนสนามเข้าระบบ</h2><p class="sm mut" style="margin-bottom:12px">กรอกข้อมูลจาก Google Maps/เพจของสนามระหว่างคุยโทรศัพท์ แล้วส่งลิงก์ให้เจ้าของ เจ้าของเหลือแค่ใส่บัญชีรับเงินและรูป 3 รูป</p>
    ${S._leads.length ? `<h3 style="margin-top:0">สนามที่นักแบดแนะนำมา (${S._leads.length})</h3>` + S._leads.map(l => `<div class="card" style="padding:10px 12px;${l.id === S.leadId ? 'border:2px solid var(--g)' : ''}"><b>${esc(l.venue_name)}</b>
      <div class="sm mut">${esc(l.phone || '-')}${l.note ? ' · ' + esc(l.note) : ''}</div>${l.link ? `<div class="sm" style="word-break:break-all">${esc(l.link)}</div>` : ''}
      <div class="row" style="margin-top:6px"><button class="btn sm" onclick="S.leadId='${l.id}';render()">ใช้ข้อมูลนี้ชวน</button><button class="btn ghost sm" onclick="adm('admin_close_lead',{p_lead:'${l.id}'},'ปิดรายการแล้ว')">สนามไม่สนใจ</button></div></div>`).join('') : ''}
    <div class="card">${lead ? `<div class="chip" style="margin-bottom:6px">🎁 ให้เครดิตผู้แนะนำอัตโนมัติ</div>` : ''}<label style="margin-top:0">ชื่อสนาม</label><input id="rName" value="${esc(lead?.venue_name || '')}">
      <label>ลิงก์ Google Maps หรือเพจของสนาม</label><input id="rLink" inputmode="url" placeholder="https://" value="${esc(lead?.link || '')}">
      <label>เบอร์โทรสาธารณะของสนาม (เบอร์ที่กำลังโทร)</label><input id="rPhone" inputmode="tel" value="${esc(lead?.phone || '')}">
      <label>ที่อยู่</label><textarea id="rAddr" rows="2"></textarea>
      <div class="grid2"><div><label>จำนวนคอร์ท</label><input id="rCourts" type="number" value="4" min="1"></div><div><label>ราคา/ชม.</label><input id="rPrice" type="number" value="150"></div></div>
      <div class="grid3"><div><label>เปิด</label><select id="rOpen">${hOpts(9, 0, 23)}</select></div><div><label>ปิด</label><select id="rClose">${hOpts(22, 1, 24)}</select></div><div><label>จองล่วงหน้า (วัน)</label><input id="rAdv" type="number" value="7" min="0" max="90"></div></div>
      <label>ปักหมุดตำแหน่งสนาม</label><div id="pick" class="leaf" style="height:240px"></div><div class="sm mut" id="regLL" style="margin-top:4px">ยังไม่ได้ปักหมุด</div>
      <button class="btn" id="iGo" style="margin-top:14px" onclick="createInvite()">สร้างลิงก์คำเชิญ</button></div>` +
    (data.length ? `<h3>คำเชิญที่ยังไม่ตอบรับ (${data.length})</h3>` + data.map(v => `<div class="card" style="padding:10px 12px"><div class="row between"><b>${esc(v.name)}</b><span class="sm mut">${new Date(v.created_at).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}</span></div>
      <div class="row" style="margin-top:6px"><button class="btn ghost sm" onclick="copyText(appLink('invite=${v.invite_code}'))">คัดลอกลิงก์</button><button class="btn ghost sm" onclick="adm('admin_cancel_invite',{p_venue:'${v.id}'},'ยกเลิกคำเชิญแล้ว')">ยกเลิก</button></div></div>`).join('') : '');
}
async function createInvite() {
  const name = $('rName').value.trim(), address = $('rAddr').value.trim();
  if (!name || !address || !S.regPick) { toast('กรอกชื่อ ที่อยู่ และปักหมุดตำแหน่ง'); return; }
  if (+$('rClose').value <= +$('rOpen').value) { toast('เวลาปิดต้องหลังเวลาเปิด'); return; }
  $('iGo').disabled = true;
  try {
    const r = await rpc('admin_create_invite', {p: {name, address, lat: S.regPick.lat, lng: S.regPick.lng, court_count: +$('rCourts').value, open_hour: +$('rOpen').value, close_hour: +$('rClose').value,
      price_per_hour: +$('rPrice').value, advance_days: +$('rAdv').value, phone: $('rPhone').value, public_link: $('rLink').value.trim()}});
    if (S.leadId) { await rpc('admin_attach_lead', {p_venue: r.venue_id, p_lead: S.leadId}); S.leadId = null; }
    S.lastInvite = {code: r.invite_code, name}; S.regPick = null; render();
  } catch (e) { toast(errMsg(e)); $('iGo').disabled = false; }
}

// ---------- admin ----------
async function vApprove() {
  const { data, error } = await sb.from('venues').select('*').in('status', ['pending', 'approved']).order('created_at', {ascending: false});
  if (error) throw error;
  const pend = data.filter(v => v.status === 'pending'), ok = data.filter(v => v.status === 'approved');
  S._pend = pend;
  const cards = await Promise.all(pend.map(async v => {
    const r = await rpc('admin_venue_review', {p_venue: v.id});
    const vv = r.verification, vp = r.private || {}, fl = r.flags;
    if (!vv) return `<div class="card"><b>${esc(v.name)}</b><div class="note" style="margin-top:6px">สนามนี้ไม่มีหลักฐานยืนยัน — ให้เจ้าของลงทะเบียนใหม่</div><button class="btn ghost" style="margin-top:8px" onclick="setStatus('${v.id}','rejected')">ปฏิเสธ</button></div>`;
    const urls = await Promise.all([vv.doc_account, vv.doc_front, vv.doc_inside].map(p => sb.storage.from('venue-docs').createSignedUrl(p, 900).then(x => x.data?.signedUrl || '')));
    const warn = [];
    if (fl.same_account.length) warn.push(`บัญชีรับเงินนี้ถูกใช้กับสนามอื่นแล้ว: ${fl.same_account.map(esc).join(', ')}`);
    if (fl.nearby.length) warn.push(`มีสนามในระบบอยู่ตำแหน่งเดียวกัน/ใกล้มาก: ${fl.nearby.map(esc).join(', ')}`);
    if (fl.owner_rejected > 0) warn.push(`ผู้ลงทะเบียนเคยถูกปฏิเสธ ${fl.owner_rejected} ครั้ง`);
    if (fl.owner_account_age_days < 1) warn.push('บัญชีผู้ลงทะเบียนเพิ่งสร้างวันนี้');
    const ck = (k, t) => `<label style="display:flex;gap:8px;align-items:flex-start;color:var(--ink);margin:8px 0"><input type="checkbox" style="width:auto;margin-top:3px" ${vv[k] ? 'checked' : ''} onchange="verify('${v.id}',{${k}:this.checked})"><span>${t}</span></label>`;
    const all = vv.phone_ok && vv.account_ok && vv.location_ok && vv.docs_ok && (vv.account_name_seen || '').trim();
    return `<div class="card"><img class="hero" style="height:130px" src="${esc(photoOf(v))}">
    <b>${esc(v.name)}</b><div class="sm mut">${esc(v.address)}</div>
    <div class="sm" style="margin:6px 0">${v.court_count} คอร์ท · ${baht(v.price_per_hour)}/ชม. · ${hh(v.open_hour)}–${hh(v.close_hour)} · เบอร์ในฟอร์ม ${esc(v.phone || '-')}</div>
    <div class="sm">ผู้ลงทะเบียน: ${esc(r.owner?.display_name || '-')} (LINE) · บัญชีอายุ ${fl.owner_account_age_days} วัน</div>
    <div class="sm">รับเงิน: พร้อมเพย์ <b>${esc(vp.promptpay_id || '-')}</b> · ชื่อบัญชีที่แจ้ง <b>${esc(vp.account_name || '-')}</b>${vp.bank_account_no ? ` · เลขบัญชี ${esc(vp.bank_account_no)}` : ''}</div>
    <div class="sm">ลิงก์สาธารณะ: <a href="${esc(vv.public_link)}" target="_blank" rel="noopener noreferrer">${esc(vv.public_link.slice(0, 60))}</a></div>
    ${warn.map(w => `<div class="note" style="margin-top:6px;background:#fde8e8;border-color:#f5b5b5;color:#9b1c1c">⚠️ ${w}</div>`).join('')}
    <div class="grid3" style="margin:8px 0">${urls.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;background:#eee" alt="${['บัญชี', 'หน้าสนาม', 'ในสนาม'][i]}"></a>`).join('')}</div>
    <div id="ap-${v.id}" class="leaf" style="height:150px;margin-bottom:8px"></div>
    <div class="card" style="background:var(--bg);margin-bottom:8px"><div class="sm mut">รหัสยืนยันที่เจ้าของเห็นในแอป</div><div class="code">${esc(vp.verify_code || '-')}</div>
    ${ck('phone_ok', 'โทรไปที่<b>เบอร์จากลิงก์สาธารณะ</b> (ไม่ใช่เบอร์ในฟอร์ม) แล้วปลายสายอ่านรหัสตรงกัน')}
    ${ck('account_ok', 'โอนทดสอบ 1 บาทเข้าพร้อมเพย์ แล้วชื่อบัญชีตรงกับเจ้าของ/ชื่อกิจการ')}
    <input placeholder="ชื่อบัญชีที่เห็นในแอปธนาคารตอนโอนทดสอบ" value="${esc(vv.account_name_seen || '')}" onchange="verify('${v.id}',{account_name_seen:this.value.trim()})">
    ${ck('location_ok', 'หมุดบนแผนที่ รูปหน้าสนาม และลิงก์สาธารณะ เป็นสถานที่เดียวกัน')}
    ${ck('docs_ok', 'รูปหลักฐาน 3 รูปชัดเจน และชื่อในสมุดบัญชีตรงกับที่แจ้ง')}
    <textarea rows="2" placeholder="บันทึกการตรวจสอบ (ใครรับสาย เวลา ฯลฯ)" onchange="verify('${v.id}',{notes:this.value})">${esc(vv.notes || '')}</textarea></div>
    <div class="grid2"><button class="btn ghost" onclick="setStatus('${v.id}','rejected')">ปฏิเสธ</button><button class="btn" ${all ? '' : 'disabled'} onclick="setStatus('${v.id}','approved')">อนุมัติ</button></div>
    ${all ? '' : '<div class="sm mut" style="margin-top:6px;text-align:center">ต้องตรวจครบ 4 ข้อและบันทึกชื่อบัญชีก่อน จึงอนุมัติได้</div>'}</div>`;
  }));
  return `<h2>สนามรออนุมัติ (${pend.length})</h2>` + (cards.join('') || '<div class="empty">ไม่มีสนามรออนุมัติ</div>') +
    `<h3>สนามในระบบ (${ok.length})</h3>` + ok.map(v => `<div class="card row between" style="padding:10px 12px"><span>${esc(v.name)}${v.probation_until >= today() ? ' <span class="chip warn">สนามใหม่</span>' : ''}</span>${v.frontdesk_until >= today() ? '<span class="chip">หน้าร้าน</span>' : '<span class="chip gray">ออนไลน์อย่างเดียว</span>'}</div>`).join('');
}
async function verify(id, p) { try { await rpc('admin_verify_venue', {p_venue: id, p}); if (Object.keys(p).some(k => k !== 'notes')) { const y = window.scrollY; await render(); window.scrollTo(0, y); } } catch (e) { toast(errMsg(e)); } }
function drawApproveMaps() {
  (S._pend || []).forEach(v => { const m = L.map(`ap-${v.id}`, {zoomControl: false, dragging: false, scrollWheelZoom: false}).setView([v.lat, v.lng], 15); osm(m); L.marker([v.lat, v.lng], {icon: L.divIcon({className: '', html: '<span class="pinx" style="background:#e5484d">📍</span>', iconSize: [0, 0]})}).addTo(m); });
}
async function setStatus(id, st) { try { await rpc('admin_set_venue_status', {p_venue: id, p_status: st}); toast(st === 'approved' ? 'อนุมัติแล้ว — สนามขึ้นแผนที่' : 'ปฏิเสธแล้ว'); render(); } catch (e) { toast(errMsg(e)); } }
async function vRevenue() {
  const o = await rpc('admin_overview');
  return `<h2>รายได้แพลตฟอร์ม</h2>
    <div class="grid2" style="margin-bottom:10px">
      <div class="stat"><div class="sm mut">ค่าบริการจองสะสม</div><div class="v">${baht(o.fee_earned)}</div><div class="sm mut">เก็บแล้ว ${baht(o.fee_collected)}</div></div>
      <div class="stat"><div class="sm mut">ค้างเก็บจากสนาม</div><div class="v" style="color:${o.fee_due > 0 ? 'var(--bad)' : 'inherit'}">${baht(o.fee_due)}</div></div>
      <div class="stat"><div class="sm mut">ค่าระบบหน้าร้าน</div><div class="v">${baht(o.subscription_revenue)}</div><div class="sm mut">ใช้งานอยู่ ${o.frontdesk_active} สนาม</div></div>
      <div class="stat"><div class="sm mut">ค่าสนามผ่านระบบ</div><div class="v">${baht(o.court_total)}</div><div class="sm mut">เข้าบัญชีสนามโดยตรง</div></div>
    </div>` + (o.venues.length ? o.venues.map(v => `<div class="card" style="padding:12px"><div class="row between"><b>${esc(v.name)}</b>${v.online_enabled ? '' : '<span class="chip bad">ปิดจองออนไลน์</span>'}</div>
      <div class="sm mut">${v.hours} คอร์ท-ชม. · ค่าสนาม ${baht(v.court_total)} · ค่าบริการ ${baht(v.fee_total)}</div>
      <div class="row between" style="margin-top:6px"><span class="sm">ค้างชำระ <b>${baht(v.fee_due)}</b>${v.oldest_unpaid ? ` · ตั้งแต่ ${new Date(v.oldest_unpaid).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}` : ''}</span>
      <span class="row">${v.fee_due > 0 ? `<button class="btn ghost sm" onclick="adm('admin_mark_fees_settled',{p_venue:'${v.id}'},'บันทึกว่ารับชำระแล้ว')">รับชำระแล้ว</button>` : ''}
      <button class="btn ghost sm" onclick="adm('admin_set_online',{p_venue:'${v.id}',p_enabled:${!v.online_enabled}},'บันทึกแล้ว')">${v.online_enabled ? 'ปิดจองออนไลน์' : 'เปิดจองออนไลน์'}</button></span></div></div>`).join('') : '<div class="empty">ยังไม่มีสนามที่อนุมัติ</div>');
}
async function adm(fn, args, msg) { try { await rpc(fn, args); toast(msg); render(); } catch (e) { toast(errMsg(e)); } }
async function vSlips() {
  const { data: rq } = await sb.from('orders').select('id,code,kind,amount,customer_name,review_reason,slip_path,venues(name)').eq('status', 'review').order('review_since');
  const plat = (rq || []).filter(o => o.kind === 'fees' || o.kind === 'subscription'), ven = (rq || []).filter(o => o.kind === 'online' || o.kind === 'package');
  const pUrls = await Promise.all(plat.map(o => o.slip_path ? sb.storage.from('slips').createSignedUrl(o.slip_path, 1800).then(x => x.data?.signedUrl || '') : ''));
  const head = (plat.length ? `<h2>สลิปค่าบริการรอตีแบตตรวจ (${plat.length})</h2>` + plat.map((o, i) => `<div class="card" style="padding:12px"><div class="row between"><b>${esc(o.venues?.name || '')}</b><span class="sm mut">${esc(o.code)}</span></div>
      <div class="kv"><span>${o.kind === 'fees' ? 'ค่าบริการจอง' : 'ค่าระบบหน้าร้าน'}</span><b>${baht(o.amount)}</b></div><div class="sm mut">${esc(o.review_reason || '')}</div>
      ${pUrls[i] ? `<a href="${esc(pUrls[i])}" target="_blank" rel="noopener"><img src="${esc(pUrls[i])}" class="slipprev" alt="สลิป"></a>` : ''}
      <div class="grid2" style="margin-top:8px"><button class="btn red" onclick="rejectSlip('${o.id}')">ไม่อนุมัติ</button><button class="btn" onclick="approveSlip('${o.id}', ${Number(o.amount)})">เงินเข้าแล้ว</button></div></div>`).join('') : '') +
    (ven.length ? `<div class="note" style="margin-bottom:10px">มีสลิปค่าสนาม ${ven.length} รายการที่สนามกำลังตรวจเอง (ไม่ต้องทำอะไร)</div>` : '');
  const { data, error } = await sb.from('slip_checks').select('*, orders(code,status,kind,customer_name,venues(name))').order('created_at', {ascending: false}).limit(60);
  if (error) throw error;
  return head + `<h2>ผลตรวจสลิปอัตโนมัติ</h2>` + (data.length ? data.map(s => `<div class="card" style="padding:12px"><div class="row between"><b>${esc(s.orders?.code || '-')}</b><span class="chip ${s.ok ? '' : 'bad'}">${s.ok ? 'ผ่าน' : 'ไม่ผ่าน'}</span></div>
    <div class="sm mut">${new Date(s.created_at).toLocaleString('th-TH')} · ${esc(s.orders?.customer_name || '')} · ${esc(s.orders?.venues?.name || '')}</div>
    <div class="sm">ต้องชำระ ${baht(s.expected)} · ในสลิป ${s.found == null ? '-' : baht(s.found)}${s.message ? ` · ${esc(s.message)}` : ''}</div>
    ${!s.ok && s.orders && ['fees', 'subscription'].includes(s.orders.kind) && ['hold', 'expired'].includes(s.orders.status) ? `<button class="btn ghost sm" style="margin-top:6px" onclick="adm('admin_confirm_order',{p_order:'${s.order_id}'},'ยืนยันรายการแล้ว')">ตรวจเองแล้ว — ยืนยันรายการนี้</button>` : ''}</div>`).join('')
    : '<div class="empty">ยังไม่มีสลิป</div>');
}
const SETTING_FIELDS = [
  ['liff_id', 'LIFF ID (เช่น 2001234567-AbCdEfGh)'], ['line_channel_id', 'LINE Login Channel ID'],
  ['promptpay_id', 'พร้อมเพย์ของตีแบต (รับค่าบริการจากสนาม)'], ['platform_account_name', 'ชื่อบัญชีของตีแบต'], ['platform_account_no', 'เลขบัญชีของตีแบต (ไม่บังคับ)'],
  ['booking_fee_per_hour', 'ค่าบริการจอง (บาท/คอร์ท-ชม.)'], ['package_fee_cap', 'เพดานค่าบริการต่อแพ็กเกจก๊วน (เว้นว่าง = ไม่จำกัด)'],
  ['frontdesk_monthly_fee', 'ค่าระบบหน้าร้าน (บาท/เดือน)'], ['hold_minutes', 'เวลารอชำระ (นาที)'], ['probation_days', 'ช่วงสนามใหม่หลังอนุมัติ (วัน)'], ['probation_max_amount', 'ยอดสูงสุดต่อรายการช่วงสนามใหม่ (บาท)'], ['invite_free_frontdesk_days', 'ฟรีระบบหน้าร้านสำหรับสนามที่ชวนเข้ามา (วัน, 0 = ไม่แจก)'], ['referral_credit_amount', 'เครดิตรางวัลผู้ชวนสนาม (บาท)'], ['referral_hours_threshold', 'ชั่วโมงจองออนไลน์ที่ต้องเกินก่อนจ่ายรางวัล'], ['referral_months', 'สิทธิ์จองฟรีค่าบริการของผู้ชวน (เดือน, 0 = ปิด)'], ['report_threshold', 'จำนวนผู้รายงานที่ทำให้ปิดจองออนไลน์อัตโนมัติ'],
  ['slip_test_mode', 'โหมดทดสอบสลิป (true/false) — ปิดก่อนเปิดใช้จริง'], ['allow_guest_login', 'อนุญาตผู้ใช้ทดลองไม่ผ่าน LINE (true/false) — ปิดก่อนเปิดใช้จริง'],
];
function vSettings() {
  return `<h2>ตั้งค่าระบบ</h2><div class="card">` + SETTING_FIELDS.map(([k, t]) => `<label>${t}</label><input value="${esc(S.settings[k] ?? '')}" onchange="saveSetting('${k}',this.value.trim())">`).join('') +
    `<p class="sm mut" style="margin-top:10px">บันทึกอัตโนมัติเมื่อแก้ไขแต่ละช่อง · API key ของ SlipOK และอีเมลตั้งใน Supabase (Edge Function secrets) ไม่ได้เก็บที่นี่</p></div>`;
}
async function saveSetting(k, v) { try { await rpc('admin_set_setting', {p_key: k, p_value: v}); S.settings[k] = v; toast('บันทึกแล้ว'); } catch (e) { toast(errMsg(e)); } }

boot();
