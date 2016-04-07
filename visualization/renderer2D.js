/*
 *
 *                  xxxxxxx      xxxxxxx
 *                   x:::::x    x:::::x
 *                    x:::::x  x:::::x
 *                     x:::::xx:::::x
 *                      x::::::::::x
 *                       x::::::::x
 *                       x::::::::x
 *                      x::::::::::x
 *                     x:::::xx:::::x
 *                    x:::::x  x:::::x
 *                   x:::::x    x:::::x
 *              THE xxxxxxx      xxxxxxx TOOLKIT
 *
 *                  http://www.goXTK.com
 *
 * Copyright (c) 2012 The X Toolkit Developers <dev@goXTK.com>
 *
 *    The X Toolkit (XTK) is licensed under the MIT License:
 *      http://www.opensource.org/licenses/mit-license.php
 *
 *      "Free software" is a matter of liberty, not price.
 *      "Free" as in "free speech", not as in "free beer".
 *                                         - Richard M. Stallman
 *
 *
 */

// provides
goog.provide('X.renderer2D');
// requires
goog.require('X.renderer');
goog.require('goog.math.Vec3');
goog.require('goog.vec.Vec4');


/**
 * Create a 2D renderer inside a given DOM Element.
 *
 * @constructor
 * @extends X.renderer
 */
X.renderer2D = function() {

  //
  // call the standard constructor of X.renderer
  goog.base(this);

  //
  // class attributes

  /**
   * @inheritDoc
   * @const
   */
  this._classname = 'renderer2D';

  /**
   * The orientation of this renderer.
   *
   * @type {?string}
   * @protected
   */
  this._orientation = null;

  /**
   * The orientation index in respect to the
   * attached volume and its scan direction.
   *
   * @type {!number}
   * @protected
   */
  this._orientationIndex = -1;

  /**
   * The array of orientation colors.
   *
   * @type {!Array}
   * @protected
   */
  this._orientationColors = [];

  /**
   * A frame buffer for slice data.
   *
   * @type {?Element}
   * @protected
   */
  this._frameBuffer = null;

  /**
   * The rendering context of the slice frame buffer.
   *
   * @type {?Object}
   * @protected
   */
  this._frameBufferContext = null;

  /**
   * A frame buffer for label data.
   *
   * @type {?Element}
   * @protected
   */
  this._labelFrameBuffer = null;

  /**
   * The rendering context of the label frame buffer.
   *
   * @type {?Object}
   * @protected
   */
  this._labelFrameBufferContext = null;

  /**
   * The current slice width.
   *
   * @type {number}
   * @protected
   */
  this._sliceWidth = 0;

  /**
   * The current slice height.
   *
   * @type {number}
   * @protected
   */
  this._sliceHeight = 0;

  /**
   * The current slice width spacing.
   *
   * @type {number}
   * @protected
   */
  this._sliceWidthSpacing = 0;

  /**
   * The current slice height spacing.
   *
   * @type {number}
   * @protected
   */
  this._sliceHeightSpacing = 0;

  /**
   * The buffer of the current slice index.
   *
   * @type {!number}
   * @protected
   */
  this._currentSlice = -1;

  /**
   * The buffer of the current lower threshold.
   *
   * @type {!number}
   * @protected
   */
  this._lowerThreshold = -1;

  /**
   * The buffer of the current upper threshold.
   *
   * @type {!number}
   * @protected
   */
  this._upperThreshold = -1;

  /**
   * The buffer of the current w/l low value.
   *
   * @type {!number}
   * @protected
   */
  this._windowLow = -1;

  /**
   * The buffer of the current w/l high value.
   *
   * @type {!number}
   * @protected
   */
  this._windowHigh = -1;

  /**
   * The buffer of the showOnly labelmap color.
   *
   * @type {!Float32Array}
   * @protected
   */
  this._labelmapShowOnlyColor = new Float32Array([-255, -255, -255, -255]);

  /**
   * Is scale normalized.
   *
   * @type {!number}
   * @protected
   */

  this._normalizedScale = 1;

  /**
   *
   *
   * @type {Array}
   * @protected
   */
  this._pointer = [-1, -1, -1, -1, -1, -1, -1];

  /**
   * Flip canvas rows.
   *
   * @type {!number}
   */
  this._flipRows = 1;

  /**
   * Flip canvas column.
   *
   * @type {!number}
   */
  this._flipColumns = 1;

  /**
   * Rotate canvas angle (radians).
   *
   * @type {!number}
   */
  this._rotate = 2 * Math.PI;

/**
   * The convention we follow to draw the 2D slices. TRUE for RADIOLOGY, FALSE for NEUROLOGY.
   *
   * @type {!boolean}
   */
  this._invert = false;

};
// inherit from X.base
goog.inherits(X.renderer2D, X.renderer);

/**
 * @inheritDoc
 */
X.renderer2D.prototype.remove = function(object) {

  // call the remove_ method of the superclass
  goog.base(this, 'remove', object);

  this._objects.remove(object);

  return true;

};
/**
 * Overload this function to execute code after scrolling has completed and just
 * before the next rendering call.
 *
 * @public
 */
X.renderer2D.prototype.onScroll = function() {

  // do nothing
};


/**
 * Rotate the camera by 90 degrees clockwise.
 *
 * @public
 */
X.renderer2D.prototype.rotate = function() {

  this._rotate += Math.PI * 0.5;
  this._camera.reset();
  this.autoScale_();
};

/**
 * Flip data vertically.
 *
 * @public
 */
X.renderer2D.prototype.flipRows = function() {

  this._flipRows *= -1;
  this._camera.reset();
  this.autoScale_();
};

/**
 * Flip data horizontally.
 *
 * @public
 */
X.renderer2D.prototype.flipColumns = function() {

  this._flipColumns *= -1;
  this._camera.reset();
  this.autoScale_();
};
/**
 * Overload this function to execute code after window/level adjustment has
 * completed and just before the next rendering call.
 *
 * @public
 */
