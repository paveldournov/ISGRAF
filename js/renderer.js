// js/renderer.js — Canvas-based retro renderer
// Replicates the look and feel of the original DOS/BGI ISGRF program

// VGA 16-color palette (indices 0-15)
const C = [
    '#000000', // 0 Black
    '#0000AA', // 1 Blue
    '#00AA00', // 2 Green
    '#00AAAA', // 3 Cyan
    '#AA0000', // 4 Red
    '#AA00AA', // 5 Magenta
    '#AA5500', // 6 Brown
    '#AAAAAA', // 7 LightGray
    '#555555', // 8 DarkGray
    '#5555FF', // 9 LightBlue
    '#55FF55', // 10 LightGreen
    '#55FFFF', // 11 LightCyan
    '#FF5555', // 12 LightRed
    '#FF55FF', // 13 LightMagenta
    '#FFFF55', // 14 Yellow
    '#FFFFFF', // 15 White
];

// Named aliases matching Pascal constants
const COL = {
    BG:      C[1],   // Blue — plot background
    AXES:    C[14],  // Yellow — axes when zero in range
    AXES_OFF:C[4],   // Red — axes when zero out of range
    BORDER:  C[6],   // Brown — thick border
    MENU_BG: C[0],   // Black — menu background
    MENU_TXT:C[14],  // Yellow — menu text
    STATUS:  C[13],  // LightMagenta — status bar text
    TICK:    C[15],  // White — tick marks
    LABEL:   C[7],   // LightGray — axis labels
    GRID:    C[14],  // Yellow — grid lines (dashed)
    POPUP_BG:C[0],   // Black
    POPUP_BR:C[2],   // Green border
    POPUP_TX:C[14],  // Yellow text
    INFO_BG: C[2],   // Green — info box background
    ERR_BG:  C[4],   // Red — error background
    ERR_TX:  C[14],  // Yellow — error text
    FUNC_COLORS: [C[10],C[12],C[11],C[13],C[9],C[3],C[15],C[7],C[14],C[5]],
};

class Renderer {
    constructor() {
        this.canvas = null;
        this.ctx    = null;

        // Layout (computed on resize)
        this.MENU_H   = 20;   // menu bar height
        this.STATUS_H = 18;   // status bar height
        this.FONT_H   = 14;   // font size in px
        this.CHAR_W   = 8;    // approx char width

        // Plot viewport (set by resize())
        this.px = 0; this.py = 0;   // top-left of plot area
        this.pw = 0; this.ph = 0;   // size of plot area

        // Current world range
        this.xMin = -10; this.xMax = 10;
        this.yMin = -10; this.yMax = 10;
        this.scaleX = 1; this.scaleY = 1;
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.resize();
    }

    resize() {
        const canvas = this.canvas;
        canvas.width  = canvas.offsetWidth  || window.innerWidth;
        canvas.height = canvas.offsetHeight || window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
        this._computeLayout();
        this._updateScale();
    }

    _computeLayout() {
        const W = this.canvas.width, H = this.canvas.height;
        // Plot area is inset inside the double border
        this.px = 12;
        this.py = this.MENU_H + 4;
        this.pw = W - 24;
        this.ph = H - this.MENU_H - this.STATUS_H - 8;
    }

    _updateScale() {
        this.scaleX = this.pw / (this.xMax - this.xMin);
        this.scaleY = this.ph / (this.yMax - this.yMin);
    }

    setRange(xMin, xMax, yMin, yMax) {
        this.xMin = xMin; this.xMax = xMax;
        this.yMin = yMin; this.yMax = yMax;
        this._updateScale();
    }

    // World → canvas pixel
    wx(x) { return Math.round(this.px + (x - this.xMin) * this.scaleX); }
    wy(y) { return Math.round(this.py + (this.yMax - y) * this.scaleY); }

    // Canvas pixel → world
    cxToWorld(cx) { return this.xMin + (cx - this.px) / this.scaleX; }
    cyToWorld(cy) { return this.yMax - (cy - this.py) / this.scaleY; }

    // ── Screen structure ────────────────────────────────────────────────────

    drawFrame() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        // Black background for whole screen
        ctx.fillStyle = COL.MENU_BG;
        ctx.fillRect(0, 0, W, H);

        // Thin white rectangle around title area
        ctx.strokeStyle = C[15];
        ctx.lineWidth = 1;
        ctx.strokeRect(9, 0, W - 18, this.MENU_H - 1);

