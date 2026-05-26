// js/mathEngine.js — Port of FUNC.PAS
// Binary expression tree parser, evaluator, differentiator
// Original algorithm: Dournov P.A., VoGTU 1992

class MathEngine {
    constructor() {
        // Operator scan order: lowest precedence first
        // Matches FUNC.PAS enum: pl,mn,rz,um,step,sins,lon,lod,lo2,tg,coss
        this.SCAN_ORDER = [
            { sym: '+',   len: 1 },
            { sym: '-',   len: 1 },
            { sym: '/',   len: 1 },
            { sym: '*',   len: 1 },
            { sym: '^',   len: 1 },
            { sym: 'SIN', len: 3 },
            { sym: 'LN',  len: 2 },
            { sym: 'LG',  len: 2 },
            { sym: 'LOG', len: 3 },
            { sym: 'TG',  len: 2 },
            { sym: 'COS', len: 3 },
        ];
        this.UNARY = new Set(['SIN', 'COS', 'TG', 'LN', 'LG', 'LOG']);

        // Stored functions (1-indexed, slots 1..10)
        this.funcs = new Array(12).fill(null);

        // Variable bindings — E and P are constants like in original
        this.vars = { E: Math.E, P: Math.PI };

        this.error = 0;
    }

    // ── Preprocessing ──────────────────────────────────────────────────────