X.renderer2D.prototype.onWindowLevel = function() {

  // do nothing
};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.onScroll_ = function(event) {

  goog.base(this, 'onScroll_', event);

  // grab the current volume
  var _volume = this._topLevelObjects[0];

  // .. if there is none, exit right away
  if (!_volume) {

    return;

  }

  // switch between different orientations
  var _orientation = "";

  if (this._orientationIndex == 0) {

    _orientation = "indexX";

  } else if (this._orientationIndex == 1) {

    _orientation = "indexY";

  } else {

    _orientation = "indexZ";

  }

  // window.console.log(event);
  if (event['up']) {

    // yes, scroll up
    _volume[_orientation] = _volume[_orientation] + 1;

  } else {

    // yes, so scroll down
    _volume[_orientation] = _volume[_orientation] - 1;

  }

  // execute the callback
  eval('this.onScroll();');

  // .. and trigger re-rendering
  // this.render_(false, false);
};


/**
 * Performs window/level adjustment for the currently loaded volume.
 *
 * @param {!X.event.WindowLevelEvent} event The window/level event from the
 *          camera.
 */
X.renderer2D.prototype.onWindowLevel_ = function(event) {

  // grab the current volume
  var _volume = this._topLevelObjects[0];

  // .. if there is none, exit right away
  if (!_volume) {
    return;
  }

  // update window level
  var _old_window = _volume._windowHigh - _volume._windowLow;
  var _old_level = _old_window / 2;

  // shrink/expand window
  var _new_window = parseInt(_old_window + (_old_window / 15) * -event._window,
      10);

  // increase/decrease level
  var _new_level = parseInt(_old_level + (_old_level / 15) * event._level, 10);

  // TODO better handling of these cases
  if (_old_window == _new_window) {
    _new_window++;
  }
  if (_old_level == _new_level) {
    _new_level++;
  }

  // re-propagate
  _volume._windowLow -= parseInt(_old_level - _new_level, 10);
  _volume._windowLow -= parseInt(_old_window - _new_window, 10);
  _volume._windowLow = Math.max(_volume._windowLow, _volume._min);
  _volume._windowHigh -= parseInt(_old_level - _new_level, 10);
  _volume._windowHigh += parseInt(_old_window - _new_window, 10);
  _volume._windowHigh = Math.min(_volume._windowHigh, _volume._max);

  // execute the callback
  eval('this.onWindowLevel();');

};


/**
 * Get the orientation of this renderer. Valid orientations are 'x','y','z' or
 * null.
 *
 * @return {?string} The orientation of this renderer.
 */
X.renderer2D.prototype.__defineGetter__('orientation', function() {

  return this._orientation;

});


/**
 * Set the orientation for this renderer. Valid orientations are 'x','y' or 'z' or 'axial',
 * 'sagittal' or 'coronal'.
 *
 * AXIAL == Z
 * SAGITTAL == X
 * CORONAL == Y
 *
 * @param {!string} orientation The orientation for this renderer: 'x','y' or
 *          'z' or 'axial', 'sagittal' or 'coronal'.
 * @throws {Error} An error, if the given orientation was wrong.
 */
X.renderer2D.prototype.__defineSetter__('orientation', function(orientation) {

  orientation = orientation.toUpperCase();

  if (orientation == 'AXIAL') {

    orientation = 'Z';
    this._orientationIndex = 2;

  } else if (orientation == 'SAGITTAL') {

    orientation = 'X';
    this._orientationIndex = 0;

  } else if (orientation == 'CORONAL') {

    orientation = 'Y';
    this._orientationIndex = 1;

  }

  if (orientation != 'X' && orientation != 'Y' && orientation != 'Z') {

    throw new Error('Invalid orientation.');

  }

  this._orientation = orientation;

  var _volume = this._topLevelObjects[0];

});


/**
 * Get the convention of this renderer.
 *
 * @return {!boolean} TRUE if the RADIOLOGY convention is used, FALSE if the
 *                    NEUROLOGY convention is used.
 */
X.renderer2D.prototype.__defineGetter__('radiological', function() {

  return this._radiological;

});

X.renderer2D.prototype.__defineGetter__('normalizedScale', function() {

  return this._normalizedScale;

});

X.renderer2D.prototype.__defineGetter__('canvasWidth', function() {

  return this._canvas.width;

});

X.renderer2D.prototype.__defineGetter__('canvasHeight', function() {

  return this._canvas.height;

});

X.renderer2D.prototype.__defineGetter__('sliceWidth', function() {

  return this._sliceWidth;

});

X.renderer2D.prototype.__defineGetter__('sliceHeight', function() {

  return this._sliceHeight;

});


/**
 * Set the convention for this renderer. There is a difference between radiological and neurological
 * convention in terms of treating the coronal left and right.
 *
 * Default is the radiological convention.
 *
 * @param {!boolean} radiological TRUE if the RADIOLOGY convention is used, FALSE if the
 *                                NEUROLOGY convention is used.
 */
X.renderer2D.prototype.__defineSetter__('radiological', function(radiological) {

  this._radiological = radiological;

});


/**
 * @inheritDoc
 */
