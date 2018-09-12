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
   * @param  {boolean} [options.lowEnd=false] Turn on optimazations for low end devices
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
      deatachable: false, //needs polishing
      resizable: true,

      preserveFocusOrder: true, //preserve window order after focusing (disable if you need to use iframes inside windows)
      autoMount: false, //mount on new
      lowEnd: false,

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

    /**
     * The window root element
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
      if (!el) throw new Error(`The template doesn't not containg an element matching the selector ${selector}.\n ${this.el.innerHTML}`);
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

  mount() {
    this._container.appendChild(this.el);
    this.el.classList.add('virtual');
    this._mounted = true; // modify props only after the append was successful

    if (this.options.onMount) this.options.onMount(this);
  }
  unmount() {
    this._container.removeChild(this.el);
    this._mounted = false; // modify props only after the append was successful
   
    if (this.options.onUnmount) this.options.onUnmount(this);
  }
  get isMounted() {
    return this._mounted; //TODO: verify if this.el is inside this._container
  }
  show() {
    this.el.style.display = '';
    if (this.options.onShow) this.options.onShow(this);
  }
  hide() {
    this.el.style.display = 'none';
    if (this.options.onHide) this.options.onHide(this);
  }
  minimize() {
    if (this._maximized) {
      this.maximize(false); //restore
    }

    this._minimized = !this._minimized;
    this.el.classList.toggle('minimized', this._minimized);

    this._dragMove.yAxis = !this._minimized; //turn off dragging in the vertical direction (stuck to bottom)

    if (this.options.onMinimize) this.options.onMinimize(this);
  }
  get isMinimized() {
    return this._minimized;
  }
  maximize() {
    this._maximized = !this._maximized;
    this.el.classList.toggle('maximized', this._maximized);
    // this.el.style.top = '0';
    // this.el.style.left = '0';
    if (this.options.onMaximize) this.options.onMaximize(this);
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

    this.popup = window.open('', this._id, s);

    // this._mounted = false;
    this.unmount();
    this.popup.document.body.appendChild(this.el);
    this.popup.document.title = this.DOM.title.innerText;

    const popupHead = this.popup.document.getElementsByTagName('head')[0];
    document.querySelectorAll('style,link').forEach(el => {
      popupHead.appendChild(el.cloneNode(true));
    });

    this.el.classList.add('windowed');
    this.el.classList.remove('virtual');

    this.popup.onbeforeunload = () => {
      this.exitpopout();
    };

    if (this.options.onPopout) this.options.onPopout(this);
  }

  exitpopout() {
    this.el.classList.remove('windowed');
    this.mount();

    if (this.options.onExitPopout) this.options.onExitPopout(this);
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

    if (this.options.onFocus) this.options.onFocus(this);
  }

  blur() {
    this.el.classList.remove('focus');
    this._focused = false;

    // this.el.style.zIndex = 0;

    document.removeEventListener('mousedown', this._blurHandler); //already blurred we don't need to listen to this event anymore
    this.el.addEventListener('mousedown', this._focusHandler); //register event waiting for a click inside (aka focus)

    if (this.options.onBlur) this.options.onBlur(this);
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

class Drag {
  /**
   * Make a element draggable/resizable
   * @param {Element} targetElm The element that will be dragged/resized
   * @param {Element} handleElm The element that will listen to events (handdle/grabber)
   * @param {object} [options] Options
   * @param {string} [options.mode="move"] Define the type of operation (move/resize)
   * @param {number} [options.minWidth=200] Minimum width allowed to resize
   * @param {number} [options.maxWidth=Infinity] Maximum width allowed to resize
   * @param {number} [options.minHeight=100] Maximum height allowed to resize
   * @param {number} [options.maxHeight=Infinity] Maximum height allowed to resize
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

    const move = (x, y) => {
      let l = x - offLeft;
      if (x - offLeft < 0) l = 0; //offscreen <-
      else if (x - offRight > vw) l = vw - this._targetElm.clientWidth; //offscreen ->
      let t = y - offTop;
      if (y - offTop < 0) t = 0; //offscreen /\
      else if (y - offBottom > vh) t = vh - this._targetElm.clientHeight; //offscreen \/
      
      if(this.xAxis)
        this._targetElm.style.left = `${l}px`;
      if(this.yAxis)
        this._targetElm.style.top = `${t}px`;
      // this._targetElm.style.transform = `translate(${l}px, ${t}px)`; // profilling wasn't faster than top/left as expected
    };

    const resize = (x, y) => {
      let w = x - this._targetElm.offsetLeft - offRight;
      if (x - offRight > vw) w = Math.min(vw - this._targetElm.offsetLeft, this.maxWidth); //offscreen ->
      else if (x - offRight - this._targetElm.offsetLeft > this.maxWidth) w = this.maxWidth; //max width
      else if (x - offRight - this._targetElm.offsetLeft < this.minWidth) w = this.minWidth; //min width
      let h = y - this._targetElm.offsetTop - offBottom;       
      if (y - offBottom > vh) h = Math.min(vh - this._targetElm.offsetTop, this.maxHeight); //offscreen \/
      else if (y - offBottom - this._targetElm.offsetTop > this.maxHeight) h = this.maxHeight; //max height
      else if (y- offBottom - this._targetElm.offsetTop < this.minHeight) h = this.minHeight; //min height

      if(this.xAxis)
        this._targetElm.style.width = `${w}px`;
      if(this.yAxis)
        this._targetElm.style.height = `${h}px`;
    };

     // define which operation is performed on drag
     const operation = this.options.mode === 'move' ? move : resize;

     // offset from the initial click to the target boundaries
     let offTop, offLeft, offBottom, offRight;
 
     let vw = window.innerWidth;
     let vh = window.innerHeight;
    

    function dragStartHandler(e) {
      const touch = e.type === 'touchstart';

      if ((e.buttons === 1 || e.which === 1) || touch) {
        e.preventDefault();
        
        const x = touch ? e.touches[0].clientX : e.clientX;
        const y = touch ? e.touches[0].clientY : e.clientY;

        const targetOffset = this._targetElm.getBoundingClientRect();

        //offset from the click to the top-left corner of the target (drag)
        offTop = y - targetOffset.y;
        offLeft = x - targetOffset.x;
        //offset from the click to the bottom-right corner of the target (resize)
        offBottom = y - (targetOffset.y + targetOffset.height);
        offRight = x - (targetOffset.x + targetOffset.width);

        vw = window.innerWidth;
        vh = window.innerHeight;

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
    this.destroy(); // prevent events from getting binded twice
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
      this._handleElm.addEventListener('touchstart', this._dragStartHandler);
      document.removeEventListener('touchmove', this._dragMoveHandler);
      document.removeEventListener('touchend', this._dragEndHandler);
    }
  }
}

// export default VtWindow;

// function throttle(func, wait, options) {
//   var context, args, result;
//   var timeout = null;
//   var previous = 0;
//   if (!options) options = {};
//   var later = function() {
//     previous = options.leading === false ? 0 : Date.now();
//     timeout = null;
//     result = func.apply(context, args);
//     if (!timeout) context = args = null;
//   };
//   return function() {
//     var now = Date.now();
//     if (!previous && options.leading === false) previous = now;
//     var remaining = wait - (now - previous);
//     context = this;
//     args = arguments;
//     if (remaining <= 0 || remaining > wait) {
//       if (timeout) {
//         clearTimeout(timeout);
//         timeout = null;
//       }
//       previous = now;
//       result = func.apply(context, args);
//       if (!timeout) context = args = null;
//     } else if (!timeout && options.trailing !== false) {
//       timeout = setTimeout(later, remaining);
//     }
//     return result;
//   };
// }