    preprocess(str) {
        str = str.toUpperCase().replace(/\s+/g, '');
        // Insert implicit 0 before leading minus: -x→0-x, (-x→(0-x
        let r = '';
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '-' && (i === 0 || str[i-1] === '(')) r += '0';
            r += str[i];
        }
        return r;
    }

    // ── Tree building ───────────────────────────────────────────────────────

    // Index of ')' matching '(' at pos
    _matchParen(str, pos) {
        let depth = 1, i = pos + 1;
        while (i < str.length && depth > 0) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') depth--;
            i++;
        }
        return i - 1;
    }

    _stripOuter(str) {
        while (str.length >= 2 && str[0] === '(' && str[str.length-1] === ')') {
            if (this._matchParen(str, 0) === str.length - 1)
                str = str.slice(1, -1);
            else break;
        }
        return str;
    }

    // Find leftmost top-level operator, scanning by precedence (lowest first)
    _findOp(str) {
        for (const op of this.SCAN_ORDER) {
            let i = 0;
            while (i < str.length) {
                if (str[i] === '(') { i = this._matchParen(str, i) + 1; continue; }
                if (str.startsWith(op.sym, i)) return { pos: i, sym: op.sym, len: op.len };
                i++;
            }
        }
        return null;
    }

    _build(str) {
        if (this.error) return null;
        str = this._stripOuter(str);
        if (!str) { this.error = 5; return null; }

        const op = this._findOp(str);
        if (!op || this.error) return { sym: str, ul: null, ur: null };

        const node = { sym: op.sym, ul: null, ur: null };
        if (this.UNARY.has(op.sym)) {
            node.ul = this._build(str.slice(op.pos + op.len));
        } else {
            node.ul = this._build(str.slice(0, op.pos));
            node.ur = this._build(str.slice(op.pos + op.len));
        }
        return node;
    }

    // ── Evaluation ──────────────────────────────────────────────────────────

    _power(a, b) {
        if (a === 0) return 0;
        if (Math.abs(a - 1) < 1e-10) return 1;
        if (Number.isInteger(b)) {
            const r = Math.exp(b * Math.log(Math.abs(a)));
            return (b % 2 !== 0) ? Math.sign(a) * r : r;
        }
        if (a > 0) return Math.exp(b * Math.log(a));
        this.error = 1;
        return 0;
    }

    _eval(node) {
        if (this.error || !node) { if (!node) this.error = 1; return 0; }
        const s = node.sym;

        switch (s[0]) {
            case '+': return this._eval(node.ul) + this._eval(node.ur);
            case '-': return this._eval(node.ul) - this._eval(node.ur);
            case '*': return this._eval(node.ul) * this._eval(node.ur);
            case '/': {
                const d = this._eval(node.ur);
                if (d === 0) { this.error = 2; return 0; }
                return this._eval(node.ul) / d;
            }
            case '^': {
                const base = this._eval(node.ul), exp = this._eval(node.ur);
                if (this.error) return 0;
                return this._power(base, exp);
            }
            case 'S': return Math.sin(this._eval(node.ul));
            case 'C': return Math.cos(this._eval(node.ul));
            case 'T': {
                const a = this._eval(node.ul);
                const k = (a - Math.PI/2) / Math.PI;
                if (Math.abs(Math.abs(a) - Math.PI/2) < 0.001 ||
                    Math.abs(k - Math.trunc(k)) < 0.001) {
                    this.error = 6; return 0;
                }
                return Math.sin(a) / Math.cos(a);
            }
            case 'L': {
                const a = this._eval(node.ul);
                if (a <= 1e-30) { this.error = 3; return 0; }
                if (s[1] === 'N') return Math.log(a);
                if (s[1] === 'G') return Math.log10(a);
                return Math.log2(a);
            }
            default: {
                const n = parseFloat(s);
                if (!isNaN(n)) return n;
                if (s.length === 1 && s >= 'A' && s <= 'Z') return this.vars[s] ?? 0;
                this.error = 7; return 0;
            }
        }
    }

    // ── Tree → String ───────────────────────────────────────────────────────

    _str(node) {
        if (!node || this.error) return '';
        if (!node.ul) return node.sym;
        if (!node.ur) return node.sym + '(' + this._str(node.ul) + ')';
        const s = node.sym;
        const needP = (s === '*' || s === '/' || s === '^');
        const ls = (needP && node.ul.ur !== null) ? '(' + this._str(node.ul) + ')' : this._str(node.ul);
        const rs = (needP && node.ur.ur !== null) ? '(' + this._str(node.ur) + ')' : this._str(node.ur);
        return ls + s + rs;
    }

    // ── Clone / helper constructors ─────────────────────────────────────────

    _clone(node) {
        if (!node) return null;
        return { sym: node.sym, ul: this._clone(node.ul), ur: this._clone(node.ur) };
    }

    _node(sym, ul = null, ur = null) { return { sym, ul, ur }; }

    // ── Symbolic differentiation ────────────────────────────────────────────

    _diff(node, v) {
        if (this.error || !node) return this._node('0');
        const s = node.sym;

        switch (s[0]) {
            case '+': case '-':
                return this._node(s, this._diff(node.ul, v), this._diff(node.ur, v));

            case '*':   // (uv)' = u'v + uv'
                return this._node('+',
                    this._node('*', this._diff(node.ul, v), this._clone(node.ur)),
                    this._node('*', this._clone(node.ul), this._diff(node.ur, v)));

            case '/':   // (u/v)' = (u'v − uv') / v²
                return this._node('/',
                    this._node('-',
                        this._node('*', this._diff(node.ul, v), this._clone(node.ur)),
                        this._node('*', this._clone(node.ul), this._diff(node.ur, v))),
                    this._node('^', this._clone(node.ur), this._node('2')));

            case '^':   // (u^v)' = u^v*(v'*ln(u) + (v/u)*u')
                return this._node('*',
                    this._node('^', this._clone(node.ul), this._clone(node.ur)),
                    this._node('+',
                        this._node('*', this._diff(node.ur, v),
                            this._node('LN', this._clone(node.ul))),
                        this._node('*',
                            this._node('/', this._clone(node.ur), this._clone(node.ul)),
                            this._diff(node.ul, v))));

            case 'S':   // sin(u)' = cos(u)*u'
                return this._node('*',
                    this._node('COS', this._clone(node.ul)),
                    this._diff(node.ul, v));

            case 'C':   // cos(u)' = (0-sin(u))*u'
                return this._node('*',
                    this._node('-', this._node('0'), this._node('SIN', this._clone(node.ul))),
                    this._diff(node.ul, v));

            case 'T':   // tg(u)' = u'/cos²(u)
                return this._node('/',
                    this._diff(node.ul, v),
                    this._node('^', this._node('COS', this._clone(node.ul)), this._node('2')));

            case 'L': { // ln(u)'=u'/u  lg(u)'=u'/(ln10*u)  log2(u)'=u'/(ln2*u)
                const du = this._diff(node.ul, v);
                if (s[1] === 'N') return this._node('/', du, this._clone(node.ul));
                const lnBase = s[1] === 'G' ? String(Math.log(10)) : String(Math.log(2));
                return this._node('/', du,
                    this._node('*', this._node(lnBase), this._clone(node.ul)));
            }

            default: {
                const n = parseFloat(s);
                if (!isNaN(n)) return this._node('0');
                return s === v ? this._node('1') : this._node('0');
            }
        }
    }

    // ── Simplification ──────────────────────────────────────────────────────

    _eq(a, b) { return this._str(a) === this._str(b); }

    _simplify(node) {
        if (!node || !node.ul) return node;
        if (node.ul.ul) node.ul = this._simplify(node.ul);
        if (node.ur && node.ur.ul) node.ur = this._simplify(node.ur);

        const s = node.sym, L = node.ul, R = node.ur;

        if (s === '+') {
            if (L.sym === '0') { Object.assign(node, R); return node; }
            if (R && R.sym === '0') { Object.assign(node, L); return node; }
            if (R && this._eq(L, R)) {
                // x+x → 2*x: reuse left child node, change its sym to '2'
                node.sym = '*';
                node.ul.sym = '2'; node.ul.ul = null; node.ul.ur = null;
                // node.ur already holds R (= copy of x)
            }
        } else if (s === '-') {
            if (R && R.sym === '0') { Object.assign(node, L); return node; }
            if (R && this._eq(L, R)) { node.sym = '0'; node.ul = null; node.ur = null; }
        } else if (s === '*') {
            if (L.sym === '0') { Object.assign(node, L); return node; }
            if (R && R.sym === '0') { Object.assign(node, R); return node; }
            if (L.sym === '1') { Object.assign(node, R); return node; }
            if (R && R.sym === '1') { Object.assign(node, L); return node; }
            if (R && this._eq(L, R)) { node.sym = '^'; node.ul = this._clone(L); node.ur = this._node('2'); }
        } else if (s === '/') {
            if (L.sym === '0') { Object.assign(node, L); return node; }
            if (R && this._eq(L, R)) { node.sym = '1'; node.ul = null; node.ur = null; }
        } else if (s === '^') {
            if (L.sym === '0' || L.sym === '1') { Object.assign(node, L); return node; }
            if (R && R.sym === '0') { node.sym = '1'; node.ul = null; node.ur = null; }
            else if (R && R.sym === '1') { Object.assign(node, L); return node; }
        }

        return node;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    // Parse expression str and store as function n (1–10). Returns error code.
    parse(str, n) {
        this.error = 0;
        const processed = this.preprocess(str);
        if (!processed) { this.error = 7; return 7; }
        const tree = this._build(processed);
        if (!this.error && tree) this.funcs[n] = this._simplify(tree);
        return this.error;
    }

    // Evaluate stored function n with current vars. Returns number or null.
    evaluate(n) {
        this.error = 0;
        if (!this.funcs[n]) { this.error = 8; return null; }
        const r = this._eval(this.funcs[n]);
        return this.error === 0 ? r : null;
    }

    // Compute symbolic derivative of func n, store as func m.
    differentiate(n, m, variable) {
        this.error = 0;
        if (!this.funcs[n]) { this.error = 8; return; }
        if (n === m) return;
        const deriv = this._diff(this.funcs[n], variable.toUpperCase());
        if (!this.error) this.funcs[m] = this._simplify(deriv);
    }

    // Get infix string for func n.
    toString(n) {
        this.error = 0;
        if (!this.funcs[n]) { this.error = 8; return ''; }
        return this._str(this.funcs[n]).replace(/[\x00-\x1F]/g, '');
    }

    // Shift functions down to close gap left by deleting index n.
    shiftDown(n, total) {
        for (let i = n; i < total; i++) this.funcs[i] = this.funcs[i + 1];
        this.funcs[total] = null;
    }

    del(n)       { this.funcs[n] = null; }
    copy(n, m)   { this.funcs[m] = this._clone(this.funcs[n]); }
    setVar(k, v) { this.vars[k.toUpperCase()] = v; }
    getError()   { return this.error; }

    errorMsg(code) {
        return [
            'OK',
            'Bad expression tree',
            'Division by zero',
            'Logarithm domain error',
            'Expression too long',
            'Syntax error',
            'Tan undefined here',
            'Undefined result',
            'Function not defined',
        ][code] ?? 'Unknown error';
    }
}