X.renderer2D.prototype.init = function() {

  // make sure an orientation is configured
  if (!this._orientation) {

    throw new Error('No 2D orientation set.');

  }

  // call the superclass' init method
  goog.base(this, 'init', '2d');

  // use the background color of the container by setting transparency here
  this._context.fillStyle = "rgba(50,50,50,0)";

  // .. and size
  this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);

  // create an invisible canvas as a framebuffer
  this._frameBuffer = goog.dom.createDom('canvas');
  this._labelFrameBuffer = goog.dom.createDom('canvas');

  //
  //
  // try to apply nearest-neighbor interpolation -> does not work right now
  // so we ignore it
  // this._labelFrameBuffer.style.imageRendering = 'optimizeSpeed';
  // this._labelFrameBuffer.style.imageRendering = '-moz-crisp-edges';
  // this._labelFrameBuffer.style.imageRendering = '-o-crisp-edges';
  // this._labelFrameBuffer.style.imageRendering = '-webkit-optimize-contrast';
  // this._labelFrameBuffer.style.imageRendering = 'optimize-contrast';
  // this._labelFrameBuffer.style.msInterpolationMode = 'nearest-neighbor';
    this._labelFrameBuffer.style.imageRendering = 'pixelated';

  // listen to window/level events of the camera
  goog.events.listen(this._camera, X.event.events.WINDOWLEVEL,
      this.onWindowLevel_.bind(this));

};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.onResize_ = function() {

  // call the super class
  goog.base(this, 'onResize_');

  // in 2D we also want to perform auto scaling
  this.autoScale_();

};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.resetViewAndRender = function() {

  // call the super class
  goog.base(this, 'resetViewAndRender');

  // .. and perform auto scaling
  this.autoScale_();

  // .. and reset the window/level
  var _volume = this._topLevelObjects[0];

  // .. if there is none, exit right away
  if (_volume) {

    _volume._windowHigh = _volume._max;
    _volume._windowLow = _volume._min;

  }
  // .. render
  // this.render_(false, false);
};


/**
 * Convenience method to get the index of the volume container for a given
 * orientation.
 *
 * @param {?string} targetOrientation The orientation required.
 * @return {!number} The index of the volume children.
 * @private
 */
X.renderer2D.prototype.volumeChildrenIndex_ = function(targetOrientation) {

  if (targetOrientation == 'X') {

    return 0;

  } else if (targetOrientation == 'Y') {


    return 1;

  } else {

    return 2;
  }
};


 /**
 * Get the existing X.object with the given id.
 *
 * @param {!X.object} object The displayable object to setup within this
 *          renderer.
 * @public
 */
 X.renderer2D.prototype.update = function(object) {
    // update volume info
    this.update_(object);
    // force redraw
    this._currentSlice = -1;
 }

/**
 * @inheritDoc
 */
X.renderer2D.prototype.update_ = function(object) {

  // call the update_ method of the superclass
  goog.base(this, 'update_', object);

  // check if object already existed..
  var existed = false;
  if (this.get(object._id)) {

    // this means, we are updating
    existed = true;

  }

  if (!(object instanceof X.volume)) {

    // we only add volumes in the 2d renderer for now
    return;

  }


  // var id = object._id;
  // var texture = object._texture;
  var file = object._file;
  var labelmap = object._labelmap; // here we access directly since we do not
  // want to create one using the labelmap() singleton accessor

  var colortable = object._colortable;

  //
  // LABEL MAP
  //
  if (goog.isDefAndNotNull(labelmap) && goog.isDefAndNotNull(labelmap._file) &&
      labelmap._file._dirty) {

    // a labelmap file is associated to this object and it is dirty..
    // background: we always want to parse label maps first
    // run the update_ function on the labelmap object

    this.update_(labelmap);

    // jump out
    return;

  }

  //
  // COLOR TABLE
  //
  if (goog.isDefAndNotNull(colortable) &&
      goog.isDefAndNotNull(colortable._file) && colortable._file._dirty) {

    // a colortable file is associated to this object and it is dirty..
    // start loading
    this._loader.load(colortable, object);

    return;

  }

  //
  // VOLUME
  //
  // with multiple files
  if (goog.isDefAndNotNull(file) && goog.isArray(file)) {

    // this object holds multiple files, a.k.a it is a DICOM series
    // check if we already loaded all the files
    if (!goog.isDefAndNotNull(object.MRI)) {

      // no files loaded at all, start the loading
      var _k = 0;
      var _len = file.length;

      for (_k = 0; _k < _len; _k++) {

        // start loading of each file..
        this._loader.load(file[_k], object);

      }

      return;

    } else if (object.MRI.loaded_files != file.length) {

      // still loading
      return;

    }

    // just continue

  }

  // with one file
  else if (goog.isDefAndNotNull(file) && file._dirty) {

    // this object is based on an external file and it is dirty..
    // start loading..
    this._loader.load(object, object);

    return;

  }

  //
  // at this point the orientation of this renderer might have changed so we
  // should recalculate all the cached values

  // volume dimensions
  var _dim = object._dimensions;

  // check the orientation and store a pointer to the slices
  this._orientationIndex = this.volumeChildrenIndex_(this._orientation);

  // if not children, something went wrong
  if(!object._children[this._orientationIndex]){
    return;
  }

  // size
  this._slices = object._children[this._orientationIndex]._children;

  var _currentSlice = null;
  if (this._orientationIndex == 0) {

    _currentSlice = object['indexX'];

  } else if (this._orientationIndex == 1) {

    _currentSlice = object['indexY'];

  } else {

    _currentSlice = object['indexZ'];

  }

  var _width = object._children[this._orientationIndex]._children[_currentSlice]._iWidth;
  var _height = object._children[this._orientationIndex]._children[_currentSlice]._iHeight;
  // spacing
  this._sliceWidthSpacing = object._children[this._orientationIndex]._children[_currentSlice]._widthSpacing;
  this._sliceHeightSpacing = object._children[this._orientationIndex]._children[_currentSlice]._heightSpacing;

  // .. and store the dimensions
  this._sliceWidth = _width;
  this._sliceHeight = _height;

  // update the invisible canvas to store the current slice
  var _frameBuffer = this._frameBuffer;
  _frameBuffer.width = _width;
  _frameBuffer.height = _height;

  var _frameBuffer2 = this._labelFrameBuffer;
  _frameBuffer2.width = _width;
  _frameBuffer2.height = _height;

  // .. and the context
  this._frameBufferContext = _frameBuffer.getContext('2d');
  this._labelFrameBufferContext = _frameBuffer2.getContext('2d');

  // do the following only if the object is brand-new
  if (!existed) {

    this._objects.add(object);
    this.autoScale_();

  }

};


