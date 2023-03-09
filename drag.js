export default class Drag {
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
    this.options = defaults({
      enabledDrag: true,
      enabledResize: true,

      minWidth: 200,
      maxWidth: Infinity,
      minHeight: 100,
      maxHeight: Infinity,

      dragAllowX: true,
      dragAllowY: true,
      resizeAllowX: true,
      resizeAllowY: true,

      draggingClass: 'drag',

      useMouseEvents: true,
      useTouchEvents: true,

      createHandlers: true,
    }, options);

    // Public properties
    Object.assign(this, options);

    /** @private */
    this._targetElm = targetElm;
    /** @private */
    this._handleElm = handleElm;

    if (this.options.createHandlers) {
      createElement('resize-t', targetElm);
      createElement('resize-r', targetElm);
      createElement('resize-b', targetElm);
      createElement('resize-l', targetElm);
      createElement('resize-tl', targetElm);
      createElement('resize-tr', targetElm);
      createElement('resize-br', targetElm);
      createElement('resize-bl', targetElm);
      
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
    }

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

function createElement(className, parent) {
  const elm = document.createElement('div');
  if (className) elm.classList.add(className);
  if (parent) parent.appendChild(elm);
  return elm;
}

function defaults(defaultObj, options) {
  function isObj(x) { return x !== null && typeof x === "object"; };
  if(isObj(options))
      for (let prop in defaultObj) {
          if (Object.prototype.hasOwnProperty.call(defaultObj, prop) && Object.prototype.hasOwnProperty.call(options, prop)) {
              if (isObj(defaultObj[prop])) defaults(defaultObj[prop], options[prop])
              else defaultObj[prop] = options[prop];
          }
      }
  return defaultObj;
}