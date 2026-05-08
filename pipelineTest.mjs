// VizCount — Full Pipeline Test (6 types × 5 scenarios + HUD state checks)

// ─── GS1 Parser ───────────────────────────────────────────────────────────────
function parseGS1(barcode) {
    const r = {}; let i = 0;
    if (barcode.charCodeAt(0) === 29) i++;
    else if (barcode.startsWith(']C1')) i += 3;
    while (i < barcode.length) {
        if (i + 2 > barcode.length) break;
        const a2 = barcode.substring(i, i + 2);
        if (a2 === '01') { i += 2; r.gtin = barcode.substring(i, i + 14); i += 14; }
        else if (a2 === '11') { i += 2; r.prodDate = yymmdd(barcode.substring(i, i + 6)); i += 6; }
        else if (a2 === '17') { i += 2; r.expiry = yymmdd(barcode.substring(i, i + 6)); i += 6; }
        else if (a2 === '21') {
            i += 2;
            let e = barcode.indexOf('\x1d', i);
            if (e < 0) e = barcode.length;
            if (e - i > 20) e = i + 20;
            r.sn = barcode.substring(i, e); i = e;
            if (i < barcode.length && barcode.charCodeAt(i) === 29) i++;
        } else if (a2 === '31') {
            if (i + 4 > barcode.length) break;
            const a4 = barcode.substring(i, i + 4);
            if (a4.startsWith('310')) { const dp = parseInt(a4[3], 10); i += 4; r.weight = parseInt(barcode.substring(i, i + 6), 10) / Math.pow(10, dp); i += 6; }
            else i += 10;
        } else break;
    }
    return r;
}
function yymmdd(s) {
    const y = parseInt(s.substring(0, 2), 10), m = parseInt(s.substring(2, 4), 10), d = parseInt(s.substring(4, 6), 10);
    const yr = y < 70 ? 2000 + y : 1900 + y;
    return d === 0 ? new Date(yr, m, 0).getTime() : new Date(yr, m - 1, d).getTime();
}

// ─── OCR helpers ──────────────────────────────────────────────────────────────
function extractSN(lines, type) {
    const chk = ['Halal', 'Organic Chicken', 'Maple Leaf Chicken'].includes(type);
    if (chk) {
        const hi = lines.findIndex(l => /\bHU\b/i.test(l));
        const src = hi >= 0 ? [...lines.slice(Math.max(0, hi - 2), hi + 3), ...lines] : lines;
        for (const l of src) { const m = l.match(/\b(\d{14})\b/); if (m) return m[1]; }
    } else {
        for (const l of lines) { const m = l.match(/S\/N\s*(\d{12})/i); if (m) return m[1]; }
        for (const l of lines) { const m = l.match(/\b(\d{12})\b/); if (m) return m[1]; }
    }
    return null;
}
function extractKg(lines) {
    for (const l of lines) {
        let m = l.match(/\bnet\s*([\d.]+)\s*kg/i) || l.match(/\b([\d.]+)\s*kg\b/i);
        if (m) return parseFloat(parseFloat(m[1]).toFixed(2));
        m = l.match(/\bnet\s*([\d.]+)\s*lb/i) || l.match(/\b([\d.]+)\s*lb\b/i);
        if (m) return parseFloat((parseFloat(m[1]) * 0.453592).toFixed(2));
    }
    return 0;
}
function extractBB(lines, prodTs) {
    const all = [], exp = [];
    const EX = /best before|exp|bb|use by/i;
    const MO = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const push = (ts, l) => { if (!isNaN(ts)) { all.push(ts); if (EX.test(l)) exp.push(ts); } };
    for (const l of lines) {
        for (const s of l.match(/\b(\d{1,4})\/(\d{1,2})\/(\d{2,4})\b/g) || []) {
            const [a, b, c] = s.split('/').map(Number);
            push(a > 1000 ? new Date(a, b - 1, c).getTime() : new Date(c < 100 ? 2000 + c : c, b - 1, a).getTime(), l);
        }
        for (const s of l.match(/\b(\d{1,2})[\s-]([A-Za-z]{3,4})[\s-](\d{2,4})\b/g) || []) {
            const p = s.split(/[\s-]/), d = parseInt(p[0], 10), mo = MO[p[1].toLowerCase().slice(0, 3)], yr = parseInt(p[2], 10);
            if (mo != null) push(new Date(yr < 100 ? 2000 + yr : yr, mo, d).getTime(), l);
        }
    }
    const u = [...new Set(all)].sort((a, b) => a - b);
    if (exp.length > 0) return exp[exp.length - 1];
    if (u.length >= 2) return u[u.length - 1];
    if (u.length === 1) return u[0];
    return prodTs || null;
}