/**
 * Adjust the zoom (scale) to best fit the current slice.
 */
X.renderer2D.prototype.autoScale_ = function() {

  // let's auto scale for best fit
  var _wScale = this._width / (this._sliceWidth * this._sliceWidthSpacing);
  var _hScale = this._height / (this._sliceHeight * this._sliceHeightSpacing);

  var _autoScale = Math.min(_wScale, _hScale);

  // propagate scale (zoom) to the camera
  var _view = this._camera._view;
  _view[14] = _autoScale;

};


/**
 * Callback for slice navigation, f.e. to update sliders.
 *
 * @public
 */
X.renderer2D.prototype.onSliceNavigation = function() {

  // should be overloaded

};

/**
 * Rotate vector around angle, clockwise
 *
 * @param {!number} xComponent value of the x component of the vector.
 * @param {!number} yComponent value of the y component of the vector.
 * @param {!number} angle rotation angle in radians.
 */
X.renderer2D.prototype.rotateVector_ = function(xComponent, yComponent, angle){
  var rotatedVector = {
    x: xComponent * Math.cos(this._rotate) + yComponent * Math.sin(this._rotate),
    y: -xComponent * Math.sin(this._rotate) + yComponent * Math.cos(this._rotate)
  }

  return rotatedVector
}


/**
 * Convert viewport (canvas) coordinates to volume (index) coordinates.
 *
 * @param x The x coordinate.
 * @param y The y coordinate.
 * @return {?Array} An array of [i,j,k] coordinates or null if out of frame.
 */
X.renderer2D.prototype.xy2ijk = function(x, y) {

  // un-zoom and un-offset
  // there get coordinates in a normla view

  var _volume = this._topLevelObjects[0];
  var _view = this._camera._view;
  var _currentSlice = null;

  var _sliceWidth = this._sliceWidth;
  var _sliceHeight = this._sliceHeight;
  var _sliceWSpacing = null;
  var _sliceHSpacing = null;

  // get current slice
  // which color?
  if (this._orientation == "Y") {
    _currentSlice = this._slices[parseInt(_volume['indexY'], 10)];
    _sliceWSpacing = _currentSlice._widthSpacing;
    _sliceHSpacing = _currentSlice._heightSpacing;
    this._orientationColors[0] = 'rgba(255,0,0,.3)';
    this._orientationColors[1] = 'rgba(0,0,255,.3)';

  } else if (this._orientation == "Z") {
    _currentSlice = this._slices[parseInt(_volume['indexZ'], 10)];
    _sliceWSpacing = _currentSlice._widthSpacing;
    _sliceHSpacing = _currentSlice._heightSpacing;
    this._orientationColors[0] = 'rgba(255,0,0,.3)';
    this._orientationColors[1] = 'rgba(0,255,0,.3)';

  } else {
    _currentSlice = this._slices[parseInt(_volume['indexX'], 10)];
    _sliceWSpacing = _currentSlice._heightSpacing;
    _sliceHSpacing = _currentSlice._widthSpacing;
    this._orientationColors[0] = 'rgba(0,255,0,.3)';
    this._orientationColors[1] = 'rgba(0,0,255,.3)';

    var _buf = _sliceWidth;
    _sliceWidth = _sliceHeight;
    _sliceHeight = _buf;
  }

  // padding offsets
  var _x = 1 * _view[12];
  var _y = -1 * _view[13]; // we need to flip y here

  // .. and zoom
  var _center = [this._width / 2, this._height / 2];

  // the slice dimensions in canvas coordinates
  var _sliceWidthScaled = _sliceWidth * _sliceWSpacing *
    this._normalizedScale;
  var _sliceHeightScaled = _sliceHeight * _sliceHSpacing *
    this._normalizedScale;

  // the image borders on the left and top in canvas coordinates
  var _image_left2xy = _center[0] - (_sliceWidthScaled / 2);
  var _image_top2xy = _center[1] - (_sliceHeightScaled / 2);

  // incorporate the padding offsets (but they have to be scaled)
  _image_left2xy += _x * this._normalizedScale;
  _image_top2xy += _y * this._normalizedScale;

  if(x>_image_left2xy && x < _image_left2xy + _sliceWidthScaled &&
    y>_image_top2xy && y < _image_top2xy + _sliceHeightScaled){

    var _xNorm = (x - _image_left2xy)/ _sliceWidthScaled;
    var _yNorm = (y - _image_top2xy)/ _sliceHeightScaled;

    _x = _xNorm*_sliceWidth;
    _y = _yNorm*_sliceHeight;
    var _z = _currentSlice._xyBBox[4];

    if (this._orientation == "X") {
      // invert cols
      // then invert x and y to compensate camera +90d rotation
      _x = _sliceWidth - _x;

      var _buf = _x;
      _x = _y;
      _y = _buf;

    }
    else if (this._orientation == "Y") {

      // invert cols
      _x = _sliceWidth - _x;

    }
    else if (this._orientation == "Z") {

      // invert all
      _x = _sliceWidth - _x;
      _y = _sliceHeight - _y;

    }

    // map indices to xy coordinates
    _x = _currentSlice._wmin + _x*_currentSlice._widthSpacing;// - _currentSlice._widthSpacing/2;
    _y = _currentSlice._hmin + _y*_currentSlice._heightSpacing;// - _currentSlice._heightSpacing/2;

    var _xyz = goog.vec.Vec4.createFloat32FromValues(_x, _y, _z, 1);
    var _ijk = goog.vec.Mat4.createFloat32();
    goog.vec.Mat4.multVec4(_currentSlice._XYToIJK, _xyz, _ijk);

    _ijk = [Math.floor(_ijk[0]),Math.floor(_ijk[1]),Math.floor(_ijk[2])];
    // why < 0??
    var _ras = goog.vec.Mat4.createFloat32();
    goog.vec.Mat4.multVec4(_currentSlice._XYToRAS, _xyz, _ras);

    var _dx = _volume._childrenInfo[0]._sliceNormal[0]*_ras[0]
      + _volume._childrenInfo[0]._sliceNormal[1]*_ras[1]
      + _volume._childrenInfo[0]._sliceNormal[2]*_ras[2]
      + _volume._childrenInfo[0]._originD;

    var _ix = Math.round(_dx/_volume._childrenInfo[0]._sliceSpacing);
     if(_ix >= _volume._childrenInfo[0]._nb){
       _ix = _volume._childrenInfo[0]._nb - 1;
     }
     else if(_ix < 0){
       _ix = 0;
      }


    var _dy = _volume._childrenInfo[1]._sliceNormal[0]*_ras[0]
      + _volume._childrenInfo[1]._sliceNormal[1]*_ras[1]
      + _volume._childrenInfo[1]._sliceNormal[2]*_ras[2]
      + _volume._childrenInfo[1]._originD;

    var _iy = Math.round(_dy/_volume._childrenInfo[1]._sliceSpacing);
    if(_iy >= _volume._childrenInfo[1]._nb){
       _iy = _volume._childrenInfo[1]._nb - 1;
    }
    else if(_iy < 0) {
      _iy = 0;
    }

    // get plane distance from the origin
    var _dz = _volume._childrenInfo[2]._sliceNormal[0]*_ras[0]
      + _volume._childrenInfo[2]._sliceNormal[1]*_ras[1]
      + _volume._childrenInfo[2]._sliceNormal[2]*_ras[2]
      + _volume._childrenInfo[2]._originD;

    var _iz = Math.round(_dz/_volume._childrenInfo[2]._sliceSpacing);
    if(_iz >= _volume._childrenInfo[2]._nb){
      _iz = _volume._childrenInfo[2]._nb - 1;
    }
    else if(_iz < 0){
      // translate origin by distance
      _iz = 0;
    }

    return [[_ix, _iy, _iz], [_ijk[0], _ijk[1], _ijk[2]], [_ras[0], _ras[1], _ras[2]]];
    }

  return null;
};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.render_ = function(picking, invoked) {

  // call the render_ method of the superclass
  goog.base(this, 'render_', picking, invoked);

  // only proceed if there are actually objects to render
  if (this._objects.values().length == 0) {

    // there is nothing to render
    return;
  }

  // grab the volume and current slice index
  var _volume = this._topLevelObjects[0];
  var _currentSlice = this.getCurrentSliceIndex_(_volume);

  //if slice do not exist yet, we have to set slice dimensions
  this._sliceWidth = this._slices[_currentSlice]._iWidth;
  this._sliceHeight = this._slices[_currentSlice]._iHeight;

  // spacing
  this._sliceWidthSpacing = this._slices[_currentSlice]._widthSpacing;
  this._sliceHeightSpacing = this._slices[_currentSlice]._heightSpacing;

  var _labelmapShowOnlyColor = null;

  if (_volume._labelmap) {

    // since there is a labelmap, get the showOnlyColor property
    _labelmapShowOnlyColor = _volume._labelmap._showOnlyColor;
  }

  // caching mechanism, we need to redraw the pixels only:
  // - if the _currentSlice has changed
  // - if the threshold has changed
  // - if the window/level has changed
  // - the labelmap show only color has changed
  var _redraw_required = (
      this._currentSlice != _currentSlice ||
      this._lowerThreshold != _volume._lowerThreshold ||
      this._upperThreshold != _volume._upperThreshold ||
      this._windowLow != _volume._windowLow ||
      this._windowHigh != _volume._windowHigh || (_labelmapShowOnlyColor && !X.array
      .compare(_labelmapShowOnlyColor, this._labelmapShowOnlyColor, 0, 0, 4)));

  if (_redraw_required) {

    this.updateBuffers_(_volume);
  }

  //
  // the actual drawing (rendering) happens here
  //
  this.renderBuffers_(_volume);

  // if enabled, show slice navigators
  if (this._config['SLICENAVIGATORS']) {

    this.drawSliceNavigators_(_volume);
  }

  // draw pointer hack
  if (this._pointer[0] !== -1 /*&& ! this._interactor._shiftDown*/) {

    // if slice changed, set to null and exit
    if (_currentSlice != this._pointer[2]) {

      this._pointer = [-1, -1, -1, -1, -1, -1, -1];

    } else {

      this.drawPointer_();
    }
  }
};

