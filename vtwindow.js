


/**
 * A Virtual windows system for the browser written in vanilla js
 * @see https://github.com/victornpb/VtWindow
 * @author Victor N. wwww.victorborges.com
 */
class VtWindow {
    constructor(content, options) {
        
        this.options = {
            preserveFocusOrder: true, //preserve window order after focusing (disable if you need to use iframes inside windows)
            autoMount: false, //mount on new
            lowEnd: false,

            ...options
        };


        // private props
        this._id = `instance-${Math.random()}`; //TODO: remove the need for ID or implement propper ID generation
        this._parent = undefined;
        this._mounted = false;
        this._maximized = false;
        this._minimized = false;

        
        this.el = (()=>{
            const div = document.createElement('div');
            div.innerHTML = `
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
            return div;
        })();

        /**
         * @function $
         * @param  {type} selector {description}
         * @return {type} {description}
         */
        const $ = (selector) => {
            return this.el.querySelector(selector);
        };

        this.DOM = {
            header: $('[name=header]'),
            title: $('[name=title]'),
            controls: $('[name=controls]'),
            body: $('[name=body]'),
            close: $('[name=close]'),
            popout: $('[name=popout]'),
            minimize: $('[name=minimize]'),
            maximize: $('[name=maximize]'),
            resize: $('[name=grab]'),
        };

        //bind events
        this.DOM.close.onclick = this.hide.bind(this)
        this.DOM.popout.onclick = this.popout.bind(this);
        this.DOM.minimize.onclick = this.minimize.bind(this);
        this.DOM.maximize.onclick = this.maximize.bind(this);
        this.DOM.title.ondblclick = this.maximize.bind(this);

        
        this._focused = false;

        //auto focus on click
       function focusHandler(e) {
            if (this._focused === false && this._mounted === true) { //fired only when switching states
                this.focus();
            }
        };
        this._focusHandler = focusHandler.bind(this);


        // handler registed when the window gain focus, so it can auto blur when clicking outside window
        function globalBlurHandler(e) {
            if (!this.el.contains(e.target)) { // click outside el
                this.blur(); 
            }
        };
        this._blurHandler = globalBlurHandler.bind(this);


        
        this.el.classList.add('vt-window');
        this.el.style.cssText = `
            top: 20px;
            left: 20px;
            width: 400px;
            height: 300px;
        `;

        if(this.options.lowEnd) this.el.classList.add('low-end');

        
        //init drag n drop
        this._drag = new Drag(this.DOM.header, this.el);
        this._resize = new Drag(this.DOM.resize, this.el, true);


        this.blur();

        if(this.options.autoMount) this.mount();
    }
    mount(parentEl) {
        const parent = (parentEl || document.body);
        parent.appendChild(this.el);
        this.el.classList.add('virtual');
        // modify props only after the append was successful
        this._parent = parent;
        this._mounted = true;
    }
    unmount() {
        this._parent.removeChild(this.el);
        // modify props only after the append was successful
        this._mounted = false;
        // should we clear _parent after unmount? NO! (will break focus, bring to front)
    }
    get isMounted(){
        return this._mounted; //TODO: verify if this.el is inside this._parent
    }
    show() {
        this.el.style.display = '';
    }
    hide() {
        this.el.style.display = 'none';
    }
    minimize() {
        if (this._maximized) {
            this.maximize(false); //restore
        }
        this.el.classList.toggle('minimized', this._minimized);
        this._minimized = !this._minimized;
    }
    get isMinimized(){
        return this._minimized;
    }
    maximize() {
        this._maximized = !this._maximized;
        this.el.classList.toggle('maximized', this._maximized);
        // this.el.style.top = '0';
        // this.el.style.left = '0';
    }
    get isMaximized(){
        return this._maximized;
    }
    popout() {
        //aproximate the view port is in the center of the browser
        const wTop = ((window.outerHeight - window.innerHeight) / 2) + window.screenY;
        const wLeft = ((window.outerWidth - window.innerWidth) / 2) + window.screenX;

        const s = `width=${this.el.offsetWidth}, height=${this.el.clientHeight}, top=${this.el.offsetTop + wTop}, left=${this.el.offsetLeft + wLeft}`;
        // console.log(s);

        this.popup = window.open('', this._id, s);

        // this._mounted = false;
        this.unmount();
        this.popup.document.body.appendChild(this.el);
        this.popup.document.title = this.DOM.title.innerText;

        const popupHead = this.popup.document.getElementsByTagName('head')[0];
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
            this.DOM.title.innerHTML = elm;
        }
        else{
            this.DOM.title.innerHTML = '';
            this.DOM.title.appendChild(elm);
        }
    }
    
    /**
     * @param  {} elm
     */
    setBody(elm) {
        if (typeof elm === 'string') {
            this.DOM.body.innerHTML = elm;
        }
        else {
            this.DOM.body.innerHTML = '';
            this.DOM.body.appendChild(elm);
        }
    }

    focus() {
        this.el.classList.add('focus');
        this._focused = true;

        //bring to front, move down into body
        if(this.options.preserveFocusOrder) {
            //it will force iframes to reload on focus
            this.unmount();
            this.mount();
        }

        // this.el.style.zIndex = 1;

        this.el.removeEventListener('mousedown', this._focusHandler);
        document.addEventListener('mousedown', this._blurHandler);
    }

    blur() {
        this.el.classList.remove('focus');
        this._focused = false;

        // this.el.style.zIndex = 0;

        document.removeEventListener('mousedown', this._blurHandler);
        this.el.addEventListener('mousedown', this._focusHandler);
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
    
   
    /**
     * Position from the top in pixels
     * @type {Number}
     */
    set top(px) {
        this.el.style.top = `${px}px`;
    }
    /**
     * Position from the left in pixels
     * @type {Number}
     */
    set left(px) {
        this.el.style.left = `${px}px`;
    }
    /**
     * Width in pixels
     * @type {Number}
     */
    set width(px) {
        this.el.style.width = `${px}px`;
    }
    /**
     * Height in pixels
     * @type {Number}
     * @property {Number} iujiuji
     */
    set height(px) {
        this.el.style.height = `${px}px`;
    }
}



class Drag {
    /**
     * Make a element draggable/resizable
     * @param {Element} zone The element that will listen to events (handdle/grabber)
     * @param {Element} target The element that will be dragged/resized
     * @param {boolean} [resizeMode=false] Drag or Resize mode (dafault is move/drag)
     * 
     * @memberOf Drag
     */
    constructor(zone, target, resizeMode=false) {
        
        this.zone = zone;
        this.target = target;

        let offX, offY, tW, tH;

        function dragStartHandler(e) {
            if(e.buttons===1 || e.type==="touchstart"){
                console.log('dragStart', e);
                
                offX = e.clientX;
                offY = e.clientY;
                
                const targetOffset = this.target.getBoundingClientRect();
                if(e.type==='touchstart') {
                    offX = e.touches[0].clientX;
                    offY = e.touches[0].clientY;
                }
                
                if(resizeMode) {
                    offX-=targetOffset.x+targetOffset.width;
                    offY-=targetOffset.y+targetOffset.height;
                }
                else {
                    offX-=targetOffset.x;
                    offY-=targetOffset.y;
                }

                //mouse events
                document.addEventListener('mousemove', this._dragMoveHandler);
                document.addEventListener('mouseup', this._dragEndHandler);
                //touch events
                document.addEventListener('touchmove', this._dragMoveHandler, {passive:false});
                document.addEventListener('touchend', this._dragEndHandler);

                this.target.classList.add('drag');
            }
        }
        
        function dragMoveHandler(e) {
            e.preventDefault();
            console.log('dragMove', e /* `clientX=${e.clientX} layerX=${e.layerX} clientX=${e.offsetX} pageX=${e.pageX} screenX=${e.screenX}`, e.target */);
            
            // If the button is not down, dispatch a "fake" mouse up event, to stop listening to mousemove
            // This happens when the mouseup is not captured (outside the browser)
            if(e.buttons!==1 || e.which!==1) {
                // console.log('artificial dragEnd!');
                // this._dragEndHandler();
                // return;
            }

            let clientY = e.clientY;
            let clientX = e.clientX;

            if(e.type==='touchmove'){
                clientY = e.touches[0].clientY;
                clientX = e.touches[0].clientX;
            }


            if (resizeMode) {
                // let h = clientY - target.offsetTop - offY + zone.clientHeight;
                // let w = clientX - target.offsetLeft - offX + zone.clientWidth;
                let h = clientY - target.offsetTop - offY;
                let w = clientX - target.offsetLeft - offX;
                // console.log(w, h, `clientX=${target.clientX} layerX=${target.layerX} offsetX=${target.offsetX} pageX=${target.pageX} screenX=${target.screenX} offsetLeft=${target.offsetLeft} scrollLeft=${target.scrollLeft}`);
                
                this.target.style.height = `${h}px`;
                this.target.style.width = `${w}px`;
            } else {
                let t = clientY - offY < 0 ? 0 : clientY - offY;
                let l = clientX - offX < 0 ? 0 : clientX - offX;
                this.target.style.top = `${t}px`;
                this.target.style.left = `${l}px`;

                console.log(offX, offY, clientX, clientY);
            }
        }
        
        function dragEndHandler(e) {
            console.log('dragEnd', e);

            //touch events
            document.removeEventListener('mousemove', this._dragMoveHandler);
            document.removeEventListener('mouseup', this._dragEndHandler);
            //mouse events
            document.removeEventListener('touchmove', this._dragMoveHandler);
            document.removeEventListener('touchend', this._dragEndHandler);

            this.target.classList.remove('drag');
        }

        // We need to bind the handlers to this instance and expose them to methods enable and destroy
        this._dragStartHandler = dragStartHandler.bind(this);
        this._dragMoveHandler = dragMoveHandler.bind(this);
        this._dragEndHandler = dragEndHandler.bind(this);
        
        this.enable();
    }

    /**
     * Turn on the drag and drop of the instancea
     * @memberOf Drag
     */
    enable() {
        this.zone.addEventListener('mousedown', this._dragStartHandler);
        this.zone.addEventListener('touchstart', this._dragStartHandler);
    }

    /**
     * Teardown all events bound to the document and elements
     * You can resurrect this instance by calling enable()
     * @memberOf Drag
     */
    destroy(){
        this.target.classList.remove('drag');
        
        //mouse events
        this.zone.removeEventListener('mousedown', this._dragStartHandler);
        document.removeEventListener('mousemove', this._dragMoveHandler);
        document.removeEventListener('mouseup', this._dragEndHandler);
        //touch events
        this.zone.addEventListener('touchstart', this._dragStartHandler);
        document.removeEventListener('touchmove', this._dragMoveHandler);
        document.removeEventListener('touchend', this._dragEndHandler);
    }
}

// export default VtWindow;
