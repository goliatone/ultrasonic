/*
 * SonicCoder
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
}(this, 'SonicCoder', ['extend'], function(extend) {

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

    var ALPHABET = '\n abcdefghijklmnopqrstuvwxyz0123456789,.!?@*';

    var OPTIONS = {
        autoinitialize: true,
        freqMin: 18500,
        freqMax: 19500,
        freqError: 50,
        alphabetString: ALPHABET,
        startChar: '^',
        endChar: '$'
    };

    /**
     * SonicCoder constructor
     *
     * A simple sonic encoder/decoder for [a-z0-9] => frequency (and back).
     * A way of representing characters with frequency.
     *
     * @param  {object} config Configuration object.
     */
    function SonicCoder(config){
        config = _extend({}, this.constructor.DEFAULTS, config);
        if(config.autoinitialize) this.init(config);
    };

    SonicCoder.name = SonicCoder.prototype.__name__ = 'SonicCoder';

    SonicCoder.VERSION = '0.0.0';

    /**
     * Make default options available so we
     * can override.
     */
    SonicCoder.DEFAULTS =  _extend({}, OPTIONS);

///////////////////////////////////////////////////
// PRIVATE METHODS
///////////////////////////////////////////////////

    SonicCoder.prototype.init = function(config){
        if(this.initialized) return;
        this.initialized = true;

        this.logger.log('SonicCoder: Init!', config);

        _extend(this, this.constructor.DEFAULTS, config);

        // Make sure that the alphabet has the start and end chars.
        this.alphabet = this.startChar + this.alphabetString + this.endChar;
    };

    /**
     * Given a character, convert to the corresponding frequency.
     */
    SonicCoder.prototype.charToFreq = function(char) {
        // Get the index of the character.
        var index = this.alphabet.indexOf(char);
        if (index == -1) {
            // If this character isn't in the alphabet, error out.
            this.logger.error(char, 'is an invalid character.');
            index = this.alphabet.length - 1;
        }
        // Convert from index to frequency.
        var freqRange = this.freqMax - this.freqMin;
        var percent = index / this.alphabet.length;
        var freqOffset = Math.round(freqRange * percent);

        return this.freqMin + freqOffset;
    };

    /**
     * Given a frequency, convert to the corresponding character.
     */
    SonicCoder.prototype.freqToChar = function(freq) {
        // If the frequency is out of the range.
        if (!(this.freqMin < freq && freq < this.freqMax)) {
            // If it's close enough to the min, clamp it (and same for max).
            if (this.freqMin - freq < this.freqError) {
                freq = this.freqMin;
            } else if (freq - this.freqMax < this.freqError) {
                freq = this.freqMax;
            } else {
                // Otherwise, report error.
                this.logger.error(freq, 'is out of range.');
                return null;
            }
        }

        // Convert frequency to index to char.
        var freqRange = this.freqMax - this.freqMin;
        var percent = (freq - this.freqMin) / freqRange;
        var index = Math.round(this.alphabet.length * percent);
        return this.alphabet[index];
    };

    /**
     * `emit` method stub. To be implemented by extending
     * the `View` object or adding a mixin.
     * @return {this}
     */
    SonicCoder.prototype.emit = function(){};

    /**
     * Logger method, meant to be implemented by
     * mixin. As a placeholder, we use console if available
     * or a shim if not present.
     */
    SonicCoder.prototype.logger = _shimConsole(console);


    return SonicCoder;
}));