/**
 * Get value of slice Y color.
 *
 * @return {!Array} pointer.
 *
 * @public
 */
X.renderer2D.prototype.__defineGetter__('pointer', function() {

  return this._pointer;

});

/**
 * Set value of pointer.
 *
 * @param {!Array} pointer Value between -1 and 1.
 *
 * @public
 */
X.renderer2D.prototype.__defineSetter__('pointer', function(pointer) {

  this._pointer[0] = pointer[0];
  this._pointer[1] = pointer[1];
  this._pointer[2] = pointer[2];
  this._pointer[3] = pointer[3];
  this._pointer[4] = pointer[4];
  this._pointer[5] = pointer[5];
  this._pointer[6] = pointer[6];

});

/**
 * Get current slice index for a give volume.
 *
 * @param {!X.volume} The volume object
 * @return {?number} ix The current slice's index.
 */
X.renderer2D.prototype.getCurrentSliceIndex_ = function(volume) {

  var _currentIx = null;

  if (this._orientationIndex == 0) {

    _currentIx = volume['indexX'];

  } else if (this._orientationIndex == 1) {

    _currentIx = volume['indexY'];

  } else {

    _currentIx = volume['indexZ'];
  }

  return parseInt(_currentIx, 10);
};

/**
 * Update invisible buffers.
 *
 * @param {!X.volume} The volume object
 */
