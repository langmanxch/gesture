/**
 * @overview Regiester rotate event.
 * @requires gesture.js
 * @desc g.opt('rotate_min_step', 1); to trigger a rotate event only if
 */
(function(g){

'use strict';

var rotations = {};

var rotateMinStep;
g.opt('rotate_min_step', 1);

g.register('rotatestart rotate rotateend', {
  gesturestart: function(e){
    var gid = this._gesture_id;
    rotations[gid] = e.rotation;
    g.createEvent('rotatestart', e);
    rotateMinStep = g.opt('rotate_min_step');
  },
  gesturechange: function(e){
    var gid = this._gesture_id;
    var before  = rotations[gid];
    var current = e.rotation;
    current = adjust(current, before);
    if(Math.abs(current - before) < rotateMinStep){
      return;
    }
    rotations[gid] = current;
    g.createEvent('rotate', e, {
      rotation: current
    });
  },
  gestureend: function(e){
    var gid = this._gesture_id;
    g.createEvent('rotateend', e, {
      rotation: rotations[gid]
    });
  }
});

function adjust(current, before){
  if(current - before > 90){
    current = current - 180;
  }else if(current - before < -90){
    current = current + 180;
  }
  return current;
}

})(g);