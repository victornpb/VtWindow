/**
 * A Virtual windows system for the browser written in vanilla js
 * @see https://github.com/victornpb/VtWindow
 * @author Victor N. wwww.vitim.us
 */
class VtWindow {
  constructor(content, options) {
    this.options = {
      preserveFocusOrder: true, //preserve window order after focusing (disable if you need to use iframes inside windows)
      autoMount: false, //mount on new
      lowEnd: false,

      ...options,
    };

    // private props
    this._id = `instance-${Math.random()}`; //TODO: remove the need for ID or implement propper ID generation
    this._parent = undefined;
    this._mounted = false;
    this._maximized = false;
    this._minimized = false;

    this.el = (() => {
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
     * @param  {string} selector A CSS selector
     * @return {Element} A dom element
     */
    const $ = selector => {
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

    // bind events
    this.DOM.close.onclick = this.hide.bind(this);
    this.DOM.popout.onclick = this.popout.bind(this);
    this.DOM.minimize.onclick = this.minimize.bind(this);
    this.DOM.maximize.onclick = this.maximize.bind(this);
    this.DOM.title.ondblclick = this.maximize.bind(this);

    this._focused = false;

    // auto focus on click
    const focusHandler = e => {
      if (this._focused === false && this._mounted === true) {
        //fired only when switching states
        this.focus();
      }
    };
    this._focusHandler = focusHandler;

    // handler registed when the window gain focus, so it can auto blur when clicking outside window
    const globalBlurHandler = e => {
      if (!this.el.contains(e.target)) {
        // click outside el
        this.blur();
      }
    };
    this._blurHandler = globalBlurHandler;

    this.el.classList.add('vt-window');
    this.el.style.cssText = `
            top: 20px;
            left: 20px;
            width: 400px;
            height: 300px;
        `;

    if (this.options.lowEnd) this.el.classList.add('low-end');

    //init drag n drop
    this._dragMove = new Drag(this.el, this.DOM.header, { mode: 'move' });
    this._dragResize = new Drag(this.el, this.DOM.resize, { mode: 'resize' });

    this.blur();

    if (this.options.autoMount) this.mount();
  }
  mount(parentEl) {
    const parent = parentEl || document.body;
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
  get isMounted() {
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
  get isMinimized() {
    return this._minimized;
  }
  maximize() {
    this._maximized = !this._maximized;
    this.el.classList.toggle('maximized', this._maximized);
    // this.el.style.top = '0';
    // this.el.style.left = '0';
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
  }

  exitpopout() {
    this.el.classList.remove('windowed');
    this.mount();
  }

  setTitle(elm) {
    if (typeof elm === 'string') {
      this.DOM.title.innerHTML = elm;
    } else {
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
    } else {
      this.DOM.body.innerHTML = '';
      this.DOM.body.appendChild(elm);
    }
  }

  focus() {
    this.el.classList.add('focus');
    this._focused = true;

    //bring to front, move down into body
    if (this.options.preserveFocusOrder) {
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

  get isFocused() {
    return this._focused;
  }
  /**
   * Show the close button
   * @param  {Boolean} bool {description}
   */
  set closable(bool) {
    this.DOM.close.style.display = bool ? '' : 'none';
  }
  /**
   * Show the minimize button
   * @param  {Boolean} bool {description}
   */
  set minimizable(bool) {
    this.DOM.minimize.style.display = bool ? '' : 'none';
  }
  /**
   * Enable a virtual window to be deatachable from anoter window (popup)
   * @param  {Boolean} bool {description}
   */
  set deatachable(bool) {
    this.DOM.popout.style.display = bool ? '' : 'none';
  }
  /**
   * Position from the top in pixels
   * @type {Number}
   * @param {Number} px
   */
  set top(px) {
    this.el.style.top = `${px}px`;
  }
  get top() {
    return parseInt(this.el.style.top, 10);
  }
  /**
   * Position from the left in pixels
   * @type {Number}
   * @param {Number} px
   */
  set left(px) {
    this.el.style.left = `${px}px`;
  }
  get left() {
    return parseInt(this.el.style.left, 10);
  }
  /**
   * Width in pixels
   * @type {Number}
   * @param {Number} px
   */
  set width(px) {
    this.el.style.width = `${px}px`;
  }
  get width() {
    return parseInt(this.el.style.width, 10);
  }
  /**
   * Height in pixels
   * @type {Number}
   * @param {Number} px Height in pixels
   */
  set height(px) {
    this.el.style.height = `${px}px`;
  }
  get height() {
    return parseInt(this.el.style.height, 10);
  }
}

class Drag {
  /**
   * Make a element draggable/resizable
   * @param {Element} targetElm The element that will be dragged/resized
   * @param {Element} handleElm The element that will listen to events (handdle/grabber)
   * @param {Object} [options] Options
   * @param {String} [options.mode="move"] Define the type of operation (move/resize)
   *
   */
  constructor(targetElm, handleElm, options) {
    this._options = {
      mode: 'move',
      ...options,
    };

    this._targetElm = targetElm;
    this._handleElm = handleElm;

    let vw = window.innerWidth;
    let vh = window.innerHeight;

    const move = (x, y) => {
      let l = x - offLeft;
      if (x - offLeft < 0) l = 0;
      else if (x - offRight > vw) l = vw - this._targetElm.clientWidth;
      let t = y - offTop;
      if (y - offTop < 0) t = 0;
      else if (y - offBottom > vh) t = vh - this._targetElm.clientHeight;
      
      this._targetElm.style.top = `${t}px`;
      this._targetElm.style.left = `${l}px`;
      // this._targetElm.style.transform = `translate(${l}px, ${t}px)`;
    };

    const resize = (x, y) => {
      let w = x - this._targetElm.offsetLeft - offRight;
      if (x - offRight > vw) w = vw - this._targetElm.offsetLeft; //offscreen
      let h = y - this._targetElm.offsetTop - offBottom;       
      if (y - offBottom > vh) h = vh - this._targetElm.offsetTop; //offscreen

      this._targetElm.style.width = `${w}px`;
      this._targetElm.style.height = `${h}px`;
    };

    // define which operation is performed on drag
    const operation = this._options.mode === 'move' ? move : resize;

    let offLeft, offTop, offBottom, offRight;

    function dragStartHandler(e) {
      const touch = e.type === 'touchstart';

      if (e.buttons === 1 || touch) {
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

        //mouse events
        document.addEventListener('mousemove', this._dragMoveHandler);
        document.addEventListener('mouseup', this._dragEndHandler);
        //touch events
        document.addEventListener('touchmove', this._dragMoveHandler, {
          passive: false,
        });
        document.addEventListener('touchend', this._dragEndHandler);

        this._targetElm.classList.add('drag');
      }
    }

    function dragMoveHandler(e) {
      e.preventDefault();

      const touch = e.type === 'touchmove';

      // If the button is not down, dispatch a "fake" mouse up event, to stop listening to mousemove
      // This happens when the mouseup is not captured (outside the browser)
      if (!touch && e.buttons !== 1) {
        this._dragEndHandler();
        return;
      }

      const y = touch ? e.touches[0].clientY : e.clientY;
      const x = touch ? e.touches[0].clientX : e.clientX;

      operation(x, y);
    }

    function dragEndHandler(e) {
      //touch events
      document.removeEventListener('mousemove', this._dragMoveHandler);
      document.removeEventListener('mouseup', this._dragEndHandler);
      //mouse events
      document.removeEventListener('touchmove', this._dragMoveHandler);
      document.removeEventListener('touchend', this._dragEndHandler);

      this._targetElm.classList.remove('drag');
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
    this._handleElm.addEventListener('mousedown', this._dragStartHandler);
    this._handleElm.addEventListener('touchstart', this._dragStartHandler);
  }

  /**
   * Teardown all events bound to the document and elements
   * You can resurrect this instance by calling enable()
   * @memberOf Drag
   */
  destroy() {
    this.target.classList.remove('drag');

    //mouse events
    this._handleElm.removeEventListener('mousedown', this._dragStartHandler);
    document.removeEventListener('mousemove', this._dragMoveHandler);
    document.removeEventListener('mouseup', this._dragEndHandler);
    //touch events
    this._handleElm.addEventListener('touchstart', this._dragStartHandler);
    document.removeEventListener('touchmove', this._dragMoveHandler);
    document.removeEventListener('touchend', this._dragEndHandler);
  }
}

// export default VtWindow;

function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function() {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function() {
    var now = Date.now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}