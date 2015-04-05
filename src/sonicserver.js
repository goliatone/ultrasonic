/*
 * SonicServer
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
}(this, 'SonicServer', ['extend', 'ringbuffer', 'soniccoder'], function(extend, RingBuffer, SonicCoder) {

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

    var State = {
        IDLE: 1,
        RECV: 2
    };

    var OPTIONS = {
        audioContext: new AudioContext(),
        autoinitialize:true,
        // How long (in ms) to wait for the next character.
        timeout: 300,
        debug: true,
        callbacks: {},
        buffer: '',
        state: 1,
        isRunning: false,
        iteration: 0,
        peakThreshold: -65,
        minRunLength: 2
    };

    /**
     * SonicServer constructor
     * Extracts meaning from audio streams.
     *
     * (assumes audioContext is a WebAudioContext global variable.)
     *
     * 1. Listen to the microphone.
     * 2. Do an FFT on the input.
     * 3. Extract frequency peaks in the ultrasonic range.
     * 4. Keep track of frequency peak history in a ring buffer.
     * 5. Call back when a peak comes up often enough.
     *
     * @param  {object} config Configuration object.
     */
    function SonicServer(config){
        config = _extend({}, this.constructor.DEFAULTS, config);
        if(config.autoinitialize) this.init(config);
    };

    SonicServer.name = 'SonicServer';

    SonicServer.VERSION = '0.0.0';

    /**
     * Make default options available so we
     * can override.
     */
    SonicServer.DEFAULTS =  _extend({}, OPTIONS);

