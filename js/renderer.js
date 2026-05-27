// js/renderer.js — Canvas-based retro renderer (graph area only)

// VGA 16-color palette
const C = [
    '#000000', // 0  Black
    '#0000AA', // 1  Blue
    '#00AA00', // 2  Green
    '#00AAAA', // 3  Cyan
    '#AA0000', // 4  Red
    '#AA00AA', // 5  Magenta
    '#AA5500', // 6  Brown
    '#AAAAAA', // 7  LightGray
    '#555555', // 8  DarkGray
    '#5555FF', // 9  LightBlue
    '#55FF55', // 10 LightGreen
    '#55FFFF', // 11 LightCyan
    '#FF5555', // 12 LightRed
    '#FF55FF', // 13 LightMagenta
    '#FFFF55', // 14 Yellow
    '#FFFFFF', // 15 White
];

const COL = {
    BG:       C[1],   // Blue — plot background
    AXES:     C[14],  // Yellow
    AXES_OFF: C[4],   // Red
    BORDER:   C[6],   // Brown
    TICK:     C[15],  // White
    LABEL:    C[7],   // LightGray
    GRID:     C[8],   // DarkGray — subtle grid
};

class Renderer {
    constructor() {
        this.canvas = null;
        this.ctx    = null;

        this.FONT_H = 13;

        this.px = 0; this.py = 0;
        this.pw = 0; this.ph = 0;

        this.xMin = -10; this.xMax = 10;
        this.yMin = -10; this.yMax = 10;
        this.scaleX = 1;  this.scaleY = 1;
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
        this.px = 12;
        this.py = 12;
        this.pw = W - 24;
        this.ph = H - 24;
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

    wx(x) { return Math.round(this.px + (x - this.xMin) * this.scaleX); }
    wy(y) { return Math.round(this.py + (this.yMax - y) * this.scaleY); }

    cxToWorld(cx) { return this.xMin + (cx - this.px) / this.scaleX; }
    cyToWorld(cy) { return this.yMax - (cy - this.py) / this.scaleY; }

    // ── Frame & background ───────────────────────────────────────────────────

    drawFrame() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        ctx.fillStyle = C[0];
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = COL.BORDER;
        ctx.lineWidth = 3;
        ctx.strokeRect(9, 9, W - 18, H - 18);
        ctx.lineWidth = 1;
    }

    clearPlot() {
        this.ctx.fillStyle = COL.BG;
        this.ctx.fillRect(this.px, this.py, this.pw, this.ph);
    }

    // ── Axes ─────────────────────────────────────────────────────────────────

    drawAxes() {
        const ctx = this.ctx;
        const { px, py, pw, ph, xMin, xMax, yMin, yMax, scaleX, scaleY } = this;
        if (xMin === xMax || yMin === yMax) return;

        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();
        ctx.lineWidth = 1;

        const hasZeroX = xMin <= 0 && xMax >= 0;
        const hasZeroY = yMin <= 0 && yMax >= 0;

        let axisX = hasZeroX ? this.wx(0) : (xMin < 0 ? px + pw - 2 : px + 2);
        ctx.strokeStyle = hasZeroX ? COL.AXES : COL.AXES_OFF;
        ctx.beginPath();
        ctx.moveTo(axisX, py);
        ctx.lineTo(axisX, py + ph);
        ctx.stroke();

        let axisY = hasZeroY ? this.wy(0) : (yMin < 0 ? py + 2 : py + ph - 2);
        ctx.strokeStyle = hasZeroY ? COL.AXES : COL.AXES_OFF;
        ctx.beginPath();
        ctx.moveTo(px, axisY);
        ctx.lineTo(px + pw, axisY);
        ctx.stroke();

        ctx.font = `${this.FONT_H - 2}px 'Courier New', monospace`;
        const labelY = (axisY > py + ph - 18) ? py + ph - 14 : axisY + 4;
        const labelX = (axisX > px + pw - 55)  ? px + pw - 56  : axisX + 4;

        for (let i = 1; i <= 9; i++) {
            const tx = Math.round(px + pw / 10 * i);
            ctx.strokeStyle = COL.TICK;
            ctx.beginPath(); ctx.moveTo(tx, axisY - 3); ctx.lineTo(tx, axisY + 3); ctx.stroke();
            ctx.fillStyle = COL.LABEL;
            ctx.fillText((xMin + pw / 10 * i / scaleX).toFixed(2), tx - 14, labelY + 12);

            const ty = Math.round(py + ph / 10 * (i - 1));
            ctx.beginPath(); ctx.moveTo(axisX - 3, ty); ctx.lineTo(axisX + 3, ty); ctx.stroke();
            ctx.fillText((yMax - ph / 10 * (i - 1) / scaleY).toFixed(2), labelX, ty + 4);
        }

        ctx.restore();
    }

    // ── Grid ─────────────────────────────────────────────────────────────────

    drawGrid() {
        const ctx = this.ctx;
        const { px, py, pw, ph } = this;
        ctx.save();
        ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
        ctx.strokeStyle = COL.GRID;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
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

    // ── Function plotting ─────────────────────────────────────────────────────

    plotFunction(evalFn, color, isPolar = false) {
        const ctx = this.ctx;
        const { px, py, pw, ph, xMin, xMax, yMin, yMax } = this;

        ctx.save();
        ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        let penDown = false;
        let prevCx = 0, prevCy = 0;
        let tStart, tEnd, step;

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

            if (wx < xMin || wx > xMax || wy < yMin || wy > yMax) { penDown = false; continue; }

            const cx = Math.round(px + (wx - xMin) * this.scaleX);
            const cy = Math.round(py + (yMax - wy) * this.scaleY);

            if (penDown && Math.abs(cy - prevCy) > ph / 4) {
                if (discontinuities.length < 8) discontinuities.push(wx);
                penDown = false;
            }
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

    // ── Interactive cursor ────────────────────────────────────────────────────

    drawCursor(cx, cy) {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath(); ctx.rect(this.px, this.py, this.pw, this.ph); ctx.clip();
        ctx.strokeStyle = C[11];
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, this.py);
        ctx.lineTo(cx, this.py + this.ph);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeRect(cx - 4, cy - 4, 8, 8);
        ctx.restore();
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

    // ── Zoom selector ─────────────────────────────────────────────────────────

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

    // ── Canvas save/restore ───────────────────────────────────────────────────

    saveArea(x, y, w, h)    { return this.ctx.getImageData(x, y, w, h); }
    restoreArea(x, y, data) { this.ctx.putImageData(data, x, y); }

    // ── Helpers ───────────────────────────────────────────────────────────────

    measureText(s) {
        this.ctx.font = `${this.FONT_H}px 'Courier New', monospace`;
        return this.ctx.measureText(s).width;
    }
}
