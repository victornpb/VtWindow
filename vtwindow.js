
var unique = 0;

/**
 * A Virtual window system in the browser 
 * @author Victor N. wwww.victorborges.com
 */
class VtWindow {
    constructor(title, body, options) {
        this.id = `instance-${unique++}`;
        this.el = document.createElement('div');
        this.el.innerHTML = `
        	<div name="header">
            	<span name="title">This is my dope window</span>
                <span name="controls">
                    <button name="popout">^</button>
                    <button name="maximize">+</button>
                    <button name="minimize">_</button>
                    <button name="close">x</button>
                </span>
            </div>
            <div name="body">
                <h1>Hello World!</h1>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                </div>
            <div name="footer">
            	<div name="grab"></div>
            </div>
        `;

        const find = (selector) => {
            return this.el.querySelector(selector);
        };

        this.DOM = {
            header: find('[name=header]'),
            title: find('[name=title]'),
            controls: find('[name=controls]'),
            body: find('[name=body]'),
            close: find('[name=close]'),
            popout: find('[name=popout]'),
            minimize: find('[name=minimize]'),
            maximize: find('[name=maximize]'),
            resize: find('[name=grab]'),
        };

        //bind events
        this.DOM.close.onclick = () => {
            this.hide();
        };
        this.DOM.popout.onclick = () => {
            this.popout();
        };
        this.DOM.minimize.onclick = () => {
            this.minimize();
        };
        this.DOM.maximize.onclick = () => {
            this.maximize();
        };
        this.DOM.title.ondblclick = () => {
            this.maximize();
        };

        //fake focus, bring to front
        this.focused = false;
        this.el.addEventListener('mousedown', () => {

            if (this.focused === false && this.isMounted) { //bring to front, move down into body
                this.unmount();
                this.mount();

                const blur = (e) => {
                    if (!this.el.contains(e.target)) {
                        this.blur();
                        document.addEventListener('mousedown', blur)
                    }
                }
                document.addEventListener('mousedown', blur);

                this.focus();
            }
        });

        //init
        this.el.classList.add('vt-window');
        this.el.style.cssText = `
            top: 0px;
            left: 0px;
        `;

        this.drag = new Drag(this.DOM.header, this.el);
        this.resize = new Drag(this.DOM.resize, this.el, true);



    }
    mount() {
        this.isMounted = true;
        document.body.appendChild(this.el);
        this.el.classList.add('virtual');
    }
    unmount() {
        this.isMounted = false;
        document.body.removeChild(this.el);
    }
    show() {
        this.el.style.display = '';
    }
    hide() {
        this.el.style.display = 'none';
    }
    minimize() {
        if (this.maximized) {
            this.maximize(false); //restore
        }
        this.minimized = !this.minimized;
        this.el.classList.toggle('minimized', this.minimized);
    }
    maximize() {
        this.maximized = !this.maximized;
        this.el.classList.toggle('maximized', this.maximized);
        // this.el.style.top = '0';
        // this.el.style.left = '0';
    }
    popout() {
        //aproximate the view port is in the center of the window
        var wTop = ((window.outerHeight - window.innerHeight) / 2) + window.screenY;
        var wLeft = ((window.outerWidth - window.innerWidth) / 2) + window.screenX;

        var s = `width=${this.el.offsetWidth}, height=${this.el.clientHeight}, top=${this.el.offsetTop + wTop}, left=${this.el.offsetLeft + wLeft}`;
        // console.log(s);

        this.popup = window.open('', this.id, s);

        // this.isMounted = false;
        this.unmount();
        this.popup.document.body.appendChild(this.el);
        this.popup.document.title = this.DOM.title.innerText;

        var popupHead = this.popup.document.getElementsByTagName('head')[0];
        document.querySelectorAll('style,link').forEach((el) => {
            popupHead.appendChild(el.cloneNode(true));
        });

        this.el.classList.add('windowed');
        this.el.classList.remove('virtual');

        this.popup.onbeforeunload = () => {
            this.exitpopout();
        };
    }
    exitpopout() {
        this.el.classList.remove('windowed');
        this.mount();
    }

    setTitle(elm) {
        if (typeof elm === 'string') {
            let div = document.createElement('div');
            div.innerHTML = elm;
            elm = div;
        }
        this.DOM.title.innerHTML = '';
        this.DOM.title.appendChild(elm);
    }

    setBody(elm) {
        if (typeof elm === 'string') {
            let div = document.createElement('div');
            div.innerHTML = elm;
            elm = div;
        }
        this.DOM.body.innerHTML = '';
        this.DOM.body.appendChild(elm);
    }

    focus() {
        this.focused = true;
        this.el.classList.add('focus');
    }
    blur() {
        this.focused = false;
        this.el.classList.remove('focus');
    }



    set closable(v) {
        this.DOM.close.style.display = v ? '' : 'none';
    }
    set minimizable(v) {
        this.DOM.minimize.style.display = v ? '' : 'none';
    }
    set deatachable(v) {
        this.DOM.popout.style.display = v ? '' : 'none';
    }

    set top(v) {
        this.el.style.top = `${v}px`;
    }
    set left(v) {
        this.el.style.left = `${v}px`;
    }
    set width(v) {
        this.el.style.width = `${v}px`;
    }
    set height(v) {
        this.el.style.height = `${v}px`;
    }
}



class Drag {
    constructor(zone, target, r) {
        const that = this;
        this.zone = zone;
        this.target = target;

        var offX, offY, tW, tH;


        this.zone.addEventListener('mousedown', (e) => {
            console.log('onmousedown');

            offX = e.offsetX;
            offY = e.offsetY;

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);

            this.target.classList.add('drag');
        });

        function mouseMoveHandler(e) {
            e.preventDefault();
            console.log('mouseMoveHandler' /* `clientX=${e.clientX} layerX=${e.layerX} offsetX=${e.offsetX} pageX=${e.pageX} screenX=${e.screenX}`, e.target */);

            if (r) {
                let h = e.clientY - target.offsetTop - offY + zone.clientHeight;
                let w = e.clientX - target.offsetLeft - offX + zone.clientWidth;
                // console.log(w, h, `clientX=${target.clientX} layerX=${target.layerX} offsetX=${target.offsetX} pageX=${target.pageX} screenX=${target.screenX} offsetLeft=${target.offsetLeft} scrollLeft=${target.scrollLeft}`);

                that.target.style.height = `${h}px`;
                that.target.style.width = `${w}px`;
            } else {
                let t = e.clientY - offY < 0 ? 0 : e.clientY - offY;
                let l = e.clientX - offX < 0 ? 0 : e.clientX - offX;
                that.target.style.top = `${t}px`;
                that.target.style.left = `${l}px`;
            }
        }

        function mouseUpHandler(e) {
            console.log('mouseUpHandler');
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            that.target.classList.remove('drag');
        }
    }
    enable() {

    }
}

export default VtWindow;