X.renderer2D.prototype.updateBuffers_ = function(volume) {

  // FRAME BUFFERING

  var _sliceWidth = this._sliceWidth;
  var _sliceHeight = this._sliceHeight;

  // grab the current pixels
  var _imageFBContext = this._frameBufferContext;
  var _imageData = _imageFBContext.getImageData(0, 0, _sliceWidth, _sliceHeight);
  var _pixels = _imageData.data;
  var _pixelsLength = _pixels.length;

  var _labelFBContext = this._labelFrameBufferContext;
  var _labelmapData = _labelFBContext.getImageData(0, 0, _sliceWidth, _sliceHeight);
  var _labelPixels = _labelmapData.data;

  // update FBs with new size
  // has to be there, not sure why, too slow to be in main loop?
  this._frameBuffer.width = _sliceWidth;
  this._frameBuffer.height = _sliceHeight;
  this._labelFrameBuffer.width = _sliceWidth;
  this._labelFrameBuffer.height = _sliceHeight;

  // threshold values
  var _maxScalarRange = volume._max;
  var _lowerThreshold = volume._lowerThreshold;
  var _upperThreshold = volume._upperThreshold;
  var _windowLow = volume._windowLow;
  var _windowHigh = volume._windowHigh;

  if (volume._labelmap) {

    // since there is a labelmap, get the showOnlyColor property
    var _labelmapShowOnlyColor = volume._labelmap._showOnlyColor;
  }

  // .. here is the current slice
  var _currentSlice = this.getCurrentSliceIndex_(volume);
  var _slice = this._slices[_currentSlice];
  var _sliceData = _slice._texture._rawData;
  var _currentLabelMap = _slice._labelmap;

  if (_currentLabelMap) { var _labelData = _currentLabelMap._rawData; }

  // loop through the pixels and draw them to the invisible canvas
  // from bottom right up
  // also apply thresholding
  var _index = 0;
  do {

    // default color and label is just transparent
    var _color = [0, 0, 0, 0];
    var _label = [0, 0, 0, 0];
    var _fac1 = volume._max - volume._min;

    // grab the pixel intensity
    // slice data is normalized (probably shouldn't ?)
    // de-normalize it (get real value)
    var _intensity = (_sliceData[_index] / 255) * _fac1 + volume._min;

    // apply window/level
    var _window = _windowHigh - _windowLow;
    var _level = _window/2 + _windowLow;

    var _origIntensity = 0;

    if(_intensity < _level - _window/2 ){

      _origIntensity = 0;

    } else if(_intensity > _level + _window/2 ){

      _origIntensity = 255;

    } else{

      _origIntensity  = 255 * (_intensity - (_level - _window / 2))/_window;
    }

    // apply thresholding
    if (_intensity >= _lowerThreshold && _intensity <= _upperThreshold) {

      // current intensity is inside the threshold range so use the real
      // intensity

      // map volume scalars to a linear color gradient
      var maxColor = new goog.math.Vec3(volume._maxColor[0],
          volume._maxColor[1], volume._maxColor[2]);

      var minColor = new goog.math.Vec3(volume._minColor[0],
          volume._minColor[1], volume._minColor[2]);

      _color = maxColor.scale(_origIntensity).add(minColor.scale(255 - _origIntensity));

      // .. and back to an array
      _color = [Math.floor(_color.x), Math.floor(_color.y), Math.floor(_color.z), 255];

      if (_currentLabelMap) {

        // we have a label map here
        // check if all labels are shown or only one
        if (_labelmapShowOnlyColor[3] == -255) {

          // all labels are shown
          _label = [_labelData[_index], _labelData[_index + 1],
                    _labelData[_index + 2], _labelData[_index + 3]];

        } else {

          // show only the label which matches in color
          if (X.array.compare(_labelmapShowOnlyColor, _labelData, 0, _index,4)) {

            // this label matches
            _label = [_labelData[_index], _labelData[_index + 1],
                      _labelData[_index + 2], _labelData[_index + 3]];
          }
        }
      }
    }

    //if(this._orientation == "X")
      // invert nothing
      _pixels[_index] = _color[0]; // r
      _pixels[_index + 1] = _color[1]; // g
      _pixels[_index + 2] = _color[2]; // b
      _pixels[_index + 3] = _color[3]; // a
      _labelPixels[_index] = _label[0]; // r
      _labelPixels[_index + 1] = _label[1]; // g
      _labelPixels[_index + 2] = _label[2]; // b
      _labelPixels[_index + 3] = _label[3]; // a

    _index += 4; // increase by 4 units for r,g,b,a

  } while (_index < _pixelsLength);

  // store the generated image data to the frame buffer context
  _imageFBContext.putImageData(_imageData, 0, 0);
  _labelFBContext.putImageData(_labelmapData, 0, 0);

  // cache current slice index and values which might require a redraw
  this._currentSlice = _currentSlice;
  this._lowerThreshold = _lowerThreshold;
  this._upperThreshold = _upperThreshold;
  this._windowLow = _windowLow;
  this._windowHigh = _windowHigh;

  if (_currentLabelMap) {

    // only update the setting if we have a labelmap
    this._labelmapShowOnlyColor = _labelmapShowOnlyColor;
  }
};

/**
 * Render invisible buffers on the visible canvas.
 *
 * @param {!X.volume} The volume object
 */
