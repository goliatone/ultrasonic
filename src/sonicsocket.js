/*
 * SonicSocket
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
}(this, 'SonicSocket', ['extend', 'soniccoder'], function(extend, SonicCoder) {

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
        charDuration: 0.2,
        rampDuration: 0.001,
        audioContext: new AudioContext()
    };

    /**
     * SonicSocket constructor
     *
     * Encodes text as audio streams.
     *
     * 1. Receives a string of text.
     * 2. Creates an oscillator.
     * 3. Converts characters into frequencies.
     * 4. Transmits frequencies, waiting in between appropriately.
     *
     * @param  {object} config Configuration object.
     */
    function SonicSocket(config){
        config = _extend({}, this.constructor.DEFAULTS, config);
        if(config.autoinitialize) this.init(config);
    };

    SonicSocket.name = 'SonicSocket';

    SonicSocket.VERSION = '0.0.0';

    /**
     * Make default options available so we
     * can override.
     */
    SonicSocket.DEFAULTS =  _extend({}, OPTIONS);

///////////////////////////////////////////////////
// PRIVATE METHODS
///////////////////////////////////////////////////

    SonicSocket.prototype.init = function(config){
        if(this.initialized) return;
        this.initialized = true;

        this.logger.log('GView: Init!', config);

        /*
         * We create this now as defaults,
         * they can be overwritten in config
         */
        this.coder = new SonicCoder(config);

        _extend(this, this.constructor.DEFAULTS, config);
    };

    SonicSocket.prototype.send = function(input, opt_callback) {
        // Surround the word with start and end characters.
        input = this.coder.startChar + input + this.coder.endChar;
        // Use WAAPI to schedule the frequencies.
        for (var i = 0; i < input.length; i++) {
            var char = input[i];
            var freq = this.coder.charToFreq(char);
            var time = this.audioContext.currentTime + this.charDuration * i;
            this.scheduleToneAt(freq, time, this.charDuration);
        }

        // If specified, callback after roughly the amount of time it would have
        // taken to transmit the token.
        if (opt_callback) {
            var totalTime = this.charDuration * input.length;
            setTimeout(opt_callback, totalTime * 1000);
        }
    };

    SonicSocket.prototype.scheduleToneAt = function(freq, startTime, duration) {
        var gainNode = this.audioContext.createGain();

        // Gain => Merger
        gainNode.gain.value = 0;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(1, startTime + this.rampDuration);
        gainNode.gain.setValueAtTime(1, startTime + duration - this.rampDuration);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        gainNode.connect(this.audioContext.destination);

        var osc = this.audioContext.createOscillator();
        osc.frequency.value = freq;
        osc.connect(gainNode);

        osc.start(startTime);
    };

    /**
     * `emit` method stub. To be implemented by extending
     * the `View` object or adding a mixin.
     * @return {this}
     */
    SonicSocket.prototype.emit = function(){};

    SonicSocket.prototype.logger = console;


    return SonicSocket;
}));
console.log('SonicSocket');