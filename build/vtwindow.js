(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.VtWindow = factory());
}(this, function () { 'use strict';

  class Drag {
    /**
     * Make an element draggable/resizable
     * @param {Element} targetElm The element that will be dragged/resized
     * @param {Element} handleElm The element that will listen to events (handdle/grabber)
     * @param {object} [options] Options
     * @param {string} [options.mode="move"] Define the type of operation (move/resize)
     * @param {number} [options.minWidth=200] Minimum width allowed to resize
     * @param {number} [options.maxWidth=Infinity] Maximum width allowed to resize
     * @param {number} [options.minHeight=100] Maximum height allowed to resize
     * @param {number} [options.maxHeight=Infinity] Maximum height allowed to resize
     * @param {string} [options.draggingClass="drag"] Class added to targetElm while being dragged
     * @param {boolean} [options.useMouseEvents=true] Use mouse events
     * @param {boolean} [options.useTouchEvents=true] Use touch events
     * 
     * @author Victor N. wwww.vitim.us
     */
    constructor(targetElm, handleElm, options) {
      this.options = Object.assign({
        mode: 'move',

        minWidth: 200,
        maxWidth: Infinity,
        minHeight: 100,
        maxHeight: Infinity,
        xAxis: true,
        yAxis: true,

        draggingClass: 'drag',

        useMouseEvents: true,
        useTouchEvents: true,
      }, options);

      // Public properties
      this.minWidth = this.options.minWidth;
      this.maxWidth = this.options.maxWidth;
      this.minHeight = this.options.minHeight;
      this.maxHeight = this.options.maxHeight;
      this.xAxis = this.options.xAxis;
      this.yAxis = this.options.yAxis;
      this.draggingClass = this.options.draggingClass;

      /** @private */
      this._targetElm = targetElm;
      /** @private */
      this._handleElm = handleElm;

      const operation = (x, y) => {
        // constraint
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x > vw) x = vw;
        if (y > vh) y = vh;

        // calc width max delta
        const deltaX = (x - initialX);
        const deltaY = (y - initialY);

        
        if (this.options.mode === 'move') {
          const t = initialT + deltaY;
          const l = initialL + deltaX;
          this._targetElm.style.top = `${t}px`;
          this._targetElm.style.left = `${l}px`;
        }
        else {
          let resizeDirX = 1;
          let resizeDirY = 1;
          if (this.options.mode === 'resize-l' || this.options.mode === 'resize-tl' || this.options.mode === 'resize-bl') resizeDirX = -1;
          if (this.options.mode === 'resize-t' || this.options.mode === 'resize-tl' || this.options.mode === 'resize-tr') resizeDirY = -1;
    
          const deltaXMax = (this.maxWidth - initialW);
          const deltaXMin = (this.minWidth - initialW);
          const deltaYMax = (this.maxHeight - initialH);
          const deltaYMin = (this.minHeight - initialH);
    
          let t = initialT + clamp(deltaY * resizeDirY, deltaYMin, deltaYMax) * resizeDirY;
          let l = initialL + clamp(deltaX * resizeDirX, deltaXMin, deltaXMax) * resizeDirX;
          let w = initialW + clamp(deltaX * resizeDirX, deltaXMin, deltaXMax);
          let h = initialH + clamp(deltaY * resizeDirY, deltaYMin, deltaYMax);
    
          // resize ↑
          if (this.options.mode === 'resize-t' || this.options.mode === 'resize-tl' || this.options.mode === 'resize-tr') {
            this._targetElm.style.top = `${t}px`;
            this._targetElm.style.height = `${h}px`;
          }
          // resize ↓
          if (this.options.mode === 'resize-b' || this.options.mode === 'resize-bl' || this.options.mode === 'resize-br') {
            this._targetElm.style.height = `${h}px`;
          }
          // resize ←
          if (this.options.mode === 'resize-l' || this.options.mode === 'resize-tl' || this.options.mode === 'resize-bl') {
            this._targetElm.style.left = `${l}px`;
            this._targetElm.style.width = `${w}px`;
          }
          // resize →
          if (this.options.mode === 'resize-r' || this.options.mode === 'resize-tr' || this.options.mode === 'resize-br') {
            this._targetElm.style.width = `${w}px`;
          }
        }
      };


      let vw = window.innerWidth;
      let vh = window.innerHeight;

      let initialX, initialY, initialT, initialL, initialW, initialH;

      function dragStartHandler(e) {
        const touch = e.type === 'touchstart';

        if ((e.buttons === 1 || e.which === 1) || touch) {
          e.preventDefault();

          const x = touch ? e.touches[0].clientX : e.clientX;
          const y = touch ? e.touches[0].clientY : e.clientY;

          vw = window.innerWidth;
          vh = window.innerHeight;

          initialX = x;
          initialY = y;

          initialT = this._targetElm.offsetTop;
          initialL = this._targetElm.offsetLeft;
          initialW = this._targetElm.clientWidth;
          initialH = this._targetElm.clientHeight;

          if (this.options.useMouseEvents) {
            document.addEventListener('mousemove', this._dragMoveHandler);
            document.addEventListener('mouseup', this._dragEndHandler);
          }
          if (this.options.useTouchEvents) {
            document.addEventListener('touchmove', this._dragMoveHandler, {
              passive: false,
            });
            document.addEventListener('touchend', this._dragEndHandler);
          }

          this._targetElm.classList.add(this.draggingClass);
        }
      }

      function dragMoveHandler(e) {
        e.preventDefault();
        let x, y;

        const touch = e.type === 'touchmove';
        if (touch) {
          const t = e.touches[0];
          x = t.clientX;
          y = t.clientY;
        } else { //mouse

          // If the button is not down, dispatch a "fake" mouse up event, to stop listening to mousemove
          // This happens when the mouseup is not captured (outside the browser)
          if ((e.buttons || e.which) !== 1) {
            this._dragEndHandler();
            return;
          }

          x = e.clientX;
          y = e.clientY;
        }

        operation(x, y);
      }

      function dragEndHandler(e) {
        if (this.options.useMouseEvents) {
          document.removeEventListener('mousemove', this._dragMoveHandler);
          document.removeEventListener('mouseup', this._dragEndHandler);
        }
        if (this.options.useTouchEvents) {
          document.removeEventListener('touchmove', this._dragMoveHandler);
          document.removeEventListener('touchend', this._dragEndHandler);
        }
        this._targetElm.classList.remove(this.draggingClass);
      }

      // We need to bind the handlers to this instance and expose them to methods enable and destroy
      /** @private */
      this._dragStartHandler = dragStartHandler.bind(this);
      /** @private */
      this._dragMoveHandler = dragMoveHandler.bind(this);
      /** @private */
      this._dragEndHandler = dragEndHandler.bind(this);

      this.enable();
    }

    /**
     * Turn on the drag and drop of the instancea
     * @memberOf Drag
     */
    enable() {
      // this.destroy(); // prevent events from getting binded twice
      if (this.options.useMouseEvents) this._handleElm.addEventListener('mousedown', this._dragStartHandler);
      if (this.options.useTouchEvents) this._handleElm.addEventListener('touchstart', this._dragStartHandler, { passive: false });
    }

    /**
     * Teardown all events bound to the document and elements
     * You can resurrect this instance by calling enable()
     * @memberOf Drag
     */
    destroy() {
      this._targetElm.classList.remove(this.draggingClass);

      if (this.options.useMouseEvents) {
        this._handleElm.removeEventListener('mousedown', this._dragStartHandler);
        document.removeEventListener('mousemove', this._dragMoveHandler);
        document.removeEventListener('mouseup', this._dragEndHandler);
      }
      if (this.options.useTouchEvents) {
        this._handleElm.removeEventListener('touchstart', this._dragStartHandler);
        document.removeEventListener('touchmove', this._dragMoveHandler);
        document.removeEventListener('touchend', this._dragEndHandler);
      }
    }
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  /**
   * A Virtual windows system for the browser written in vanilla js
   * @see https://github.com/victornpb/VtWindow
   * @author Victor N. wwww.vitim.us
   * 
   */
  class VtWindow {
    /**
     * @param  {object} [content] Object with the initial content
     * @param  {string|Element} [content.title] Title of the window
     * @param  {string|Element} [content.body] Content of the window
     * 
     * @param  {object} [options] Object with options
     * 
     * @param  {number} [options.top=10] Initial top position
     * @param  {number} [options.left=10] Initial left position
     * @param  {number} [options.width=400] Initial width
     * @param  {number} [options.height=300] Initial height
     * 
     * @param {boolean} [closable=true] Show close button
     * @param {boolean} [maximizable=true] Show maximize button
     * @param {boolean} [minimizable=true] Show minimize button
     * @param {boolean} [deatachable=true] Show deatache button
     * @param {boolean} [resizable=true] Show resize button
     * 
     * @param  {boolean} [options.preserveFocusOrder=true] Preserve window order after focusing (disable if you need to use iframes inside windows)
     * @param  {boolean} [options.autoMount=false] Automatically call mount() after instantiation
     * @param  {boolean} [options.lowEnd=false] Turn on optimizations for low end devices
     * 
     * @param  {function} [options.onMinimize] Callback on Minimize
     * @param  {function} [options.onMaximize] Callback on Maximize
     * @param  {function} [options.onMount] Callback on Mount
     * @param  {function} [options.onUnmount] Callback on Unmount
     * @param  {function} [options.onShow] Callback on Show
     * @param  {function} [options.onHide] Callback on Hide
     * @param  {function} [options.onPopout] Callback on Popout
     * @param  {function} [options.onExitPopout] Callback on ExitPopout
     * @param  {function} [options.onFocus] Callback on Focus
     * @param  {function} [options.onBlur] Callback on Blur
     * 
     * @param  {Element} [options.container=document.body] Where the window should be mounted to (cannot be changed after instantiation)
     * @param  {string} [options.template] Template used to construct the window
     * 
     * @return {VtWindow} A VtWindow instance
     */  
    constructor(content, options) {

      content = Object.assign({
        title: 'VtWindow',
        body: '<h1>VtWindow</h1>',
      }, content);
      
      this.options = Object.assign({

        top: 10,
        left: 10,
        width: 400,
        height: 300,

        closable: true,
        maximizable: true,
        minimizable: true,
        deatachable: false, // needs polishing
        resizable: true,

        preserveFocusOrder: true, // preserve window order after focusing (disable if you need to use iframes inside windows)
        autoMount: false, // mount on new
        lowEnd: false,

        // events
        onMinimize: null,
        onMaximize: null,
        onMount: null,
        onUnmount: null,
        onShow: null,
        onHide: null,
        onPopout: null,
        onExitPopout: null,
        onFocus: null,
        onBlur: null,
        
        container: document.body,
        template: /*html*/`
      <div role="dialog" aria-label="">
        <div name="header">
          <span name="title"><!-- title --></span>
          <span name="controls">
            <button name="popout">^</button>
            <button name="maximize">+</button>
            <button name="minimize">_</button>
            <button name="close">x</button>
          </span>
        </div>
        <div name="body">
          <!-- body -->
        </div>
        <div name="footer">
          <div name="grab"></div>
        </div>
      </div>
      `,
      }, options);

      // private props
      /** @private */
      this._id = `instance-${Math.random()}`; //TODO: remove the need for ID or implement propper ID generation
      /** @private */
      this._container = this.options.container; //cannot be changed after creation
      /** @private */
      this._mounted = false;
      /** @private */
      this._maximized = false;
      /** @private */
      this._minimized = false;
      /** @private */
      this._focused = false;
      /** @private */
      this._popup = false;

      /**
       * The vtwindow root element
       * @type {HTMLElement}
       */
      this.el = (() => {
        const div = document.createElement('div');
        div.innerHTML = this.options.template;
        if (div.children.length !== 1) throw new Error(`The template must contain exactly 1 root element!\n${this.options.template}`);
        return div.firstElementChild;
      })();

      /**
       * @function $
       * @param  {string} selector A CSS selector
       * @return {Element} A dom element
       */
      const $ = selector => {
        const el = this.el.querySelector(selector);
        if (!el) throw new Error(`The template does not containg an element matching the selector ${selector}.\n ${this.el.innerHTML}`);
        return el;
      };

      /**
       * Elements of the window
       */
      this.DOM = {
        header: $('[name=header]'),
        title: $('[name=title]'),
        controls: $('[name=controls]'),
        popout: $('[name=popout]'),
        maximize: $('[name=maximize]'),
        minimize: $('[name=minimize]'),
        close: $('[name=close]'),
        body: $('[name=body]'),
        footer: $('[name=footer]'),
        resize: $('[name=grab],[name=grab-br]'),
        resizeTl: $('[name=grab],[name=grab-tl]'),
        resizeBl: $('[name=grab],[name=grab-bl]'),
        resizeTr: $('[name=grab],[name=grab-tr]'),
        resizeBr: $('[name=grab],[name=grab-br]'),
        resizeL: $('[name=grab],[name=grab-l]'),
        resizeR: $('[name=grab],[name=grab-r]'),
        resizeT: $('[name=grab],[name=grab-t]'),
        resizeB: $('[name=grab],[name=grab-b]'),
      };

      this.onMinimize = this.options.onMinimize;
      this.onMaximize = this.options.onMaximize;
      this.onMount = this.options.onMount;
      this.onUnmount = this.options.onUnmount;
      this.onShow = this.options.onShow;
      this.onHide = this.options.onHide;
      this.onPopout = this.options.onPopout;
      this.onExitPopout = this.options.onExitPopout;
      this.onFocus = this.options.onFocus;
      this.onBlur = this.options.onBlur;

      // bind events
      this.DOM.close.onclick = this.hide.bind(this);
      this.DOM.popout.onclick = this.popout.bind(this);
      this.DOM.minimize.onclick = this.minimize.bind(this);
      this.DOM.maximize.onclick = this.maximize.bind(this);
      this.DOM.title.ondblclick = this.maximize.bind(this);

      /**
       * handler responsible for auto focusing when you click inside a window
       * @listens mousedown
       */
      const focusHandler = e => {
        if (this._focused === false && this._mounted === true) {
          //fired only when switching states
          this.focus();
        }
      };
      /** @private */
      this._focusHandler = focusHandler;

      /**
       * handler registed when the window gain focus, so it can auto blur when clicking outside window
       * @listens mousedown
       */
      const globalBlurHandler = e => {
        if (!this.el.contains(e.target)) {
          // click outside el
          this.blur();
        }
      };
      /** @private */
      this._blurHandler = globalBlurHandler;

      /** 
       * Drag move instance
       * @private
       */
      this._dragMove = new Drag(this.el, this.DOM.header, { mode: 'move' });

      /** 
       * Drag resize instance
       * @private
       */
      this._dragResize = new Drag(this.el, this.DOM.resize, { mode: 'resize' });
      this._dragResizeT = new Drag(this.el, this.DOM.resizeT, { mode: 'resize-t', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });
      this._dragResizeB = new Drag(this.el, this.DOM.resizeB, { mode: 'resize-b', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });
      this._dragResizeL = new Drag(this.el, this.DOM.resizeL, { mode: 'resize-l', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });
      this._dragResizeR = new Drag(this.el, this.DOM.resizeR, { mode: 'resize-r', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });
      this._dragResizeTl = new Drag(this.el, this.DOM.resizeTl, { mode: 'resize-tl', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });
      this._dragResizeTr = new Drag(this.el, this.DOM.resizeTr, { mode: 'resize-tr', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });
      this._dragResizeBl = new Drag(this.el, this.DOM.resizeBl, { mode: 'resize-bl', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });
      this._dragResizeBr = new Drag(this.el, this.DOM.resizeBr, { mode: 'resize-br', maxWidth: this.options.maxWidth, maxHeight: this.options.maxHeight, minWidth: this.options.minWidth, minHeight: this.options.minHeight });


      this.blur(); //start on blurred state so the reciprocical blur/focus events starts 
      
      this.el.classList.add('vt-window');
      if (this.options.lowEnd) this.el.classList.add('low-end');
      
      // setup options
      this.top = this.options.top;
      this.left = this.options.left;
      this.width = this.options.width;
      this.height = this.options.height;
      this.closable = this.options.closable;
      this.minimizable = this.options.minimizable;
      this.maximizable = this.options.maximizable;
      this.deatachable = this.options.deatachable;
      this.resizable = this.options.resizable;
      
      this.setTitle(content.title);
      this.setBody(content.body);

      if (this.options.autoMount) this.mount();

      Object.seal(this);
    }

    destroy() {

      if (this.isMounted) this.unmount();
      this._dragMove.destroy();
      this._dragMove = undefined;
      this._dragResize.destroy();
      this._dragResize = undefined;

      // unbind events
      this.el.removeEventListener('mousedown', this._focusHandler); 
      document.removeEventListener('mousedown', this._blurHandler);
      this.DOM.close.onclick =
        this.DOM.popout.onclick =
        this.DOM.minimize.onclick =
        this.DOM.maximize.onclick =
        this.DOM.title.ondblclick = undefined;
       
      //release handlers
      this.onMinimize =
        this.onMaximize =
        this.onMount =
        this.onUnmount =
        this.onShow =
        this.onHide =
        this.onPopout =
        this.onExitPopout =
        this.onFocus =
        this.onBlur = undefined;
      this.options = undefined;
      
      //release DOM nodes
      this.el = undefined;
      this.DOM = undefined;
    }
    
    mount() {
      this._container.appendChild(this.el);
      this.el.classList.add('virtual');
      this._mounted = true; // modify props only after the append was successful
      this.constrain();

      if (typeof this.onMount==='function') this.onMount.call(this);
    }
    unmount() {
      this._container.removeChild(this.el);
      this._mounted = false; // modify props only after the append was successful
     
      if (typeof this.onUnmount==='function') this.onUnmount.call(this);
    }
    get isMounted() {
      return this._mounted; //TODO: verify if this.el is inside this._container
    }
    show() {
      this.el.style.display = '';
      this.constrain();
      if (typeof this.onShow==='function') this.onShow.call(this);
    }
    hide() {
      this.el.style.display = 'none';
      if (typeof this.onHide==='function') this.onHide.call(this);
    }
    minimize(bool) {
      if (this._maximized) {
        this.maximize(false); //restore
      }

      this._minimized = typeof bool==='boolean' ? bool : !this._minimized;
      this.el.classList.toggle('minimized', this._minimized);

      this._dragMove.yAxis = !this._minimized; //turn off dragging in the vertical direction (stuck to bottom)
      
      this.constrain();

      if (typeof this.onMinimize==='function') this.onMinimize.call(this);
    }
    get isMinimized() {
      return this._minimized;
    }
    maximize(bool) {
      if (this._minimized) {
        this.minimize(false); //restore
      }
      
      this._maximized = typeof bool==='boolean' ? bool : !this._maximized;
      this.el.classList.toggle('maximized', this._maximized);
      this.constrain();
      
      if (typeof this.onMaximize==='function') this.onMaximize.call(this);
    }
    get isMaximized() {
      return this._maximized;
    }
    popout() {
      //aproximate the view port is in the center of the browser
      const wTop = (window.outerHeight - window.innerHeight) / 2 + window.screenY;
      const wLeft = (window.outerWidth - window.innerWidth) / 2 + window.screenX;

      const s = `width=${this.el.offsetWidth}, height=${
      this.el.clientHeight
    }, top=${this.el.offsetTop + wTop}, left=${this.el.offsetLeft + wLeft}`;
      // console.log(s);

      this._popup = window.open('', this._id, s);

      // this._mounted = false;
      this.unmount();
      this._popup.document.body.appendChild(this.el);
      this._popup.document.title = this.DOM.title.innerText;

      const popupHead = this._popup.document.getElementsByTagName('head')[0];
      document.querySelectorAll('style,link').forEach(el => {
        popupHead.appendChild(el.cloneNode(true));
      });

      this.el.classList.add('windowed');
      this.el.classList.remove('virtual');

      this._popup.onbeforeunload = () => {
        this.exitpopout();
      };

      if (typeof this.onPopout==='function') this.onPopout.call(this);
    }

    exitpopout() {
      this.el.classList.remove('windowed');
      this.mount();

      if (typeof this.onExitPopout==='function') this.onExitPopout.call(this);
    }

    focus() {
      if (!this._mounted) throw new Error('Cannot set focus on unmounted window');

      //bring to front, move down into DOM tree
      if (this.options.preserveFocusOrder) {
        //it will force iframes to reload on focus
        this._container.appendChild(this.el);
      }

      this.el.classList.add('focus');
      this._focused = true;

      // this.el.style.zIndex = 1;

      this.el.removeEventListener('mousedown', this._focusHandler); //already focused we don't need to listen to this event anymore
      document.addEventListener('mousedown', this._blurHandler); //register event waiting for a click outsised (aka blur)

      this.constrain();

      if (typeof this.onFocus==='function') this.onFocus.call(this);
    }

    blur() {
      this.el.classList.remove('focus');
      this._focused = false;

      // this.el.style.zIndex = 0;

      document.removeEventListener('mousedown', this._blurHandler); //already blurred we don't need to listen to this event anymore
      this.el.addEventListener('mousedown', this._focusHandler); //register event waiting for a click inside (aka focus)

      this.constrain();

      if (typeof this.onBlur==='function') this.onBlur.call(this);
    }

    constrain() { 
      if (this.left > window.innerWidth - this.width) this.left = Math.max(window.innerWidth - this.width, 0);
      else if (this.left < 0) this.left = 0;
      if (this.top > window.innerHeight - this.height) this.top = Math.max(window.innerHeight - this.height, 0);
      else if (this.top < 0) this.top = 0;
      if (this.width > window.innerWidth) this.width = window.innerWidth;
      if (this.height > window.innerHeight) this.height = window.innerHeight;
    }

    get isFocused() {
      return this._focused;
    }

    /**
     * Change the current title
     * @param {Element|string} title 
     */
    setTitle(title) {
      if (typeof title === 'string') {
        this.DOM.title.innerHTML = title;
      } else {
        this.DOM.title.innerHTML = '';
        this.DOM.title.appendChild(title);
      }
      const text = this.DOM.title.innerText;
      this.DOM.title.setAttribute('title', text);
      this.el.setAttribute('arial-label', text);
    }

    /**
     * change the current content
     * @param  {Element|string} body
     */
    setBody(body) {
      if (typeof body === 'string') {
        this.DOM.body.innerHTML = body;
      } else {
        this.DOM.body.innerHTML = '';
        this.DOM.body.appendChild(body);
      }
    }

    /**
     * Show the resize grabber
     * @param  {boolean} bool {description}
     */
    set resizable(bool) {
      this.DOM.resize.style.display = bool ? '' : 'none';
      this.DOM.resize.disabled = !bool;

      if (bool) {
        this._dragResize.enable();
      }
      else {
        this._dragResize.destroy();
      }
    }
    /**
     * Show the close button
     * @param  {boolean} bool {description}
     */
    set closable(bool) {
      // this.DOM.close.style.display = bool ? '' : 'none';
      this.DOM.close.disabled = !bool;
    }
    /**
     * Show the minimize button
     * @param  {boolean} bool {description}
     */
    set minimizable(bool) {
      // this.DOM.minimize.style.display = bool ? '' : 'none';
      this.DOM.minimize.disabled = !bool;
    }
    /**
     * Show the maximize button
     * @param  {boolean} bool {description}
     */
    set maximizable(bool) {
      // this.DOM.maximize.style.display = bool ? '' : 'none';
      this.DOM.maximize.disabled = !bool;

      if (bool) {
        this.DOM.title.ondblclick = this.maximize.bind(this);
      }
      else {
        this.DOM.title.ondblclick = null;
      }

    }
    /**
     * Enable a virtual window to be deatachable from anoter window (popup)
     * @param  {boolean} bool {description}
     */
    set deatachable(bool) {
      // this.DOM.popout.style.display = bool ? '' : 'none';
      this.DOM.popout.disabled = !bool;
    }
    /**
     * Position from the top in pixels
     * @type {number}
     * @param {number} px
     */
    set top(px) {
      this.el.style.top = `${px}px`;
    }
    get top() {
      return parseFloat(this.el.style.top, 10);
    }
    /**
     * Position from the left in pixels
     * @type {number}
     * @param {number} px
     */
    set left(px) {
      this.el.style.left = `${px}px`;
    }
    get left() {
      return parseFloat(this.el.style.left, 10);
    }
    /**
     * Width in pixels
     * @type {number}
     * @param {number} px
     */
    set width(px) {
      this.el.style.width = `${px}px`;
    }
    get width() {
      return parseFloat(this.el.style.width, 10);
    }
    /**
     * Height in pixels
     * @type {number}
     * @param {number} px Height in pixels
     */
    set height(px) {
      this.el.style.height = `${px}px`;
    }
    get height() {
      return parseFloat(this.el.style.height, 10);
    }
  }

  return VtWindow;

}));
//# sourceMappingURL=vtwindow.js.map