X.renderer2D.prototype.renderBuffers_ = function(volume) {

  // viewport size
  var _width = this._width;
  var _height = this._height;

  // clear the canvas
  this._context.clearRect(-_width, -_height, 2 * _width, 2 * _height);

  // transform the canvas according to the view matrix (4x4 to also handle 3D renderers)
  // .. this includes zoom
  var _view = this._camera._view;
  this._normalizedScale = Math.max(_view[14], 0.0001);
  this._context.setTransform(this._normalizedScale, 0, 0, this._normalizedScale, 0, 0);

  // draw the slice frame buffer (which equals the slice data) to the main
  // context
  this._context.globalAlpha = 1.0; // draw fully opaque

  // move to the middle
  this._context.translate(_width / 2 /this._normalizedScale, _height / 2 /
      this._normalizedScale);

  // rotation
  this._context.rotate(this._rotate);

  // flip rows/columns
  var flipR = this._flipRows;
  var flipC = this._flipColumns;
  if(this._rotate % Math.PI !== 0){
    var tmp = flipC;
    flipC = flipR;
    flipR = tmp;
  }
  this._context.scale(flipC, flipR);

  // padding
  // we need to flip y here
  var _x = 1 * _view[12];
  var _y = -1 * _view[13];

  var translateVector = this.rotateVector_(_x*this._flipRows, _y*this._flipColumns, this._rotate);
  this._context.translate(translateVector.x, translateVector.y);

  // draw the slice
  var _sliceWidth = this._sliceWidth;
  var _sliceHeight = this._sliceHeight;
  var _offset_x = -_sliceWidth * this._sliceWidthSpacing * 0.5;
  var _offset_y = -_sliceHeight * this._sliceHeightSpacing * 0.5;

  this._context.drawImage(this._frameBuffer, _offset_x, _offset_y, _sliceWidth *
      this._sliceWidthSpacing, _sliceHeight * this._sliceHeightSpacing);

  // draw the labels with a configured opacity
  if (volume._labelmap && volume._labelmap._visible) {

    var _labelOpacity = 1;//volume._labelmap._opacity;
    this._context.globalAlpha = _labelOpacity; // draw transparent depending on
    // opacity
    this._context.drawImage(this._labelFrameBuffer, _offset_x, _offset_y,
        _sliceWidth * this._sliceWidthSpacing, _sliceHeight *
            this._sliceHeightSpacing);
  }
};

/**
 * Draw slice navigators on the canvas.
 *
 * @param {!X.volume} The volume object
 */
X.renderer2D.prototype.drawSliceNavigators_ = function(volume) {

  this._canvas.style.cursor = "none";

  // but only if the shift key is down and the left mouse is not
  if (this._interactor._mouseInside && this._interactor._shiftDown &&
      !this._interactor._leftButtonDown) {

    var _mousePosition = this._interactor._mousePosition;

    // check if we are over the slice
    var ijk = this.xy2ijk(_mousePosition[0], _mousePosition[1]);

    if (ijk) {
      // // we are over the slice
      // update the volume
      volume._indexX = ijk[0][0];
      volume._indexY = ijk[0][1];
      volume._indexZ = ijk[0][2];
      volume.modified(false);

      this['onSliceNavigation']();

      //this.drawVolumeCoordinates_(volume, ijk);

      // set pointer
      this._pointer = [
        ijk[1][0].toFixed(0),
        ijk[1][1].toFixed(0),
        ijk[1][2].toFixed(0),
        ijk[2][0].toFixed(0),
        ijk[2][1].toFixed(0),
        ijk[2][2].toFixed(0),
        ijk[1][0].toFixed(0)
        ];
      }
    // throw an event!
    var e = new CustomEvent("onPoint");
    // .. fire the event
    this.dispatchEvent(e);

  } else{

    this._canvas.style.cursor = "default";
  }
};

/**
 * Draw pointer on the canvas.
 */
X.renderer2D.prototype.drawPointer_ = function() {

  // map IJK to texture
  // invert all (i and j?)
  var x = this._pointer[0];
  var y = this._pointer[1];

  // window.console.log(x,y);

  // to texture normalized
  var xNorm = 1 - x / this._sliceWidth;
  var yNorm = 1 - y / this._sliceHeight;

  // .. and zoom
  var _center = [this._width / 2, this._height / 2];

  // the slice dimensions in canvas coordinates
  var _sliceWidthScaled = this._sliceWidth * this._sliceWidthSpacing *
    this._normalizedScale;
  var _sliceHeightScaled = this._sliceHeight * this._sliceHeightSpacing *
    this._normalizedScale;

  // the image borders on the left and top in canvas coordinates
  var _image_left2xy = _center[0] - (_sliceWidthScaled / 2);
  var _image_top2xy = _center[1] - (_sliceHeightScaled / 2);

  // incorporate the padding offsets (but they have to be scaled)
  var _view = this._camera._view;
  var _x2 = 1 * _view[12];
  var _y2 = -1 * _view[13]; // we need to flip y here
  _image_left2xy += _x2 * this._normalizedScale;
  _image_top2xy += _y2 * this._normalizedScale;

  var testX = xNorm * _sliceWidthScaled + _image_left2xy;
  var testY = yNorm * _sliceHeightScaled + _image_top2xy;

  /*var _x2Norm = (x - _image_left2xy)/ _sliceWidthScaled;
  var _y2Norm = (y - _image_top2xy)/ _sliceHeightScaled;

  _x2 = _x2Norm*this._sliceWidth;
  _y2 = _y2Norm*this._sliceHeight;

  // invert all
  _x2 = this._sliceWidth - _x2;
  _y2 = this._sliceWidth - _y2;

  // map indices to xy coordinates
  _x2 = _currentSlice._wmin + _x2*_currentSlice._widthSpacing;// - _currentSlice._widthSpacing/2;
  _y2 = _currentSlice._hmin + _y2*_currentSlice._heightSpacing;// - _currentSlice._heightSpacing/2;*/

  this._context.setTransform(1, 0, 0, 1, 0, 0);
  this._context.lineWidth = 2;
  this._context.strokeStyle = 'rgba(33,150,243,1)';

  this._context.beginPath();
  this._context.moveTo(testX - 10 , testY + 10);
  this._context.lineTo(testX, testY + 1);
  this._context.lineTo(testX + 10, testY + 10);

  this._context.stroke();
  this._context.closePath();
};

/**
 * Draw volume coordinates to the canvas.
 *
 * @param {!X.volume} The volume object
 * @param {!Array} An array of [i,j,k] coordinates.
 */
