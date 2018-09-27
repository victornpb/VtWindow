import Drag from './drag.js';

/**
 * A Virtual windows system for the browser written in vanilla js
 * @see https://github.com/victornpb/VtWindow
 * @author Victor N. wwww.vitim.us
 * 
 */
export default class VtWindow {
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
      resize: $('[name=grab]'),
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