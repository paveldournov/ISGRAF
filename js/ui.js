// js/ui.js — Async keyboard input primitives

let _keyResolvers = [];

function _handleKeyDown(e) {
    if (_keyResolvers.length > 0) {
        const resolve = _keyResolvers.shift();
        resolve(e);
        e.preventDefault();
    }
}

function attachKeyboard(canvas) {
    canvas.addEventListener('keydown', _handleKeyDown);
}

function waitKey() {
    return new Promise(resolve => _keyResolvers.push(resolve));
}

async function waitAnyKey() {
    await waitKey();
}

async function waitKeys(allowed) {
    while (true) {
        const e = await waitKey();
        if (allowed.includes(e.key)) return e;
    }
}
