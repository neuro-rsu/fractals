import { FractalElement, html, css } from './lit-fractal.js';

import '../components/layout-app/layout-app.js';
import '../components/property-grid/property-grid.js';
import '../components/button/button.js';
import { data, saveData, restoreData } from '../db/indexed-db.js';
import { defaultData } from '../db/default-data.js';
import { ulid } from './utils.js';

let url = import.meta.url;

customElements.define('lit-fractal', class LitFractal extends FractalElement {
    static get properties() {
        return {
            _id: { type: String, default: '00000000000000000000000000', category: 'actions', save: true },
            name: { type: String, default: 'lit-fractal', category: 'actions', save: true },
            animation: { type: Boolean, category: 'actions' },
            inverse: { type: Boolean, category: 'actions' },
            x: { type: Number, default: 0, category: 'offset' },
            y: { type: Number, default: 0, category: 'offset' },
            orientation: { type: Number, default: 0, category: 'offset' },
            levels: { type: Number, default: 0, category: 'params' },
            sizeValue: { type: Number, default: 0, category: 'params' },
            angleValue: { type: Number, default: 0, category: 'params' },
            rules: { type: Object, category: 'params' },
            symbols: { type: Object, default: { 'F': 'F', '+': '+', '-': '-', '[': '[', ']': ']', '|': '|', '!': '!', '<': '<', '>': '>', '(': '(', ')': ')' }, category: 'params' },
            extSymbols: { type: String, default: '', category: 'params' },
            rotate: { type: Number, default: 0, category: 'params' },
            lineWidth: { type: Number, default: 0.218, category: 'variables' },
            lineColor: { type: String, default: 'black', category: 'variables', list: ['red', 'blue', 'green', 'orange', 'lightblue', 'lightgreen', 'lightyellow', 'yellow', 'darkgray', 'gray', 'darkgray', 'lightgray', 'white', 'black'] },
            colorStep: { type: Number, default: 0, category: 'variables' },
            depth: { type: Number, default: 0, category: 'variables' },
            sizeGrowth: { type: Number, default: 0, category: 'variables' },
            angleGrowth: { type: Number, default: 0, category: 'variables' },
            speed: { type: Number, default: 1, category: 'variables' },
            // sensSizeValue: { type: Number, default: 0, category: 'animation' },
            // sensSizeGrowth: { type: Number, default: 0, category: 'animation' },
            // sensAngleValue: { type: Number, default: 0, category: 'animation' },
            // sensAngleGrowth: { type: Number, default: 0, category: 'animation' }
            categories: { type: Array, default: ['actions', 'offset', 'params', 'variables'] }
        }
    }

    constructor() {
        super();
        (this.constructor.elementProperties || this.constructor._classProperties).get('name').list = Object.keys(data) || [];
    }

    firstUpdated() {
        super.firstUpdated();
        this._sign = 1;
        this.canvas = this.$refs('canvas');
        this.ctx = this.canvas.getContext('2d');
        this._location = window.location.href;
        this._symbolsDefault = this.symbols;
        this._id = Object.keys(data)[0];
        this.getCommands(this._id, true);
    }

    updated(changedProperties) {
        if (this._isReady) {
            let update = false;
            changedProperties.forEach((oldValue, propName) => update = [
                'name', 'animation', 'inverse', 'orientation', 'sizeValue', 'sizeGrowth', 'angleValue', 'angleGrowth', 'lineWidth',
                'lineColor', 'levels', 'rules', 'symbols', 'x', 'y', 'depth', 'speed', 'colorStep', 'extSymbols', 'rotate'
            ].includes(propName));
            if (changedProperties.has('inverse')) {
                this.canvas.style.background = this.inverse ? 'black' : 'white';
                this.lineColor = this.inverse ? 'white' : 'black';
            }
            if (changedProperties.has('extSymbols')) {
                const o = {};
                if (this.extSymbols) {
                    this.extSymbols.split(',').forEach(i => {
                        i = i.split(':');
                        o[i[0]] = i[1];
                    })
                }
                this.symbols = { ...o, ...this._symbolsDefault };
            }
            if (changedProperties.has('_id')) {
                this._refreshPage();
                this.getCommands(this._id, true);
            }
            else if (changedProperties.has('levels') || changedProperties.has('rules') || changedProperties.has('extSymbols')) {
                this.getCommands();
            } else if (changedProperties.has('animation') && this.animation) {
                this.loop(true);
            } else if (changedProperties.has('rotate') && !this.animation) {
                this.rotate = Number(this.rotate);
                this.loop();
            } else if (update && !this.animation) {
                this.loop();
            }
        }
    }

    save() {
        let newData = new URLSearchParams();
        newData.set("name", encodeURIComponent(this.name));
        newData.set("i", this.levels);
        newData.set("r", encodeURIComponent(this.rules));
        newData.set("p.size", `${this.sizeValue},${this.sizeGrowth}`);
        newData.set("p.angle", `${this.angleValue},${this.angleGrowth}`);
        newData.set("s.size", `${this.sensSizeValue},${this.sensSizeGrowth}`);
        newData.set("s.angle", `${this.sensAngleValue},${this.sensAngleGrowth}`);
        newData.set("offsets", `${this.x},${this.y},${this.orientation}`);
        newData.set("w", this.lineWidth);
        newData.set("c", this.lineColor);
        newData.set("cstep", this.colorStep);
        newData.set("depth", this.depth);
        newData.set("speed", this.speed);
        newData.set("rotate", this.rotate);
        newData.set("animation", this.animation);
        newData.set("inverse", this.inverse);
        newData.set("sign", this._sign);
        if (this.extSymbols) {
            newData.set("s", encodeURIComponent(this.extSymbols));
        }
        const oldName = (new URLSearchParams(data[this._id])).get("name");
        data[this._id] = decodeURIComponent(newData.toString());
        saveData();
        if (this.name !== oldName)
            this.getCommands(this._id, true);
    }

    add() {
        const newData = new URLSearchParams();
        newData.set("name", encodeURIComponent(this.name));
        newData.set("i", this.levels);
        newData.set("r", encodeURIComponent(this.rules));
        newData.set("p.size", `${this.sizeValue},${this.sizeGrowth}`);
        newData.set("p.angle", `${this.angleValue},${this.angleGrowth}`);
        newData.set("s.size", `${this.sensSizeValue},${this.sensSizeGrowth}`);
        newData.set("s.angle", `${this.sensAngleValue},${this.sensAngleGrowth}`);
        newData.set("offsets", `${this.x},${this.y},${this.orientation}`);
        newData.set("w", this.lineWidth);
        newData.set("c", this.lineColor);
        newData.set("cstep", this.colorStep);
        newData.set("depth", this.depth);
        newData.set("speed", this.speed);
        newData.set("rotate", this.rotate);
        newData.set("animation", this.animation);
        newData.set("inverse", this.inverse);
        newData.set("sign", this._sign);
        if (this.extSymbols) {
            newData.set("s", encodeURIComponent(this.extSymbols));
        }
        const newId = ulid();
        data[newId] = decodeURIComponent(newData.toString());
        this._id = newId;
        //saveData();
    }

    delete() {
        const dataId = Object.keys(data);
        if (dataId.length === 1) {
            return;
        }
        const index = dataId.indexOf(this._id);
        this._id = index === dataId.length - 1 ? dataId[index - 1] : dataId[index + 1]
        delete data[dataId[index]];
        saveData();
    }

    restore() {
        restoreData();
        this._id = "";
    }

    static get styles() {
        return css`
            .header {
                font-size: xx-large;
                font-weight: 600;
            }
            canvas {
                cursor: pointer;
            }
            img {
                max-width: 64px;
                max-height: 64px;
                padding: 4px;
                cursor: pointer;
            }
        `;
    }
                    // <fractal-button name="play-arrow" rotate=180 @click="${() => { this._sign = -1; this.animation = !this.animation; this.$update() }}"></fractal-button>
                    // <fractal-button name="play-arrow" @click="${() => { this._sign = 1; this.animation = !this.animation; this.$update() }}"></fractal-button>
                    // <fractal-button name="chevron-left" @click="${() => { this.rotate -= Number(this.speed) }}"></fractal-button>
                    // <fractal-button name="chevron-right" @click="${() => { this.rotate += Number(this.speed) }}"></fractal-button>
    render() {
        return html`
            <layout-app sides="300,300,1,1" fill="#9f731350">
                <div slot="app-top-left">
                    <fractal-button name="restore" @click="${this.restore}" title="Restore DB"></fractal-button>
                </div>
                <div slot="app-top" class="header"><a target="_blank" href="https://ru.wikipedia.org/wiki/L-%D1%81%D0%B8%D1%81%D1%82%D0%B5%D0%BC%D0%B0">Мандельброт 2025</a></div>
                <div slot="app-top">[${this._length}]</div>
                <div slot="app-top-right">
                    <fractal-button name="undo" @click="${() => this.getCommands(this._id, true)}" title="undo changes"></fractal-button>
                    <fractal-button name="refresh" @click="${() => this.getCommands(this._id, true, true)}" title="refresh params"></fractal-button>
                    <fractal-button name="launch" @click="${this.toUrl}" title="Open in new window"></fractal-button>
                    <fractal-button name="add" @click="${this.add}" title="Add fractal"></fractal-button>
                    <fractal-button name="save" @click="${this.save}" title="Save fractal"></fractal-button>
                    <fractal-button name="delete" @click="${this.delete}" title="Delete fractal"></fractal-button>
                </div>
                <div slot="app-left" style="padding-left:4px;display:flex;flex-direction:column;">
                    ${Object.keys(data).map(id => html`
                        <fractal-button back="${this._id === id ? '#e0e0e0' : ''}" width="100%" .label="${(new URLSearchParams(data[id])).get("name")}" @click="${() => this._id = id}"></fractal-button>
                    `)}
                </div>
                <canvas ref="canvas" slot="app-main" width="${innerWidth}" height="${innerHeight}" @mousedown="${(e) => { this._sign = e.which === 1 ? 1 :-1; this.animation = true;  e.preventDefault();}}" @mouseup="${(e) => {this.animation = false; console.log(111);e.preventDefault();}}"
                        @touchstart="${() => { this.animation = true; this.$update() }}" @touchend="${() => { this.animation = false; this.$update() }}"></canvas>
                <property-grid slot="app-right" .label="${this.name}" .io="${this}" .categories="${this.categories}" .showButtons="${false}"></property-grid>
            </layout-app>
        `
    }

    getCommands(id = this._id, undoData = false, refreshData = false) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this._isReady = false;
        if (this._isGetCommands) return;
        this._isGetCommands = true;

        if (undoData) {
            let s = refreshData ? defaultData[id] || Object.values(defaultData)[0] : data[id] || Object.values(data)[0];
            this.rotate = 0;
            let _s = this._location.split('?')[1];
            if (_s && !this._isReady) {
                if (data[_s]) {                                                                                 // pollenanate  || tree || re-coil || ...
                    s = data[_s];
                } else if (_s?.includes('p.size') && _s?.includes('p.angle') && _s?.split('&').length >= 4) {   // ...i=30...&r=...&p.size=0,0...&p.angle=0,0...
                    s = _s;
                } else if (_s.split('=').length === 2) {                                                        // spirograph=210
                    let arr = _s.split('=');
                    let val = arr[0].replace(/\s/g, '');
                    if (data[val]) {
                        this.rotate = Number(arr[1]) || 0;
                        s = data[val];
                    }
                }
            }
            this.fromUrl(s);
        }

        this.textRules = [];
        this.rules.replace(/\s|\n/g, '').split(",").forEach((r) => { if (r.includes(':')) this.textRules.push(r.split(':')) });
        this.seed = this.textRules[0][0];
        this.ruleMap = {};
        this.textRules.forEach(r => this.ruleMap[r[0]] = r[1]);
        this._commands = this.makeCommands(this.levels, this.seed, '', 0, 0, 400000);
        this.commands = []
        this._commands.split('').forEach(c => {
            c = this.symbols[c];
            if (c && Object.keys(this.symbols).includes(c)) this.commands.push(c);
        })
        this._length = this.commands.length;
        setTimeout(() => {
            this._isReady = true;
            this.loop(true);
        }, 100);
        this.$update();
    }

    makeCommands(levelNum, levelExpr, acc, start, processed, count) {
        var end, i, reachesEndOfLevel, remaining, symbol;
        while (processed < count) {
            if (levelNum === 0) return levelExpr;
            remaining = count - processed;
            reachesEndOfLevel = remaining >= (levelExpr.length - start);
            if (reachesEndOfLevel) remaining = levelExpr.length - start;
            i = start;
            end = start + remaining;
            while (i < end) {
                symbol = levelExpr[i];
                acc += this.ruleMap[symbol] || symbol;
                i++;
            }
            processed += remaining;
            start += remaining;
            if (reachesEndOfLevel) {
                levelNum--;
                levelExpr = acc;
                acc = '';
                start = 0;
            }
        }
        return levelExpr;
    }

    fromUrl(url) {
        if (!url) return;
        const convertor = {
            'name': v => { this.name = decodeURIComponent(v || 'lit-fractal') },
            'i': v => { this.levels = parseInt(v) },
            'r': v => { this.rules = decodeURIComponent(v.replaceAll('%0A', ', ')) },
            'p.size': v => { this.sizeValue = parseFloat(v[0] ? v[0] : 0); this.sizeGrowth = parseFloat(v[1] ? v[1] : 0.01) },
            'p.angle': v => { this.angleValue = parseFloat(v[0] ? v[0] : 0); this.angleGrowth = parseFloat(v[1] ? v[1] : 0.05) },
            's.size': v => { this.sensSizeValue = parseFloat(v[0] ? v[0] : 0); this.sensSizeGrowth = parseFloat(v[1] ? v[1] : 0.01) },
            's.angle': v => { this.sensAngleValue = parseFloat(v[0] ? v[0] : 0); this.sensAngleGrowth = parseFloat(v[1] ? v[1] : 0.05) },
            'offsets': v => { this.x = parseFloat(v[0] ? v[0] : 0); this.y = parseFloat(v[1] ? v[1] : 0); this.orientation = parseFloat(v[2] ? v[2] : 0); },
            'w': v => { this.lineWidth = parseFloat(v || 0.218) },
            'c': v => { this.lineColor = v || 'black' },
            'cstep': v => { this.colorStep = parseFloat(v) },
            'depth': v => { this.depth = parseFloat(v) },
            'speed': v => { this.speed = parseFloat(v) },
            's': v => {
                const s = decodeURIComponent(v);
                this.extSymbols = s;
                const o = {};
                s.split(',').forEach(i => {
                    i = i.split(':');
                    o[i[0]] = i[1];
                })
                this.symbols = { ...o, ...this._symbolsDefault };
            },
            'rotate': v => { this.rotate = parseFloat(v) },
            'animation': v => { this.animation = v === 'true' ? true : false },
            'inverse': v => {
                this.inverse = v === 'true' ? true : false
                this.canvas.style.background = this.inverse ? 'black' : 'white';
                this.lineColor = this.inverse ? 'white' : 'black';
            },
            'sign': v => { this._sign = parseFloat(v) },
        }
        this.lineWidth = 0.218;
        this.x = this.y = 0;
        this.orientation = -90;
        this.sizeValue = this.angleValue = this.sensSizeValue = this.sensAngleValue = 0;
        this.lineColor = 'black';
        this.colorStep = this.depth = 0;
        this.speed = 1;
        this.extSymbols = '';
        this.inverse = false;
        this.canvas.style.background = 'white';
        this.lineColor = 'black';
        this.animation = false;
        this.symbols = { ...[], ...this._symbolsDefault };
        const d = url.split('&');
        d.map(p => {
            let v = p.split('=')
            if (['p.size', 'p.angle', 's.size', 's.angle', 'offsets'].includes(v[0]))
                v[1] = v[1].split(',');
            if (convertor[v[0]])
                convertor[v[0]](v[1]);
        })
    }

    toUrl() {
        const newData = new URLSearchParams();
        newData.set("name", encodeURIComponent(this.name));
        newData.set("i", String(this.levels));
        newData.set("r", encodeURIComponent(this.rules));
        newData.set("p.size",`${this.sizeValue},${this.sizeGrowth}`);
        newData.set("p.angle", `${this.angleValue},${this.angleGrowth}`);
        newData.set("s.size", `${this.sensSizeValue},${this.sensSizeGrowth}`);
        newData.set("s.angle", `${this.sensAngleValue},${this.sensAngleGrowth}`);
        newData.set("offsets", `${this.x},${this.y},${this.orientation}`);
        newData.set("w", this.lineWidth);
        newData.set("c", this.lineColor);
        newData.set("cstep", this.colorStep);
        newData.set("depth", this.depth);
        newData.set("speed", this.speed);
        newData.set("rotate", this.rotate);
        newData.set("animation", this.animation);
        newData.set("inverse", this.inverse);
        newData.set("sign", this._sign);
        if (this.extSymbols)
            newData.set("s", encodeURIComponent(this.extSymbols));
        const url = this.$url.replace('js/fractal.js', '?' + decodeURIComponent(newData.toString()));
        navigator.clipboard.writeText(url);
        window.open(url, '_blank')?.focus();
        return url;
    }

    _refreshPage(sure = false) {
        if (!this._isReady) return;
        const url = this.$url.replace('js/fractal.js', 'index.html');
        if (sure)
            window.location.href = url;
        else
            this._location = url;
    }

    get state() {
        return {
            levels: Number(this.levels),
            orientation: Number(this.orientation),
            stepSize: Number(this.sizeValue),
            stepAngle: Number(this.angleValue),
            sizeGrowth: Number(this.sizeGrowth),
            angleGrowth: Number(this.angleGrowth),
            lineWidth: Number(this.lineWidth),
            lineColor: this.lineColor,
            x: innerWidth / 2 + Number(this.x),
            y: innerHeight / 2 + Number(this.y),
            sensSizeValue: Math.pow(10, (this.sensSizeValue || 7.7) - 10) * this.depth,
            sensSizeGrowth: Math.pow(10, (this.sensSizeGrowth || 7.53) - 10) * this.depth,
            sensAngleValue: Math.pow(10, (this.sensAngleValue || 7.6) - 10) * this.depth,
            sensAngleGrowth: Math.pow(10, (this.sensAngleGrowth || 4) - 10) * this.depth,
            animation: this.animation,
            colorStep: this.colorStep
        }
    }

    loop(sure = false) {
        if (!this._isReady || (!sure && this.animation)) return;
        draw(this.state, this.commands, this.ctx, this.rotate);
        this._isGetCommands = false;
        if (this.animation) {
            this.rotate += this.speed * this._sign;
            requestAnimationFrame(this.loop.bind(this));
        } else {
            this.$update();
        }
    }
});

