import loadAsyncView from "./loadAsyncView";
class Entry {
    constructor(sdk, tag) {
        this.sdk = sdk;
        this.tag = tag;
    }
    inProgress(tag, message = null) {
        return this.sdk.inProgress(tag, message);
    }
    updateStatus(status) {
        return this.sdk.updateStatus(this.tag, status);
    }
    done(message = null) {
        return this.sdk.done(this.tag, message);
    }
    warn(message = null) {
        return this.sdk.warn(this.tag, message);
    }
    error(message = null) {
        return this.sdk.error(this.tag, message);
    }
    info(message = null) {
        return this.sdk.info(message);
    }
    close() {
        return this.sdk.close();
    }
}
class SDK {
    constructor(onMessage) {
        this.onMessage = onMessage;
    }
    clear() {
        return this.push({level: 'clear'});
    }
    close() {
        return this.push({level: 'close'});
    }
    info(message = null) {
        return this.push({level: 'info', message});
    }
    inProgress(tag, message = null) {
        return this.push({level: 'inprogress', message, tag});
    }
    updateStatus(tag, status) {
        return this.push({level: 'statusupdate', status, tag});
    }
    done(tag, message = null) {
        return this.push({level: 'done', tag, message});
    }
    warn(tag, message = null) {
        return this.push({level: 'warn', message, tag});
    }
    error(tag, message = null) {
        return this.push({level: 'error', message, tag});
    }
    push(data) {
        this.onMessage(data);
        return new Entry(this, data.tag);
    }
}
export function initProgressLog(el, func) {
    const r = new Renderer(el, func);
    // function onMessageWithSkip(el, data, lt, func) {
    //     const self = this;
    //     if (['redirect'].includes(data.level) && self.skip === undefined) {
    //         self.skip = true;
    //         processMessage.call(self, el, data, lt, func);
    //     } else {
    //         if (self.skip === undefined) {
    //             setTimeout(() => {
    //                 if (self.skip === undefined) self.skip = false;
    //                 if (self.skip !== true) {
    //                     processMessage.call(self, el, data, lt, func);
    //                 }
    //             }, 100);
    //         } else if (self.skip === false) {
    //             processMessage.call(self, el, data, lt, func);
    //         }
    //     }
    // }
    function onMessage(data) {
        r.renderMessage(data);
        // onMessageWithSkip.call(this, el, data, lt, func);
    }

    const url = el.getAttribute('async-progress-log');
    if (url) {
        const src = new EventSource(url, {
            withCredentials: true,
        });
        src.onmessage = (ev) => {
            const data = JSON.parse(ev.data);
            onMessage(data);
            if (data.level === 'close') src.close();
        };
    }
    return new SDK(onMessage);
}

class Renderer {
    constructor(el, func = null) {
        this.inited = false;
        this.el = el;
        this.func = func;
        this.lt = el.querySelector('.log-target');
        for (const close of el.querySelectorAll('.closeable-close')) {
            close.addEventListener('click', () => {
                el.classList.add('hidden');
            });
        }
    }
    addSummary(data) {
        if (!data.message) return;
        const pre = document.createElement('pre');
        const line = document.createElement('span');
        line.classList.add('line');
        pre.appendChild(line);
        line.innerText = data.message;
        const classList = [data.level + "-summary"];
        for (const cl of classList) {
            pre.classList.add(cl);
        }
        this.lt.appendChild(pre);
    }
    addLine(data) {
        const pre = document.createElement('pre');
        const line = document.createElement('span');
        line.classList.add('line');
        pre.appendChild(line);
        line.innerText = data.message;
        const classList = [data.level];
        for (const cl of classList) {
            pre.classList.add(cl);
        }
        if (data.tag) {
            pre.setAttribute('task-tag', data.tag);
        }
        const status = document.createElement('span');
        status.classList.add('status');
        line.appendChild(status);
        const loader = document.createElement('span');
        loader.classList.add('loader');
        line.appendChild(loader);
        this.lt.appendChild(pre);
    }

    updateLine(data) {
        const el = this.lt.querySelector(`*[task-tag='${data.tag}']`);
        el.classList = [];
        const classList = [data.level];
        for (const cl of classList) {
            el.classList.add(cl);
        }
        let span = el.querySelector('span.status');

        if (data.status) {
            span.innerText = `${data.status}`;
        } else {
            span.innerText = `${data.level}`;
        }
    }

    showClose() {
        const wrapper = this.el.querySelector('.alert-close-wrapper');
        if (!wrapper) return;
        wrapper.classList.remove('hidden');
    }
    enableError() {
        const wrapper = this.el.querySelector('.alert-close-wrapper');
        if (!wrapper) return;
        const errorEl = wrapper.querySelector('.error');
        if (errorEl) errorEl.classList.remove('hidden');
    }
    disableError() {
        const wrapper = this.el.querySelector('.alert-close-wrapper');
        if (!wrapper) return;
        const errorEl = wrapper.querySelector('.error');
        if (errorEl) errorEl.classList.add('hidden');
    }

    hideClose() {
        const wrapper = this.el.querySelector('.alert-close-wrapper');
        if (!wrapper) return;
        this.el.querySelector('.alert-close-wrapper').classList.add('hidden');
    }

    renderMessage(data) {
        if (data.level === 'clear') {
            this.lt.innerText = '';
            this.el.classList.add('hidden');
            this.hideClose();
            this.disableError();
            this.inited = false;
        } else if (!this.inited) {
            this.inited = true;
            this.el.classList.remove('hidden');
        }
        if (data.level === 'close') {
            this.showClose();
        }
        if (data.level === 'redirect') {
            this.addSummary(data);
            this.el.setAttribute('action', data.location);
            this.el.requestSubmit();
        }
        if (data.level === 'rendertemplate') {
            data.render = (el) => {
                loadAsyncView(el, data.body, data.template);
            };
        }
        if (data.level === 'download') {
            this.addSummary(data);
            window.location = data.location;
        }
        if (data.level === 'info') {
            this.addLine(data);
        }
        if (data.level === 'inprogress') {
            this.addLine(data);
        }
        if (data.level === 'done') {
            this.updateLine(data);
            this.addSummary(data);
        }
        if (data.level === 'statusupdate') {
            this.updateLine(data);
        }
        if (data.level === 'warn') {
            this.updateLine(data);
            this.addSummary(data);
        }
        if (data.level === 'error') {
            this.updateLine(data);
            this.addSummary(data);
            this.enableError();
        }
        if (this.func) {
            this.func.call(this, data);
        }
    }
}