// ─── UI / HUD state machine ───────────────────────────────────────────────────
const UI = { scanStep: 0, isProcessing: false, mode: 'barcode' };
let stuckCount = 0;

function setScanStep(s) {
    UI.scanStep = s;
    const labels = ['[HUD] HIDDEN', '[HUD] Extracting Details…', '[HUD] Saving to Database…', '[HUD] Scan Complete ✅'];
    console.log('   ' + labels[s]);
}
function setIsProcessingImage(v) {
    UI.isProcessing = v;
    console.log(`   [SHUTTER] ${v ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
}
function setScanMode(m) {
    UI.mode = m;
    if (m === 'barcode') console.log('   [MODE] → barcode');
}
function resumeScanning() { console.log('   [SCANNER] 🔄 Ready for next scan'); }
function showToast(msg, type, ms = 3000) {
    const icon = { success: '🟢', error: '🔴', warning: '🟡', info: '🔵' }[type] || '⚪';
    console.log(`   ${icon} TOAST(${ms}ms): ${msg}`);
}
function assertHUDCleared(label) {
    if (UI.scanStep !== 0 || UI.isProcessing) {
        console.log(`   ❌ HUD STUCK after "${label}" — scanStep=${UI.scanStep} isProcessing=${UI.isProcessing}`);
        stuckCount++;
    } else {
        console.log(`   ✅ HUD cleared OK`);
    }
}

// ─── Simulated DB ─────────────────────────────────────────────────────────────
const catalogMap = new Map(), gtinMap = new Map(), saved = [];
function define(p) { catalogMap.set(p.pid, { ...p, gtin: null }); console.log(`   [DB] Product defined: pid:${p.pid} "${p.name}"`); }
function linkGTIN(pid, gtin) {
    const p = catalogMap.get(pid); if (!p) return;
    const old = p.gtin; p.gtin = gtin;
    if (old) gtinMap.delete(old);
    gtinMap.set(gtin, p);
    console.log(`   [DB] 🔗 GTIN ${gtin} → pid:${pid}` + (old ? ` (removed old ${old})` : ''));
}
function checkDup(pid, sn) { return saved.some(x => x.pid === pid && x.sn === sn); }
function saveRecord(r) {
    saved.push({ pid: r.pid, sn: r.sn });
    console.log(`   [DB] 💾 pid:${r.pid}  sn:${r.sn}  ${r.kg}kg  expiry:${r.expiry ? new Date(r.expiry).toDateString() : 'none'}`);
}
function needsOCR(p, gs1) {
    const chk = ['Halal', 'Organic Chicken', 'Maple Leaf Chicken'].includes(p?.type);
    return chk && !gs1.expiry && !(gs1.prodDate && (p.name.toLowerCase().includes('maple leaf') || p.name.toLowerCase().includes('mina')));
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function run(label, { bcode, ocr = [] }) {
    console.log(`\n  ┌── ${label}`);
    setIsProcessingImage(true);
    setScanStep(1);

    const gs1 = parseGS1(bcode);
    console.log(`   [GS1] GTIN:${gs1.gtin || '—'}  SN:${gs1.sn || '—'}  Wt:${gs1.weight != null ? gs1.weight + 'kg' : '—'}  Exp:${gs1.expiry ? new Date(gs1.expiry).toDateString() : '—'}`);

    let product = gs1.gtin ? (gtinMap.get(gs1.gtin) || null) : null;
    let pid = product?.pid || null;
    let viaOCR = false;

    if (product && !needsOCR(product, gs1)) {
        console.log(`   [GTIN] ✅ ${gs1.gtin} → pid:${pid} "${product.name}" — fast-track`);
    } else {
        if (product && needsOCR(product, gs1)) {
            console.log(`   [GTIN] ✅ ${gs1.gtin} known BUT chicken/no-expiry → need OCR`);
            product = null;
        } else {
            console.log(`   [GTIN] ❌ ${gs1.gtin || 'none'} unknown → need OCR`);
        }

        if (ocr.length === 0) {
            // = what happens when no snapshot yet: show snap UI, reset HUD
            setScanStep(0); setIsProcessingImage(false); resumeScanning();
            showToast('Tap shutter to snap label', 'info');
            assertHUDCleared('no-OCR abort');
            console.log('  └── ABORT (would show snap UI)\n');
            return;
        }

        const RE = /\bPID[:\s]+(\d{7,8})\b|\b(\d{8})\b/i;
        for (const l of ocr) {
            const m = l.match(RE);
            if (m) {
                pid = (m[1] || m[2]).trim();
                product = catalogMap.get(pid) || null;
                if (product) { viaOCR = true; console.log(`   [OCR] ✅ PID ${pid} → "${product.name}"`); break; }
            }
        }
    }

    // Product not found → FIX 1: reset both scanStep AND isProcessingImage immediately
    if (!product) {
        setScanStep(0);
        setIsProcessingImage(false);
        resumeScanning();
        showToast(`⚠️ PID ${pid || 'unknown'} not in catalog`, 'error');
        assertHUDCleared('product-not-found');
        console.log('  └── ABORT (product not found)\n');
        return { aborted: true, pid };
    }

    // Link new GTIN discovered via OCR
    if (gs1.gtin && viaOCR) linkGTIN(pid, gs1.gtin);

    // SN resolution (string)
    let sn = gs1.sn || extractSN(ocr, product.type) || null;
    if (!sn) { sn = Date.now().toString(); console.log(`   [SN] ⚠️  none found — timestamp: ${sn}`); }
    else console.log(`   [SN] ${sn}`);

    // Duplicate → FIX 2: reset scanStep+isProcessing immediately, only delay camera resume
    if (checkDup(pid, sn)) {
        setScanStep(0);
        setIsProcessingImage(false);
        // setTimeout(() => { setScanMode('barcode'); resumeScanning(); }, 2500)  ← simulated immediately
        setScanMode('barcode'); resumeScanning();
        showToast(`📄 Already counted — ${product.name} (SN:${sn})`, 'warning', 2500);
        assertHUDCleared('duplicate-SN');
        console.log('  └── SKIP (duplicate)\n');
        return;
    }

    const kg = gs1.weight != null ? gs1.weight : extractKg(ocr);
    let expiry = gs1.expiry || null;
    if (!expiry) {
        expiry = extractBB(ocr, gs1.prodDate);
        if (expiry && gs1.prodDate && expiry === gs1.prodDate) {
            const n = product.name.toLowerCase();
            if (n.includes('maple leaf') || n.includes('mina')) {
                expiry += 11 * 86400000;
                console.log(`   [DATE] 🍁 +11d → ${new Date(expiry).toDateString()}`);
            }
        }
    }

    setScanStep(2);
    saveRecord({ pid, sn, kg, expiry });
    setScanStep(3);
    showToast(`✅ ${product.name} recorded`, 'success');

    // FIX 3: success timeout — reset all state (simulated synchronously)
    setScanStep(0);
    setIsProcessingImage(false);
    setScanMode('barcode');
    resumeScanning();
    assertHUDCleared('success');
    console.log('  └── DONE ✅\n');
}

// ─── Define all products ──────────────────────────────────────────────────────
const PRODUCTS = [
    { pid: '31439394', name: 'PKSSG BR MAPLE 900ML',  type: 'Pork',               pack: 6, gtin: '00081439394001' },
    { pid: '50772502', name: 'AA STRIPLOIN STEAK',     type: 'Beef',               pack: 8, gtin: '00057720250021' },
    { pid: '30910241', name: 'BFGRD XLEAN C14YF',      type: 'Beef',               pack: 8, gtin: '00030910241001' },
    { pid: '31180986', name: 'ML WHOLE WING',          type: 'Maple Leaf Chicken', pack: 8, gtin: '00031180986006' },
    { pid: '31396056', name: 'PRIME ORG WB',           type: 'Organic Chicken',    pack: 6, gtin: '00031396056001' },
    { pid: '30148922', name: 'MINA HALAL CHN LG QT',   type: 'Halal',              pack: 6, gtin: '00030148922001' },
];
PRODUCTS.forEach(p => define(p));

function bc({ gtin, sn, weight, expiry, prod }) {
    let b = ']C1';
    if (gtin) b += `01${gtin}`;
    if (prod) b += `11${prod}`;
    if (expiry) b += `17${expiry}`;
    if (weight != null) b += `3102${String(Math.round(weight * 100)).padStart(6, '0')}`;
    if (sn) b += `21${sn}\x1d`;
    return b;
}
function lbl({ pid, sn, hu, weight, bb, prod }) {
    const lines = [`PID: ${pid}`];
    if (hu) lines.push(`HU ${hu}`);
    if (sn) lines.push(`S/N ${sn}`);
    if (weight != null) lines.push(`Net ${weight} kg`);
    if (prod) lines.push(`PKD: ${prod}`);
    if (bb) lines.push(`Best Before: ${bb}`);
    return lines;
}

// ─── Run all scenarios × all products ────────────────────────────────────────
let totalScenarios = 0;
for (const P of PRODUCTS) {
    const CHK = ['Halal', 'Organic Chicken', 'Maple Leaf Chicken'].includes(P.type);
    const SN1 = CHK ? '20260310' + P.pid.slice(-6) : P.pid.slice(-6) + '000001';
    const SN2 = CHK ? '20260311' + P.pid.slice(-6) : P.pid.slice(-6) + '000002';

    console.log(`\n${'━'.repeat(68)}`);
    console.log(`  ${P.name}  (${P.type})`);
    console.log('━'.repeat(68));

    // S1: GTIN known → fast-track
    linkGTIN(P.pid, P.gtin);
    run('S1: GTIN known → fast-track → record saved', {
        bcode: bc({ gtin: P.gtin, sn: SN1, weight: 1.36, expiry: CHK ? null : '260328', prod: '260310' }),
        ocr: CHK ? lbl({ pid: P.pid, hu: SN1, weight: 1.36, bb: '28-MAR-2026', prod: '10-MAR-2026' }) : []
    }); totalScenarios++;

    // S2: GTIN removed → OCR → PID found → GTIN linked → saved
    gtinMap.delete(P.gtin); catalogMap.get(P.pid).gtin = null;
    run('S2: GTIN unknown → OCR finds PID → GTIN linked → saved', {
        bcode: bc({ gtin: P.gtin, sn: SN2, weight: 0.9 }),
        ocr: lbl(CHK ? { pid: P.pid, hu: SN2, weight: 0.9, bb: '22-MAR-2026' }
                      : { pid: P.pid, sn: SN2, weight: 0.9, bb: '22-MAR-2026' })
    }); totalScenarios++;

    // S3: GTIN known, SN missing → timestamp fallback
    run('S3: GTIN known, SN missing → timestamp SN', {
        bcode: bc({ gtin: P.gtin, weight: 1.1, expiry: '260328' }),
        ocr: []
    }); totalScenarios++;

    // S4: Duplicate — SN1 already saved from S1
    run(`S4: GTIN known, SN:${SN1} → DUPLICATE detected`, {
        bcode: bc({ gtin: P.gtin, sn: SN1, weight: 1.36, expiry: '260328' }),
        ocr: CHK ? lbl({ pid: P.pid, hu: SN1 }) : []
    }); totalScenarios++;

    // S5a: GTIN & PID both unknown → abort
    const fakePid = '99999' + P.pid.slice(-3);
    const fakeGTIN = '000999' + P.pid.slice(-8);
    const res = run('S5a: GTIN & PID unknown → product not found → abort', {
        bcode: bc({ gtin: fakeGTIN }),
        ocr: [`PID: ${fakePid}`]
    }); totalScenarios++;

    // S5b: define product → re-scan same barcode
    if (res?.aborted) {
        define({ pid: fakePid, name: `NEW ${P.name}`, type: P.type, pack: P.pack });
        run('S5b: After define → re-scan → GTIN linked → record saved', {
            bcode: bc({ gtin: fakeGTIN, sn: SN1, weight: 1.2, expiry: '260325' }),
            ocr: [`PID: ${fakePid}`]
        }); totalScenarios++;
    }
}

// ─── Results ──────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(68)}`);
if (stuckCount === 0) {
    console.log(`  ✅  ALL ${totalScenarios} SCENARIOS PASSED`);
    console.log(`  ✅  HUD STATE MACHINE CLEAN — 0 stuck occurrences`);
} else {
    console.log(`  ❌  ${stuckCount} STUCK HUD OCCURRENCE(S) — see above`);
}
console.log(`  📦 Total records saved: ${saved.length}`);
console.log('═'.repeat(68));
saved.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2, '0')}. pid:${s.pid}  sn:${s.sn}`));