/*X.renderer2D.prototype.drawVolumeCoordinates_ = function(_volume, ijk) {

  // this._context.setTransform(1, 0, 0, 1, 0, 0);
  // this._context.lineWidth = 2;
  // this._context.strokeStyle = 'rgba(33,150,243,1)';

  //   this._context.beginPath();
  //         this._context.moveTo(this._interactor._mousePosition[0] - 10 , this._interactor._mousePosition[1] + 10);
  //         this._context.lineTo(this._interactor._mousePosition[0], this._interactor._mousePosition[1] + 1);
  //         this._context.lineTo(this._interactor._mousePosition[0] + 10, this._interactor._mousePosition[1] + 10);

  //         this._context.stroke();
  //         this._context.closePath();

          // draw the navigators
          // see http://diveintohtml5.info/canvas.html#paths

          // in x-direction
  //         this._context.setTransform(1, 0, 0, 1, 0, 0);
  //         this._context.lineWidth = 1;
  // this._context.strokeStyle = 'rgba(33,150,243,1)';
  //         this._context.beginPath();
  //         this._context.moveTo(this._interactor._mousePosition[0], 0);
  //         this._context.lineTo(this._interactor._mousePosition[0],
  //             this._interactor._mousePosition[1] - 1);
  //         this._context.moveTo(this._interactor._mousePosition[0],
  //             this._interactor._mousePosition[1] + 1);
  //         this._context.lineTo(this._interactor._mousePosition[0],
  //             this._height);
  //         // this._context.strokeStyle = 'rgba(255,0,0,.7)';
  //         this._context.stroke();
  //         this._context.closePath();

  //         // in y-direction
  //         this._context.beginPath();
  //         this._context.moveTo(0, this._interactor._mousePosition[1]);
  //         this._context.lineTo(this._interactor._mousePosition[0] - 1,
  //             this._interactor._mousePosition[1]);
  //         this._context.moveTo(this._interactor._mousePosition[0] + 1, this._interactor._mousePosition[1]);
  //         this._context.lineTo(this._width,
  //             this._interactor._mousePosition[1]);
  //         // this._context.strokeStyle = 'rgba(255,0,0,.7)';
  //         this._context.stroke();
  //         this._context.closePath();

          // write ijk coordinates
          // this._context.font = '10pt Arial';
          // // textAlign aligns text horizontally relative to placement
          // this._context.textAlign = 'left';
          // // textBaseline aligns text vertically relative to font style
          // this._context.textBaseline = 'top';
          // this._context.fillStyle = 'white';
          // this._context.fillText('RAS: ' + ijk[2][0].toFixed(2) + ', ' + ijk[2][1].toFixed(2) + ', ' + ijk[2][2].toFixed(2), 0, 0);

          // var _value = 'undefined';
          // var _valueLM = 'undefined';
          // var _valueCT = 'undefined';
          // if(typeof _volume._IJKVolume[ijk[1][2].toFixed(0)] != 'undefined' && typeof _volume._IJKVolume[ijk[1][2].toFixed(0)][ijk[1][1].toFixed(0)] != 'undefined'){
          //   _value = _volume._IJKVolume[ijk[1][2].toFixed(0)][ijk[1][1].toFixed(0)][ijk[1][0].toFixed(0)];
          //   if(_volume.hasLabelMap){
          //     _valueLM = _volume._labelmap._IJKVolume[ijk[1][2].toFixed(0)][ijk[1][1].toFixed(0)][ijk[1][0].toFixed(0)];
          //     if(_volume._labelmap._colorTable){
          //       _valueCT = _volume._labelmap._colorTable.get(_valueLM);
          //       if(typeof _valueCT != 'undefined'){
          //       _valueCT = _valueCT[0];
          //       }
          //     }
          //   }
          // }
          // // get pixel value
          // this._context.fillText('Background:  ' + _value + ' ('+ ijk[1][0].toFixed(0) + ', ' + ijk[1][1].toFixed(0) + ', ' + ijk[1][2].toFixed(0) + ')', 0, 15);
          // // if any label map
          // if(_volume.hasLabelMap){
          //   this._context.fillText('Labelmap:  ' + _valueCT + ' ('+ _valueLM + ')', 0, 30);
          // }
};*/

// export symbols (required for advanced compilation)
goog.exportSymbol('X.renderer2D', X.renderer2D);
goog.exportSymbol('X.renderer2D.prototype.init', X.renderer2D.prototype.init);
goog.exportSymbol('X.renderer2D.prototype.add', X.renderer2D.prototype.add);
goog.exportSymbol('X.renderer2D.prototype.onShowtime',
    X.renderer2D.prototype.onShowtime);
goog.exportSymbol('X.renderer2D.prototype.onRender',
    X.renderer2D.prototype.onRender);
goog.exportSymbol('X.renderer2D.prototype.onScroll',
    X.renderer2D.prototype.onScroll);
goog.exportSymbol('X.renderer2D.prototype.onWindowLevel',
    X.renderer2D.prototype.onWindowLevel);
goog.exportSymbol('X.renderer2D.prototype.get', X.renderer2D.prototype.get);
goog.exportSymbol('X.renderer2D.prototype.resetViewAndRender',
    X.renderer2D.prototype.resetViewAndRender);
goog.exportSymbol('X.renderer2D.prototype.xy2ijk',
    X.renderer2D.prototype.xy2ijk);
goog.exportSymbol('X.renderer2D.prototype.rotate',
    X.renderer2D.prototype.rotate);
goog.exportSymbol('X.renderer2D.prototype.flipRows',
    X.renderer2D.prototype.flipRows);
goog.exportSymbol('X.renderer2D.prototype.flipColumns',
    X.renderer2D.prototype.flipColumns);
goog.exportSymbol('X.renderer2D.prototype.render',
    X.renderer2D.prototype.render);
goog.exportSymbol('X.renderer2D.prototype.destroy',
    X.renderer2D.prototype.destroy);
goog.exportSymbol('X.renderer2D.prototype.onSliceNavigation', X.renderer2D.prototype.onSliceNavigation);

goog.exportSymbol('X.renderer2D.prototype.afterRender', X.renderer2D.prototype.afterRender);
