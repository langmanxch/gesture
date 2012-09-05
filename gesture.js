
(function(){

'use strict';

var g = window.g = function(elem){
    if ( !(this instanceof g) )
        return new g(elem);
    var elems = arrayify(elem);
    if(!elems || elems.length === 0 ) return;
    for(var i = 0; i < elems.length; i++){
        if(!elems[i]._gesture_id) init(elems[i]);
    }
    this.elems = elems;
};

g.prototype.on = function(type, selector, callback){
    // allow to bind 2+ events at the same time
    var _t = this;
    if(type.search(/\s/) >= 0){
        type.replace(/\S+/g, function(evt){
            _t.on(evt, selector, callback);
        });
        return _t;
    }
    if(type.indexOf('.') !== -1){
    	var array = type.split('.');
    	type = array[0];
    	var namespace = array[1];
    }
    _t[type](selector, callback, namespace);
};

g.prototype.off = function(type, selector, callback){
    // allow to bind 2+ events at the same time
    var _t = this;
    if(type.search(/\s/) >= 0){
        type.replace(/\S+/g, function(evt){
            _t.off(evt, selector, callback);
        });
        return _t;
    }
    if(type.indexOf('.') !== -1){
        var array = type.split('.');
        type = array[0];
        var namespace = array[1];
    }
    if(typeof selector === 'string' && typeof callback === 'function'){
        var identification = type + '-' + selector;
        callback = callback._g_cbs && callback._g_cbs[identification];
    }else if(typeof selector === 'function'){
        callback = selector;
        selector = void 0;
    }
    for(var i = 0; i < this.elems.length; i++){
        var elem = this.elems[i];
        var cbs = callbacks[elem._gesture_id];
        if( !cbs || cbs.length === 0 ) continue;
        for(var j = cbs.length - 1; j >= 0; j--){
            var cb = cbs[j];
            if( (!type || (type === cb.type))
                && (!selector || (selector === cb.selector))
                && (!namespace || (namespace === cb.namespace))
                && (!callback || (callback === cb.callback)) ){
                elem.removeEventListener(cb.type, cb.callback);
                cbs.splice(j, 1);
            }
        }
    }
    return this;
};

g.register = function(event, handler, ifBind){
    if( events[event] ) return console.error('"' + event + '" cannot be regiested twice.');
    events[event] = handler;
    event = event.split(/\s/);
    for(var i = 0; i < event.length; i++){
        register(event[i], ifBind);
    }
    return this;
};
g.unregister = function(event){
    delete events[event];
    event = event.split(/\s/);
    for(var i = 0; i < event.length; i++){
        delete g.prototype[event[i]];
    }
    return this;
};

g.opt = function(k, v){
    if(typeof k !== 'string'){
        for(var i in k){
            opt[i] = k[i];
        }
        return;
    }
    return v === void 0 ? opt[k] : (opt[k]=v);
};

g.createEvent = function(name, e, attrs){
    attrs = attrs || {};
    // some browsers don't support CustomEvent
    if(is_customer_event_supported){
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(name, false, true, 1);
    }else{
        var evt = document.createEvent('UIEvent');
        evt.initUIEvent(name, false, true, document.defaultView, 1);
    }
    for(var k in attrs){
        if(attrs.hasOwnProperty(k)){
            evt[k] = attrs[k];
        }
    }
    evt.original = e;
    evt.pageX = evt.pX = getPageX(e);
    evt.pageY = evt.pY = getPageY(e);
    var target = attrs.eventTarget || e.currentTarget;
    (target || document).dispatchEvent(evt);
};

g.util = {
    getPageX: getPageX,
    getPageY: getPageY,
    getDistance: getDistance
};

function register(type, ifBind){
    g.prototype[type] = function(selector, callback, namespace){
        if(typeof selector === 'function'){
            namespace = callback;
            callback = selector;
            selector = void 0;
        }
        var cb = callback;
        if( selector ){
            var cbs = callback._g_cbs = callback._g_cbs || {};
            var identification = type + '-' + selector;
            if( !cbs[identification] ){
                cbs[identification] = function(e){
                    var _list = this.querySelectorAll(selector);
                    if( _list.length === 0 ) return;
                    var list = [];
                    for(var i = 0; i < _list.length; i++){
                        list.push(_list[i]);
                    }
                    var targets = e.targets || [e.original.target];
                    var target;
                    for(var i = 0; i < targets.length; i++){
                        for(var o = targets[i]; o !== this; o = o.parentNode){
                            if(list.indexOf(o) >= 0) break;
                        }
                        if(o === this) return;
                        if(target && (target !== o)) return;
                        target = o;
                    }
                    callback.call(target, e);
                };
            };
            cb = cbs[identification];
        }
        for(var i = 0; i < this.elems.length; i++){
        	var elem = this.elems[i];
            ifBind && ifBind.call(elem, type);
            elem.addEventListener(type, cb, false);
            var cbs = callbacks[elem._gesture_id] = (callbacks[elem._gesture_id] || []);
            cbs.push({
                type: type,
                selector: selector,
                namespace: namespace,
                callback: cb
            });
        }
        return this;
    };
};

function arrayify( elem ){
    if(elem.jquery) return elem.get();
    if(elem instanceof HTMLElement) return [elem];
    // Here we recommend to use below methods to get an element collection.
    // getElementsByClassName
    // getElementsByTagName
    // getElementsByName
    // querySelectorAll
    // children attribute
    
    // and we don't handle these collections:
    // HTMLOptionsCollection, HTMLSelectElement
    // HTMLFormElement, HTMLAllCollection
    if(elem instanceof NodeList || elem instanceof HTMLCollection){
        var array = [];
        for(var i = 0; i < elem.length; i++){
            array.push(elem[i]);
        }
        return array;
    }
    return elem;
}
var events = {};
var callbacks = {};
var gesture_id = 0;

var opt = {
    'tap-max-distance': 30,
    'tap-max-delta-time': 300,
    'tap-interval': 250,
    
    'taphold-max-distance': 30,
    'taphold-min-delta-time': 301,
    
    'flick-min-x-or-y': 30,
    
    'zoomin-max-scale': 0.83,
    'zoomout-min-scale': 1.2
};


function init(elem){
    elem._gesture_id = ++gesture_id;
    
    var status = 0;
    var startT, startX, startY;
    var endT, endX, endY;
    var deltaT, deltaX, deltaY;
    var distance;
    
    elem.addEventListener(touchstart, function(e){
        e.preventDefault();
        status = 1;
        endT = startT = e.timeStamp;
        endX = startX = getPageX(e);
        endY = startY = getPageY(e);

        for(var k in events){
            if(typeof events[k].touchstart !== 'function') continue;
            var result = events[k].touchstart.call(this, e, startT, startX, startY);
            if(result === false) break;
        }
    }, false);
    elem.addEventListener(touchmove, function(e){
        // The touchevents are not fired propperly 
        // if e.preventDefault() is not used on touchstart and touchmove
        // http://code.google.com/p/android/issues/detail?id=19827
        e.preventDefault();
        if(!status) return;
        endT = e.timeStamp;
        endX = getPageX(e);
        endY = getPageY(e);
        deltaT = endT - startT;
        deltaX = endX - startX;
        deltaY = endY - startY;
        for(var k in events){
            if(typeof events[k].touchmove !== 'function') continue;
            var result = events[k].touchmove.call(this, e, endT, endX, endY, deltaT, deltaX, deltaY);
            if(result === false) break;
        }
    }, false);
    elem.addEventListener(touchend, function(e){
        e.preventDefault();
        if(!status) return;
        endT = e.timeStamp;
        deltaT = endT - startT;
        deltaX = endX - startX;
        deltaY = endY - startY;
        distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        for(var k in events){
            if(typeof events[k].touchend !== 'function') continue;
            var result = events[k].touchend.call(this, e, endT, endX, endY, deltaT, deltaX, deltaY, distance);
            if(result === false) break;
        }
        status = 0;
    }, false);
    elem.addEventListener(touchleave, function(e){
        status = 0;
    }, false);
    
    elem.addEventListener('gesturestart', function(e){
        status = 0;
        for(var k in events){
            if(typeof events[k].gesturestart !== 'function') continue;
            var result = events[k].gesturestart.call(this, e);
            if(result === false) break;
        }
    }, false);
    elem.addEventListener('gesturechange', function(e){
        status = 0;
        for(var k in events){
            if(typeof events[k].gesturechange !== 'function') continue;
            var result = events[k].gesturechange.call(this, e);
            if(result === false) break;
        }
    }, false);
    elem.addEventListener('gestureend', function(e){
        status = 0;
        for(var k in events){
            if(typeof events[k].gestureend !== 'function') continue;
            var result = events[k].gestureend.call(this, e);
            if(result === false) break;
        }
    }, false);
    if(is_touch_supported && !is_gesture_supported){
        (function(){
            var start, end, rotation;
            elem.addEventListener(touchstart, function(e){
                if(e.touches.length < 2) return;
                start = getInfo(e);
                rotation = 0;
                g.createEvent('gesturestart', e, {
                    scale: 1,
                    rotation: rotation
                });
            }, false);
            elem.addEventListener(touchmove, function(e){
                if(e.touches.length < 2) return;
                if(!start) return;
                end = getInfo(e);
                var _rotation = end.angle - start.angle;
                if(_rotation - rotation > 90){
                    _rotation = _rotation - 180;
                }else if(_rotation - rotation < -90){
                    _rotation = _rotation + 180;
                }
                rotation = _rotation;
                g.createEvent('gesturechange', e, {
                    scale: end.distance/start.distance,
                    rotation: _rotation
                });
            }, false);
            elem.addEventListener(touchend, function(e){
                if(e.touches.length > 1) return;
                if(!start) return;
                g.createEvent('gestureend', e, {
                    scale: end.distance/start.distance,
                    rotation: rotation
                });
                start = end = 0;
            }, false);
        })();
    }
}

var is_touch_supported = 'ontouchstart' in document.documentElement;
var is_gesture_supported = 'ongesturestart' in document.documentElement;
var touchstart = is_touch_supported ? 'touchstart' : 'mousedown';
var touchmove = is_touch_supported ? 'touchmove' : 'mousemove';
var touchend = is_touch_supported ? 'touchend' : 'mouseup';
var touchleave = is_touch_supported ? 'touchleave' : 'mouseleave';
var is_customer_event_supported = false;
try{
    document.createEvent('CustomEvent');
}catch(e){
    is_customer_event_supported = false;
}

function getPageX(e){
    return e.pageX || e.clientX 
        || (e.touches && e.touches[0] ? e.touches[0].pageX : 0)
        || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].pageX : 0);
}

function getPageY(e){
    return e.pageY || e.clientY 
        || (e.touches && e.touches[0] ? e.touches[0].pageY : 0)
        || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].pageY : 0);
}

function getInfo(e){
    var t0 = e.touches[0];
    var t1 = e.touches[1];
    var p0 = [t0.pageX, t0.pageY];
    var p1 = [t1.pageX, t1.pageY];
    return {
        distance: getDistance(p0, p1),
        angle: getAngle(p0, p1)
    };
}

function getAngle(p0, p1){
    var deltaX = p0[0]-p1[0];
    var deltaY = p0[1]-p1[1];
    if(deltaX === 0){
        return deltaY === 0 ? 0 : (deltaY > 0 ? 90 : -90);
    }
    return Math.atan(deltaY / deltaX) * 180 / Math.PI;
}

function getDistance(p0, p1){
    return Math.sqrt((p1[0]-p0[0])*(p1[0]-p0[0]) + (p1[1]-p0[1])*(p1[1]-p0[1]));
}

})();
