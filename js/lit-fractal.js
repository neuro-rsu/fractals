// lit: 2.0.0
import { LitElement } from 'https://unpkg.com/lit@2.0.0/index.js?module';
export * from 'https://unpkg.com/lit@2.0.0/index.js?module';
export { styleMap } from 'https://unpkg.com/lit@2.0.0/directives/style-map.js?module';
export { unsafeHTML } from 'https://unpkg.com/lit@2.0.0/directives/unsafe-html.js?module';

import { ulid, decodeTime } from './utils.js';
import './icaro.js';

const urlFRACTAL = import.meta.url;

document.addEventListener('mousedown', (e) => FRACTAL.mousePos = new DOMRect(e.pageX, e.pageY));
if (!window.FRACTALRect) {
    window.FRACTALRect = function(element) {
        if (element && element.host) element = element.host;
        const pos = element ? element.getBoundingClientRect() : FRACTAL.mousePos;
        return pos ? {
            ok: true, x: pos.x, y: pos.y,
            top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right,
            width: pos.width, height: pos.height
        } : { ok: false };
    }
}

export class FractalElement extends LitElement {
    constructor() {
        super();

        this.$properties = this.constructor.elementProperties || this.constructor._classProperties;
        for (const k of this.$properties.keys()) {
            const prop = this.$properties.get(k)
            if (prop?.save) {
                this.__saves = this.__saves || [];
                this.__saves.push(k);
            }
            if (prop?.local) {
                this.__locals = this.__locals || [];
                this.__locals.push(k);
            }
            if (prop?.global) {
                this.__globals = this.__globals || [];
                this.__globals.push(k);
            }
            if (prop?.notify) {
                this.__notifications = this.__notifications || new Map();
                let name = typeof prop.notify !== 'string' ? `${k}-changed` : prop.notify;
                this.__notifications.set(k, name);
            }
            if (prop?.default !== undefined) this[k] = prop.default;
        }
        const name = this.localName.replace('lit-', '');
        this.$url = `${urlFRACTAL.replace('lit-fractal.js', '')}${name}.js`;
        console.log(this.$url);
        console.log(urlFRACTAL);

        this.$ulid = this.$ulid || FRACTAL.ulid();
        if (this._useInfo) this.$urlInfo = `${urlFRACTAL.replace('lit-fractal.js', '')}/${name}/$info/$info.js`;
    }
    connectedCallback() {
        super.connectedCallback();
        this._initBus();
        if (this.$$) {
            this.$$.update.listen(this.fnUpdate);
        }
        if (this.$$ && this.__saves) {
            this.__saves.forEach(i => {
                const v = JSON.parse(localStorage.getItem(this._saveFileName));
                if (v) this.$$[i] = this.$$[i] = this[i] = v[this.localName + '.' + i];
            });
            this.__enableSave = true;
        }
        if (this.$$ && this.__locals) {
            this.$$.listen(this.fnLocals);
            this.__locals.forEach(i => {
                if (this.$$[i] === undefined) this.$$[i] = this[i];
                else this[i] = this.$$[i];
            });

        }
        if (this.$$ && this.__globals) {
            FRACTAL.$$.listen(this.fnGlobals);
            this.__globals.forEach(i => {
                if (FRACTAL.$$[i] === undefined) FRACTAL.$$[i] = this[i];
                else this[i] = FRACTAL.$$[i];
            });

        }
        this._partid = this.$partid || this._partid || this.partid;
        // this.$$.__update = this.$$.__changed = 0;
    }
    disconnectedCallback() {
        if (this.$$?.update) this.$$.update.unlisten(this.fnUpdate);
        if (this.$$ && this.__locals) this.$$.unlisten(this.fnLocals);
        if (FRACTAL.$$ && this.__globals) FRACTAL.$$.unlisten(this.fnGlobals);
        super.disconnectedCallback();
    }
    _initBus() {
        if (this.$partid || this.$properties.get('$partid') || (!this.$$ && (this.$properties.get('_partid') || this.__saves || !this.$root || this.__locals || this.__globals))) {
            this._partid = this.$partid || this._partid || this.id || this.localName;
            if (this.$properties.get('$partid'))
                this.$partid = this._partid;
            if (this.$$?.update)
                this.$$.update.unlisten(this.fnUpdate);
            if (!FRACTAL._$$[this._partid]) {
                FRACTAL._$$[this._partid] = { _$$: {}, _$$: {} };
                FRACTAL._$$[this._partid]._$$ = icaro({});
                FRACTAL._$$[this._partid]._$$.update = icaro({ value: 0 });
            }
        }
    }