function draw(state, commands, ctx, rotate) {
    const cmd = {
        'F': () => {
            const ang = ((state.orientation % 360) / 180) * Math.PI;
            state.x += Math.cos(ang) * state.stepSize;
            state.y += Math.sin(ang) * state.stepSize;
            ctx.lineTo(state.x, state.y);
        },
        'S': () => { },
        '+': () => { state.orientation += (state.stepAngle + rotate + state.sensAngleValue) },
        '-': () => { state.orientation -= (state.stepAngle - rotate - state.sensAngleValue) },
        '[': () => { context.stack.push({ orientation: state.orientation, stepAngle: state.stepAngle, stepSize: state.stepSize, x: state.x, y: state.y }) },
        ']': () => {
            context.state = state = { ...state, ...context.stack.pop() };
            ctx.moveTo(state.x, state.y);
        },
        '|': () => { state.orientation += 180 },
        '!': () => { state.stepAngle *= -1 },
        '<': () => { state.stepSize *= 1 + state.sizeGrowth + state.sensSizeGrowth },
        '>': () => { state.stepSize *= 1 - state.sizeGrowth - state.sensSizeGrowth },
        '(': () => { state.stepAngle *= 1 - state.angleGrowth - state.sensAngleGrowth },
        ')': () => { state.stepAngle *= 1 + state.angleGrowth + state.sensAngleGrowth }
    }
    const context = { stack: [] };
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = state.colorStep ? `hsla(${rotate * state.colorStep},50%, 50%, .8)` : state.lineColor;
    ctx.lineWidth = state.lineWidth;
    ctx.beginPath();
    ctx.moveTo(state.x, state.y);
    commands.forEach(c => { cmd[c]() });
    ctx.stroke();
}