///////////////////////////////////////////////////
// PRIVATE METHODS
///////////////////////////////////////////////////

    SonicServer.prototype.init = function(config){
        if(this.initialized) return;
        this.initialized = true;

        this.logger.log('SonicServer: Init!', config);

        /*
         * We create this now as defaults,
         * they can be overwritten in config
         */
        this.coder = new SonicCoder(config);
        this.peakHistory = new RingBuffer(16);
        this.peakTimes = new RingBuffer(16);

        _extend(this, this.constructor.DEFAULTS, config);
    };

    /**
     * Start processing the audio stream.
     */
    SonicServer.prototype.start = function() {
        // Start listening for microphone. Continue init in onStream.
        var constraints = {
            audio: { optional: [{ echoCancellation: false }] }
        };
        navigator.webkitGetUserMedia(constraints,
          this._onStream.bind(this), this._onStreamError.bind(this));
    };

    /**
     * Stop processing the audio stream.
     */
    SonicServer.prototype.stop = function() {
        this.isRunning = false;
        this.stream.stop();
    };

    SonicServer.prototype.on = function(event, callback) {
        if (event == 'message') {
            this.callbacks.message = callback;
        }
    };

    SonicServer.prototype.setDebug = function(value) {
        this.debug = value;

        var canvas = document.querySelector('canvas');
        if (canvas) {
            // Remove it.
            canvas.parentElement.removeChild(canvas);
        }
    };

    SonicServer.prototype._fire = function(callback, arg) {
        callback(arg);
    };

    SonicServer.prototype._onStream = function(stream) {
        this.stream = stream;
        // Setup audio graph.
        var input = this.audioContext.createMediaStreamSource(stream);
        var analyser = this.audioContext.createAnalyser();
        input.connect(analyser);

        // Create the frequency array.
        this.freqs = new Float32Array(analyser.frequencyBinCount);

        // Save the analyser for later.
        this.analyser = analyser;
        this.isRunning = true;

        // Do an FFT and check for inaudible peaks.
        this._raf(this.loop.bind(this));
    };


    SonicServer.prototype._onStreamError = function(e) {
        console.error('Audio input error:', e);
    };

    /**
     * Given an FFT frequency analysis, return the
     * peak frequency in a frequency range.
     */
    SonicServer.prototype.getPeakFrequency = function() {
        // Find where to start.
        var start = this.freqToIndex(this.coder.freqMin);
        // TODO: use first derivative to find the peaks,
        // and then find the largest peak.
        // Just do a max over the set.
        var max = -Infinity;
        var index = -1;
        for (var i = start; i < this.freqs.length; i++) {
            if (this.freqs[i] > max) {
                max = this.freqs[i];
                index = i;
            }
        }
        // Only care about sufficiently tall peaks.
        if (max > this.peakThreshold) {
            return this.indexToFreq(index);
        }
        return null;
    };

    SonicServer.prototype.loop = function() {
        this.analyser.getFloatFrequencyData(this.freqs);

        // Sanity check the peaks every 5 seconds.
        if ((this.iteration + 1) % (60 * 5) == 0) {
            this.restartServerIfSanityCheckFails();
        }

        // Calculate peaks, and add them to history.
        var freq = this.getPeakFrequency();
        if (freq) {
            var char = this.coder.freqToChar(freq);
            // DEBUG ONLY: Output the transcribed char.
            if (this.debug) {
                this.logger.log('Transcribed char: ' + char);
            }
            this.peakHistory.add(char);
            this.peakTimes.add(new Date());
        } else {
            // If no character was detected, see if we've timed out.
            var lastPeakTime = this.peakTimes.last();
            if (lastPeakTime && new Date() - lastPeakTime > this.timeout) {
                // Last detection was over 300ms ago.
                this.state = State.IDLE;
                if (this.debug) {
                    this.logger.log('Token', this.buffer, 'timed out');
                }
                this.peakTimes.clear();
            }
        }
        // Analyse the peak history.
        this.analysePeaks();

        // DEBUG ONLY: Draw the frequency response graph.
        if (this.debug) this._debugDraw();

        if (this.isRunning) this._raf(this.loop.bind(this));

        this.iteration += 1;
    };

    SonicServer.prototype.indexToFreq = function(index) {
        var nyquist = this.audioContext.sampleRate/2;
        return nyquist/this.freqs.length * index;
    };

    SonicServer.prototype.freqToIndex = function(frequency) {
        var nyquist = this.audioContext.sampleRate/2;
        return Math.round(frequency/nyquist * this.freqs.length);
    };

    /**
     * Analyses the peak history to find true
     * peaks (repeated over several frames).
     */
    SonicServer.prototype.analysePeaks = function() {
        // Look for runs of repeated characters.
        var char = this.getLastRun();
        if (!char) return;

        if (this.state == State.IDLE) {
            // If idle, look for start character to go into recv mode.
            if (char == this.coder.startChar) {
                this.buffer = '';
                this.state = State.RECV;
            }
        } else if (this.state == State.RECV) {
            // If receiving, look for character changes.
            if (char != this.lastChar &&
                char != this.coder.startChar && char != this.coder.endChar) {
                this.buffer += char;
                this.lastChar = char;
            }
            // Also look for the end character to go into idle mode.
            if (char == this.coder.endChar) {
                this.state = State.IDLE;
                this._fire(this.callbacks.message, this.buffer);
                this.buffer = '';
            }
        }
    };

    SonicServer.prototype.getLastRun = function() {
        var lastChar = this.peakHistory.last();
        var runLength = 0;
        // Look at the peakHistory array for patterns like ajdlfhlkjxxxxxx$.
        for (var i = this.peakHistory.length() - 2; i >= 0; i--) {
            var char = this.peakHistory.get(i);
            if (char == lastChar) {
                runLength += 1;
            } else {
                break;
            }
        }
        if (runLength > this.minRunLength) {
            // Remove it from the buffer.
            this.peakHistory.remove(i + 1, runLength + 1);
            return lastChar;
        }
        return null;
    };

    /**
     * DEBUG ONLY.
     */
    SonicServer.prototype._debugDraw = function() {
        var canvas = document.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            document.body.appendChild(canvas);
        }
        canvas.width = document.body.offsetWidth;
        canvas.height = 480;
        drawContext = canvas.getContext('2d');
        // Plot the frequency data.
        for (var i = 0; i < this.freqs.length; i++) {
            var value = this.freqs[i];
            // Transform this value (in db?) into something that can be plotted.
            var height = value + 400;
            var offset = canvas.height - height - 1;
            var barWidth = canvas.width/this.freqs.length;
            drawContext.fillStyle = '#ff3366';
            drawContext.fillRect(i * barWidth, offset, 1, 1);
        }
    };

    /**
     * A request animation frame shortcut.
     * This one is intended to work even in
     * background pages of an extension.
     */
    SonicServer.prototype._raf = function(callback) {
        var isCrx = !!(window.chrome && chrome.extension);
        if (isCrx) {
            setTimeout(callback, 1000/60);
        } else {
            requestAnimationFrame(callback);
        }
    };

    SonicServer.prototype.restartServerIfSanityCheckFails = function() {
        // Strange state 1: peaks gradually get quieter
        // and quieter until they stabilize around -800.
        if (this.freqs[0] < -300) {
            this.logger.error('freqs[0] < -300. Restarting.');
            this.restart();
            return;
        }
        // Strange state 2: all of the peaks are -100. Check just the first few.
        var isValid = true;
        for (var i = 0; i < 10; i++) {
            if (this.freqs[i] == -100) {
                isValid = false;
            }
        }

        if (!isValid) {
            this.logger.error('freqs[0:10] == -100. Restarting.');
            this.restart();
        }
    };

    SonicServer.prototype.restart = function() {
        //this.stop();
        //this.start();
        window.location.reload();
    };


    /**
     * `emit` method stub. To be implemented by extending
     * the `View` object or adding a mixin.
     * @return {this}
     */
    SonicServer.prototype.emit = function(){};

    SonicServer.prototype.logger = console;


    return SonicServer;
}));
console.log('SonicServer')