    fnUpdate = (e) => {
        this.requestUpdate();
        // if (FRACTAL._$update) {
        //     ++this.$$.__update;
        //     FRACTAL.debounce('_$update', () => {
        //         console.log('_$update', 'requestUpdate', this.$$.__update, 'changed', this.$$.__changed);
        //         this.$$.__update = 0;
        //         this.$$.__changed = 0;
        //     }, 100);
        // }
    }
    fnLocals = (e) => { if (this.__locals) this.__locals.forEach(i => { if (e.has(i)) this[i] = e.get(i) }) }
    fnGlobals = (e) => { if (this.__globals) this.__globals.forEach(i => { if (e.has(i)) this[i] = e.get(i) }) }

    _setPartid(_partid) {
        if (this._partid !== _partid) {
            this._PARTID = _partid;
            this.$$.update.listen(this.fnUpdate);
        }
    }
    get partid() { return this._PARTID || this.$partid || this.$root?.partid || this._partid || undefined }
    get $$() { return FRACTAL._$$?.[this.partid]?.['_$$'] ? FRACTAL._$$[this.partid]['_$$'] : undefined }
    get $root() { return this.getRootNode().host; }
    get _saveFileName() { return ((this.id || this.partid || this.localName.replace('lit-', '')) + '.saves') }
    $(v) { return this.$$[v].value }
    $id(id) {
        if (!id) return this.renderRoot.querySelectorAll('[id]');
        return this.renderRoot.getElementById(id);
    }
    $refs(ref) {
        const refs = this.renderRoot.querySelectorAll('[ref]');
        if (!ref) return refs;
        let node = undefined;
        if (refs?.length) refs.forEach(i => {
            let _ref = i.getAttribute('ref');
            if (_ref === ref) node = node || i;
        })
        return node;
    }

    firstUpdated() {
        super.firstUpdated();
        if (this.args) Object.keys(this.args).forEach(k => this[k] = this.args[k]);
        this.__isFirstUpdated = true;
    }

    update(changedProps) {
        super.update(changedProps);
        if (!changedProps) return;
        if (changedProps.has('_partid')) {
            this._initBus();
            this.$$.update.listen(this.fnUpdate);
        }
        if (this.args && changedProps.has('args'))
            Object.keys(this.args).forEach(k => this[k] = this.args[k]);
        for (const prop of changedProps.keys()) {
            if (this.__enableSave && this.__saves && this.__saves.includes(prop)) {
                let v = JSON.parse(localStorage.getItem(this._saveFileName));
                v = v || {};
                v[this.localName + '.' + prop] = this[prop];
                localStorage.setItem(this._saveFileName, JSON.stringify(v));
            }
            if (this.__isFirstUpdated) {
                if (this.$$ && this.__locals && this.__locals.includes(prop))
                    this.$$[prop] = this[prop];
                if (this.$$ && this.__globals && this.__globals.includes(prop))
                    FRACTAL.$$[prop] = this[prop];
                // if (FRACTAL._changed) console.log('_changed', this.localName, prop, { old: changedProps.get(prop) }, { new: this[prop] });
                // if (FRACTAL._$update) ++this.$$.__changed;
            }
            if (this.__notifications && this.__notifications.has(prop)) {
                const event = this.__notifications.get(prop);
                this.fire(event, { value: this[prop] });
                //if (FRACTAL._notify) console.log('_notify ', this.localName, event, { old: changedProps.get(prop) }, { new: this[prop] });
            }
        }
    }

    $update(property, value) { FRACTAL.$update.call(this, property, value) }
    $listen(event, fn) {
        if (!event) return;
        FRACTAL.$$[event] = FRACTAL.$$[event] || icaro({ count: 0 });
        FRACTAL.$$[event].listen(fn || this.fnListen);
    }
    $unlisten(event, fn) {
        if (!event || !FRACTAL.$$[event]) return;
        FRACTAL.$$[event].unlisten(fn || this.fnListen);
        FRACTAL.$$[event] = undefined;
    }
    $fire(event, value) {
        if (!event) return;
        FRACTAL.$$[event] = FRACTAL.$$[event] || icaro({ count: 0 });
        FRACTAL.$$[event].value = value;
        ++FRACTAL.$$[event].count;
    }

