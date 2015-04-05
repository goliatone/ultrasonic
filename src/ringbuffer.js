/*
 * RingBuffer
 * https://github.com/goliatone/soundbots
 * Created with gbase.
 * Copyright (c) 2014 goliatone
 * Licensed under the MIT license.
 */
/* jshint strict: false, plusplus: true */
/*global define: false, require: false, module: false, exports: false */
(function (root, name, deps, factory) {
    'use strict';
    // Node
    if(typeof deps === 'function') {
        factory = deps;
        deps = [];
    }

    if (typeof exports === 'object') {
        module.exports = factory.apply(root, deps.map(require));
    } else if (typeof define === 'function' && 'amd' in define) {
        //require js, here we assume the file is named as the lower
        //case module name.
        define(name.toLowerCase(), deps, factory);
    } else {
        // Browser
        var d, i = 0, global = root, old = global[name], mod;
        while((d = deps[i]) !== undefined) deps[i++] = root[d];
        global[name] = mod = factory.apply(global, deps);
        //Export no 'conflict module', aliases the module.
        mod.noConflict = function(){
            global[name] = old;
            return mod;
        };
    }
}(this, 'RingBuffer', ['extend'], function(extend) {

    /**
     * Extend method.
     * @param  {Object} target Source object
     * @return {Object}        Resulting object from
     *                         meging target to params.
     */
    var _extend= extend;

    /**
     * Shim console, make sure that if no console
     * available calls do not generate errors.
     * @return {Object} Console shim.
     */
    var _shimConsole = function(con) {

        if (con) return con;

        con = {};
        var empty = {},
            noop = function() {},
            properties = 'memory'.split(','),
            methods = ('assert,clear,count,debug,dir,dirxml,error,exception,group,' +
                'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
                'table,time,timeEnd,timeStamp,trace,warn').split(','),
            prop,
            method;

        while (method = methods.pop()) con[method] = noop;
        while (prop = properties.pop()) con[prop] = empty;

        return con;
    };

///////////////////////////////////////////////////
// CONSTRUCTOR
///////////////////////////////////////////////////

    var OPTIONS = {
        autoinitialize: true,
        maxLength: 16
    };

    /**
     * RingBuffer constructor
     *
     * @param  {object} config Configuration object.
     */
    function RingBuffer(config){
        if(typeof config === 'number') config = {maxLength: config};
        config = _extend({}, this.constructor.DEFAULTS, config);
        if(config.autoinitialize) this.init(config);
    };

    RingBuffer.name = RingBuffer.prototype.__name__ = 'RingBuffer';

    RingBuffer.VERSION = '0.0.0';

    /**
     * Make default options available so we
     * can override.
     */
    RingBuffer.DEFAULTS =  _extend({}, OPTIONS);

///////////////////////////////////////////////////
// PRIVATE METHODS
///////////////////////////////////////////////////

    RingBuffer.prototype.init = function(config){
        if(this.initialized) return;
        this.initialized = true;

        this.logger.log('RingBuffer: Init!', config);
        _extend(this, this.constructor.DEFAULTS, config);

        this.array = [];
    };

    RingBuffer.prototype.get = function(index) {
        if (index >= this.array.length) return null;

        return this.array[index];
    };

    RingBuffer.prototype.last = function() {
        if (this.array.length == 0) return null;
        return this.array[this.array.length - 1];
    };

    RingBuffer.prototype.add = function(value) {
        // Append to the end, remove from the front.
        this.array.push(value);
        if (this.array.length >= this.maxLength) {
            this.array.splice(0, 1);
        }
    };

    RingBuffer.prototype.length = function() {
        // Return the actual size of the array.
        return this.array.length;
    };

    RingBuffer.prototype.clear = function() {
      this.array = [];
    };

    RingBuffer.prototype.copy = function() {
        // Returns a copy of the ring buffer.
        var out = new RingBuffer(this.maxLength);
        out.array = this.array.slice(0);
        return out;
    };

    RingBuffer.prototype.remove = function(index, length) {
        //console.log('Removing', index, 'through', index+length);
        this.array.splice(index, length);
    };

    RingBuffer.prototype.logger = console;


    return RingBuffer;
}));