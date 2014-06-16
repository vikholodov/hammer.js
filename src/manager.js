/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    this.enabled = true;

    options = options || {};

    // get the touchAction style property value when option.touchAction is empty
    // otherwise the defaults.touchAction value is used
    options.touchAction = options.touchAction || element.style.touchAction;

    this.options = merge(options, Hammer.defaults);

    EventEmitter.call(this, element, this.options.domEvents);

    this.session = {};
    this.recognizers = [];

    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this);
    this.touchAction.set(this.options.touchAction);
}

Hammer.defaults = {
    // when set to true, dom events are being triggered.
    // but this is slower and unused by simple implementations, so disabled by default.
    domEvents: false,
    // default value is used when a touch-action isn't defined on the element style
    touchAction: 'pan-y',
    // default setup when calling Hammer()
    recognizers: [
        [RotateRecognizer],
        [PinchRecognizer, null, 'rotate'],
        [PanRecognizer],
        [SwipeRecognizer, null, 'pan'],
        [TapRecognizer, { event: 'doubletap', taps: 2 }],
        [TapRecognizer],
        [HoldRecognizer]
    ]
};

inherit(Manager, EventEmitter, {
    /**
     * enable recognizing
     * @param {Boolean} enable
     */
    enable: function(enable) {
        this.enabled = enable;
    },

    /**
     * stop recognizing for this session
     */
    stop: function() {
        this.session.stopped = true;
    },

    /**
     * run the recognizers!
     * called by the inputHandler function
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        if(this.session.stopped) {
            return;
        }

        this.touchAction.update(inputData);

        var recognizer;
        var session = this.session;
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is done, or this is a new session
        if(!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        // we're in a active recognizer
        for(var i = 0; i < this.recognizers.length; i++) {
            recognizer = this.recognizers[i];

            if(!curRecognizer || recognizer == curRecognizer || recognizer.canRecognizeWith(curRecognizer)) {
                recognizer.recognize(inputData);
            } else {
                recognizer.reset();
            }

            if(!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
        }
    },

    /**
     * get a recognizer by its event name.
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if(recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for(var i = 0; i < recognizers.length; i++) {
            if(recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * @param {Recognizer} recognizer
     * @returns {Recognizer}
     */
    add: function(recognizer) {
        this.recognizers.push(recognizer);
        recognizer.manager = this;
        return recognizer;
    },

    /**
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    remove: function(recognizer) {
        recognizer = this.get(recognizer);

        var recognizers = this.recognizers;
        for(var i = 0; i < recognizers.length; i++) {
            if(recognizers[i] === recognizer) {
                this.recognizers.splice(i, 1);
                return recognizer;
            }
        }
        return null;
    },

    /**
     * destroy the manager and unbinds all events
     */
    destroy: function() {
        this._super.destroy.call(this);
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
});