    fnListen = (e) => console.log('...fire ', this.localName, e?.type, e?.detail);
    listen(event, callback, options) { if (event) event.split(',').forEach(i => this.addEventListener(i.trim(), callback || this.fnListen, options)) }
    unlisten(event, callback, options) { if (event) event.split(',').forEach(i => this.removeEventListener(i.trim(), callback || this.fnListen, options)) }
    fire(event, detail = {}) { if (event) this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true, detail })) }
}

const __$$ = { _$$: {}, $$: {} };
__$$.$$ = icaro({});
__$$.$$.update = icaro({ value: 0 });
const _$temp = {};
_$temp.throttles = new Map();
_$temp.debounces = new Map();
class CFRACTAL {
    constructor() {
        this.ulid = ulid;
        this.icaro = icaro;
        this.$url = urlFRACTAL;
        this._notify = false;
        this._changed = false;
        this._icaro = false;
        this._$update = false;
    }
    get _$$() { return __$$._$$; }
    get $$() { return __$$.$$; }
    $update(property, value) {
        if (!this.$$) {
            this.requestUpdate();
            return;
        }
        if (!property && this.$$.update) ++this.$$.update.value;
        else if (this.$$[property]) this.$$[property]['value'] = value;
    }

    async createComponent(comp, props = {}) {
        comp = comp || {};
        if (typeof comp === 'string') {
            comp = comp.replace('lit-', '');
            let url = `${urlFRACTAL.replace('js/lit-fractal.js', '')}components/${comp}/${comp}.js`;
            await import(url);
            const cmp = document.createElement(`lit-${comp}`);
            for (let p in props) cmp[p] = props[p];
            return cmp;
        }
        for (let p in props) comp[p] = props[p];
        return comp;
    }
    async show(host, comp, compProps = {}, hostProps = {}) {
        host = await this.createComponent(host, hostProps);
        comp = await this.createComponent(comp, compProps);
        if (hostProps.data && hostProps.data.host) hostProps.data.host.push(host);
        return host.show(comp);
    }

    listen(target, event, callback, options) { if (target && event && callback) event.split(',').forEach(i => target.addEventListener(i.trim(), callback, options)) }
    unlisten(target, event, callback, options) { if (target && event && callback) event.split(',').forEach(i => target.removeEventListener(i.trim(), callback, options)) }
    fire(target, event, detail = {}) { if (target && event) target.dispatchEvent(new CustomEvent(event, { detail })) }

    throttle(key, func, delay = 0, immediate = false) {
        let pending = _$temp.throttles.get(key);
        if (pending) return;
        if (immediate) func();
        pending = setTimeout(() => {
            _$temp.throttles.delete(key);
            if (!immediate) func();
        }, delay);
        _$temp.throttles.set(key, pending);
    }
    debounce(key, func, delay = 0, immediate = false) {
        let pending = _$temp.debounces.get(key);
        if (pending) clearTimeout(pending);
        if (!pending && immediate) func();
        pending = setTimeout(() => {
            _$temp.debounces.delete(key);
            func();
        }, delay);
        _$temp.debounces.set(key, pending)
    }

    dates(d = new Date()) {
        const utc = d.toISOString();
        const local = new Date(d.getTime() - (d.getTimezoneOffset()) * 60 * 1000).toISOString().slice(0, -5).replace('T', ' ');
        const short = local.split(' ')[0];
        const monthStr = short.slice(0, -3);
        return { utc, local, short, monthStr };
    }
    ulidToDateTime(ulid) {
        return new Date(decodeTime(ulid));
    }
}
globalThis.FRACTAL = new CFRACTAL();

Object.defineProperty(Array.prototype, 'has', { enumerable: false, value: Array.prototype.includes })
Object.defineProperty(Array.prototype, 'clear', { enumerable: false, value: function() { this.splice(0) } })
Object.defineProperty(Array.prototype, 'first', { enumerable: false, get() { return this[0] } })
Object.defineProperty(Array.prototype, 'last', { enumerable: false, get() { return this[this.length - 1] } })
Object.defineProperty(Array.prototype, 'add', { enumerable: false, value: function(...item) { for (let i of item) { if (this.includes(i)) continue; this.push(i) } } })
Object.defineProperty(Array.prototype, 'remove', { enumerable: false, value: function(...items) { for (const item of items) { const idx = this.indexOf(item); if (idx < 0) continue; this.splice(idx, 1) } } })