        // Thick brown rectangle around plot area
        ctx.strokeStyle = COL.BORDER;
        ctx.lineWidth = 3;
        ctx.strokeRect(9, this.MENU_H + 1, W - 18,
            H - this.MENU_H - this.STATUS_H - 4);
        ctx.lineWidth = 1;
    }

    clearPlot() {
        const ctx = this.ctx;
        ctx.fillStyle = COL.BG;
        ctx.fillRect(this.px, this.py, this.pw, this.ph);
    }

    // ── Menu bar ────────────────────────────────────────────────────────────

    drawMenuBar(items, selectedIdx) {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;

        // Clear menu area
        ctx.fillStyle = COL.MENU_BG;
        ctx.fillRect(0, 0, this.canvas.width, this.MENU_H);

        ctx.fillStyle = COL.MENU_TXT;
        let x = 18;
        for (let i = 0; i < items.length; i++) {
            const label = ' ' + items[i] + ' ';
            if (i === selectedIdx) {
                // Highlight selected item with a green XOR-style box
                const w = ctx.measureText(label).width;
                ctx.strokeStyle = C[10];
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 1, 1, w + 1, this.MENU_H - 3);
            }
            ctx.fillStyle = COL.MENU_TXT;
            ctx.fillText(label, x, this.MENU_H - 4);
            x += ctx.measureText(label).width;
        }
    }

    // Returns pixel x ranges for each menu item label
    menuItemRanges(items) {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        const ranges = [];
        let x = 18;
        for (const label of items) {
            const s = ' ' + label + ' ';
            const w = ctx.measureText(s).width;
            ranges.push({ x, w });
            x += w;
        }
        return ranges;
    }

    // ── Status bar ──────────────────────────────────────────────────────────

    drawStatusBar(xMin, xMax, yMin, yMax, slotNum) {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const y = H - this.STATUS_H;

        ctx.fillStyle = COL.MENU_BG;
        ctx.fillRect(0, y, W, this.STATUS_H);

        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        ctx.fillStyle = COL.STATUS;

        const f = n => n.toFixed(2);
        const txt = `X:[${f(xMin)}..${f(xMax)}]  Y:[${f(yMin)}..${f(yMax)}]  Slot:${slotNum}`;
        ctx.fillText(txt, 18, H - 3);
    }

    // ── Axes ────────────────────────────────────────────────────────────────

    drawAxes() {
        const ctx = this.ctx;
        const { px, py, pw, ph, xMin, xMax, yMin, yMax, scaleX, scaleY } = this;
        if (xMin === xMax || yMin === yMax) return;

        // Clip to plot area
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();

        ctx.lineWidth = 1;
        const hasZeroX = (xMin < 0 && xMax > 0) || (xMin === 0) || (xMax === 0);
        const hasZeroY = (yMin < 0 && yMax > 0) || (yMin === 0) || (yMax === 0);

        // Y-axis (vertical line at x=0 or at edge)
        let axisX;
        if (hasZeroX) {
            axisX = this.wx(0);
            ctx.strokeStyle = COL.AXES;
        } else {
            axisX = xMin < 0 ? px + pw - 2 : px + 2;
            ctx.strokeStyle = COL.AXES_OFF;
        }
        ctx.beginPath();
        ctx.moveTo(axisX, py);
        ctx.lineTo(axisX, py + ph);
        ctx.stroke();

        // X-axis (horizontal line at y=0 or at edge)
        let axisY;
        if (hasZeroY) {
            axisY = this.wy(0);
            ctx.strokeStyle = COL.AXES;
        } else {
            axisY = yMin < 0 ? py + 2 : py + ph - 2;
            ctx.strokeStyle = COL.AXES_OFF;
        }
        ctx.beginPath();
        ctx.moveTo(px, axisY);
        ctx.lineTo(px + pw, axisY);
        ctx.stroke();

        // Tick marks and labels — 9 divisions on each axis
        ctx.font = `${this.FONT_H - 2}px 'Courier New', monospace`;

        // Determine label row/col placement to avoid clipping
        const labelY = (axisY > py + ph - 18) ? py + ph - 14 : axisY + 4;
        const labelX = (axisX > px + pw - 55) ? px + pw - 56 : axisX + 4;

        for (let i = 1; i <= 9; i++) {
            // X-axis ticks
            const tx = Math.round(px + pw / 10 * i);
            ctx.strokeStyle = COL.TICK;
            ctx.beginPath();
            ctx.moveTo(tx, axisY - 3);
            ctx.lineTo(tx, axisY + 3);
            ctx.stroke();
            ctx.fillStyle = COL.LABEL;
            const valX = xMin + (pw / 10 * i) / scaleX;
            ctx.fillText(valX.toFixed(2), tx - 14, labelY + 12);

            // Y-axis ticks
            const ty = Math.round(py + ph / 10 * (i - 1));
            ctx.strokeStyle = COL.TICK;
            ctx.beginPath();
            ctx.moveTo(axisX - 3, ty);
            ctx.lineTo(axisX + 3, ty);
            ctx.stroke();
            ctx.fillStyle = COL.LABEL;
            const valY = yMax - (ph / 10 * (i - 1)) / scaleY;
            ctx.fillText(valY.toFixed(2), labelX, ty + 4);
        }

        ctx.restore();
    }

    // ── Grid ────────────────────────────────────────────────────────────────

    drawGrid() {
        const ctx = this.ctx;
        const { px, py, pw, ph } = this;
        ctx.save();
        ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
        ctx.strokeStyle = COL.GRID;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (let i = 1; i <= 9; i++) {
            const gx = Math.round(px + pw / 10 * i);
            ctx.beginPath(); ctx.moveTo(gx, py); ctx.lineTo(gx, py + ph); ctx.stroke();
        }
        for (let i = 1; i <= 10; i++) {
            const gy = Math.round(py + ph / 10 * i);
            ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px + pw, gy); ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ── Function plotting ────────────────────────────────────────────────────

    // evalFn(t) → number|null. For Cartesian: t=x, returns y.
    // For Polar: t=theta, returns r. isPolar controls interpretation.
    plotFunction(evalFn, color, isPolar = false) {
        const ctx = this.ctx;
        const { px, py, pw, ph, xMin, xMax, yMin, yMax } = this;

        ctx.save();
        ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();

        let penDown = false;
        let prevCx = 0, prevCy = 0;
        let step, tStart, tEnd;

        if (isPolar) {
            tStart = 0; tEnd = 10 * Math.PI; step = Math.PI / 100;
        } else {
            tStart = xMin; tEnd = xMax; step = (xMax - xMin) / pw;
        }

        const discontinuities = [];

        for (let t = tStart; t <= tEnd + step * 0.5; t += step) {
            const r = evalFn(t);
            if (r === null || !isFinite(r)) { penDown = false; continue; }

            let wx, wy;
            if (isPolar) {
                wx = r * Math.cos(t);
                wy = r * Math.sin(t);
            } else {
                wx = t; wy = r;
            }

            if (wx < xMin || wx > xMax || wy < yMin || wy > yMax) {
                penDown = false; continue;
            }

            const cx = Math.round(px + (wx - xMin) * this.scaleX);
            const cy = Math.round(py + (yMax - wy) * this.scaleY);

            // Discontinuity: large vertical jump (>¼ plot height)
            if (penDown && Math.abs(cy - prevCy) > ph / 4) {
                if (discontinuities.length < 8) discontinuities.push(wx);
                penDown = false;
            }
            // For polar: large horizontal jump (wrapping)
            if (isPolar && penDown && Math.abs(cx - prevCx) > pw / 10) {
                penDown = false;
            }

            if (penDown) ctx.lineTo(cx, cy);
            else         { ctx.moveTo(cx, cy); penDown = true; }

            prevCx = cx; prevCy = cy;
        }

        ctx.stroke();
        ctx.restore();
        return discontinuities;
    }

    // ── Popup menu ───────────────────────────────────────────────────────────

    drawPopup(x, y, items, selectedIdx) {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;

        const cw  = ctx.measureText('M').width;
        const ch  = this.FONT_H + 4;
        const maxLen = Math.max(...items.map(s => s.length));
        const pw  = (maxLen + 2) * cw + 8;
        const ph  = items.length * ch + 8;

        // Background + borders
        ctx.fillStyle = COL.POPUP_BG;
        ctx.fillRect(x, y, pw, ph);
        ctx.strokeStyle = COL.POPUP_BR;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, pw - 2, ph - 2);
        ctx.strokeRect(x + 3, y + 3, pw - 6, ph - 6);

        // Items
        for (let i = 0; i < items.length; i++) {
            const iy = y + 5 + i * ch;
            if (i === selectedIdx) {
                ctx.fillStyle = COL.POPUP_TX;
                ctx.fillRect(x + 5, iy - 1, pw - 10, ch);
                ctx.fillStyle = COL.POPUP_BG;
            } else {
                ctx.fillStyle = COL.POPUP_TX;
            }
            ctx.fillText(' ' + items[i], x + 5, iy + ch - 4);
        }
    }

    // Returns { pw, ph } of a popup with given items
    popupSize(items) {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        const cw  = ctx.measureText('M').width;
        const ch  = this.FONT_H + 4;
        const maxLen = Math.max(...items.map(s => s.length));
        return { pw: (maxLen + 2) * cw + 8, ph: items.length * ch + 8 };
    }

    // ── In-plot messages ─────────────────────────────────────────────────────

    // Show a message in a red bar inside the plot area (top strip)
    showError(msg) {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        const w = ctx.measureText('Error: ' + msg).width + 8;
        ctx.fillStyle = COL.ERR_BG;
        ctx.fillRect(this.px, this.py, w, this.FONT_H + 4);
        ctx.fillStyle = COL.ERR_TX;
        ctx.fillText('Error: ' + msg, this.px + 2, this.py + this.FONT_H);
    }

    showResult(msg) {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        const w = ctx.measureText(msg).width + 8;
        ctx.fillStyle = COL.ERR_BG;
        ctx.fillRect(this.px, this.py, w, this.FONT_H + 4);
        ctx.fillStyle = COL.ERR_TX;
        ctx.fillText(msg, this.px + 2, this.py + this.FONT_H);
    }

    clearTopStrip() {
        const ctx = this.ctx;
        ctx.fillStyle = COL.BG;
        ctx.fillRect(this.px, this.py, this.pw, this.FONT_H + 6);
    }

    // ── Overlay info box ─────────────────────────────────────────────────────

    drawInfoBox(lines, title = 'Info') {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        const cw = ctx.measureText('M').width;
        const ch = this.FONT_H + 4;
        const maxLen = Math.max(title.length, ...lines.map(s => s.length));
        const bw = (maxLen + 4) * cw, bh = (lines.length + 3) * ch;
        const bx = Math.round((this.canvas.width  - bw) / 2);
        const by = Math.round((this.canvas.height - bh) / 2);

        ctx.fillStyle = COL.INFO_BG;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = C[14];
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);

        // Title bar
        const titleX = bx + Math.round((bw - title.length * cw) / 2);
        ctx.fillStyle = C[11];
        ctx.fillRect(bx + 4, by + 4, bw - 8, ch);
        ctx.fillStyle = C[0];
        ctx.fillText(title, titleX, by + 4 + ch - 3);

        ctx.fillStyle = C[0];
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], bx + 12, by + (i + 2) * ch + ch - 3);
        }
    }

    // ── Zoom selector rectangle ───────────────────────────────────────────────

    drawSelector(x, y, x2, y2) {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath(); ctx.rect(this.px, this.py, this.pw, this.ph); ctx.clip();
        ctx.strokeStyle = C[11];
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, x2 - x, y2 - y);
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ── Interactive cursor ────────────────────────────────────────────────────

    drawCursor(cx, cy, label) {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath(); ctx.rect(this.px, this.py, this.pw, this.ph); ctx.clip();
        ctx.strokeStyle = C[11];
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(cx, this.py);
        ctx.lineTo(cx, this.py + this.ph);
        ctx.stroke();
        ctx.setLineDash([]);
        // Small square at function point
        ctx.strokeRect(cx - 4, cy - 4, 8, 8);
        ctx.restore();

        // Coordinate readout in bottom-right of screen
        const W = this.canvas.width, H = this.canvas.height;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        const tw = ctx.measureText(label).width + 4;
        ctx.fillStyle = C[0];
        ctx.fillRect(W - tw - 4, H - this.STATUS_H - 1, tw + 4, this.STATUS_H);
        ctx.fillStyle = C[11];
        ctx.fillText(label, W - tw - 2, H - this.STATUS_H + this.FONT_H - 2);
    }

    clearCursor(cx) {
        // No-op — callers save/restore the plot region instead
    }

    // ── Tangent/secant lines ──────────────────────────────────────────────────

    drawLine(x1, y1, x2, y2, color) {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath(); ctx.rect(this.px, this.py, this.pw, this.ph); ctx.clip();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.wx(x1), this.wy(y1));
        ctx.lineTo(this.wx(x2), this.wy(y2));
        ctx.stroke();
        ctx.restore();
    }

    // ── Canvas save/restore ───────────────────────────────────────────────────

    saveArea(x, y, w, h) {
        return this.ctx.getImageData(x, y, w, h);
    }

    restoreArea(x, y, data) {
        this.ctx.putImageData(data, x, y);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    textAt(text, x, y, color = COL.MENU_TXT) {
        const ctx = this.ctx;
        ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    measureText(s) {
        this.ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        return this.ctx.measureText(s).width;
    }

    charWidth() {
        return Math.ceil(this.measureText('M'));
    }
}
