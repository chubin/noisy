/**
 * Spawns an HTML element below parent and assign it an optional style.
 *
 * A `css` method is added to the element to conveniently change the stile.
 *
 * @param {string}      tag         - The HTML tag name for the new element.
 * @param {HTMLElement} parent      - The parent DOM element.
 * @param {object}      [style]     - CSS properties of the new element.
 *
 * @returns {HTMLElement} The newly created HTML element.
 */
function spawn(tag, parent, style) {
    let res = document.createElement(tag);
    res.css = function(attrs) { Object.assign(res.style, attrs); };
    if (style !== undefined) {
        res.css(style);
    }

    parent.appendChild(res);

    return res;
}

/**
 * GUI panel that can display information and adjust parameters.
 */
class Panel {
    /**
     * The main container element for the panel.
     * @type {HTMLDivElement}
     */
    _elt;

    /**
     * All folders contained within this panel.
     * @type {Array<Folder>}
     */
    folders = [];

    /**
     * Creates a new Panel instance.
     *
     * @param {HTMLElement} parent  - The parent DOM element.
     * @param {object}      [style] - CSS properties of the new element.
     */
    constructor(parent, style) {
        this._elt = spawn('div', parent, style);
        this.folders = [];
    }

    /**
     * Adds a folder to the panel.
     *
     * @param {string} name - The name of the folder.
     *
     * @returns {Folder} The new folder.
     */
    addFolder(name) {
        const folder = new Folder(name, this._elt);
        this.folders.push(folder);
        return folder;
    }

    /////////////////////////////
    // Parameters registration //

    bool(target, property) {
        return new Boolean(this._elt, target, property);
    }

    number(target, property) {
        return new Number(this._elt, target, property);
    }

    range(target, property, min, max, step) {
        return new Range(this._elt, target, property, min, max, step);
    }

    select(target, property, options) {
        return new Select(this._elt, target, property, options);
    }

    readOnly(content) {
        return new ReadOnly(this._elt, content);
    }
}

/**
 * Main element of the graphical user interface.
 */
export class GUI extends Panel {
    /**
     * Creates a GUI instance and attach it to the document body.
     */
    constructor() {
        super(document.body, {
            // Top left position.
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: '1000',

            // Dimensions.
            width: '320px',
            maxHeight: '90vh',

            // Inner style.
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '15px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            color: '#fff',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            fontSize: '14px',

            // Behavior.
            overflowY: 'auto',
        });
    }
}

/**
 * A collapsible folder within the GUI.
 */
class Folder extends Panel {
    title;

    /**
     * The details HTML element that wraps the folder content.
     * @type {HTMLDetailsElement}
     */
    #details;

    /**
     * Creates a new Folder instance.
     * @param {HTMLElement} parent  - The parent DOM element.
     * @param {string}      title   - The title of the folder.
     */
    constructor(title, parent) {
        super(parent, {marginLeft: '10px'});

        this.#details = spawn('details', parent, {
            background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            marginBottom: '10px',
            padding: '10px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
        });
        this.#details.open = true;

        spawn('summary', this.#details, {
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#fff',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            padding: '5px 0',
        }).textContent = title;
        this.title = title;
        this.#details.appendChild(this._elt); // Doesn't display properly without this.
    }

    show() { this.#details.style.display = ''; return this; }
    hide() { this.#details.style.display = 'none'; return this; }
    open() { this.#details.open = true; return this; }
    close() { this.#details.open = false; return this; }
}

/////////////////////
// Parameter types //

class Param {
    constructor(parent) {
        // Setup UI elements.
        this.box = spawn('div', parent, {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            padding: '8px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
        });
        this.label = spawn('label', this.box, {
            flex: '1',
            marginRight: '10px',
            fontWeight: '500',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        });
        this.valueContainer = spawn('div', this.box, {
            width: '130px',
            display: 'flex',
            alignItems: 'center',
        });
        this.input = spawn(this.tag(), this.valueContainer);
    }

    // Sets the text content of the label.
    legend(name) { this.label.textContent = name; return this; }

    // Returns the tag name for the input element.
    tag() { return 'input'; }
}

// Abstract base input parameter, all concrete input parameters must implement the setup and value
// methods.
class InputParam extends Param {
    // UI parameter attached to parent and tied to target.property.
    constructor(parent, target, property, ...args) {
        super(parent);
        this.input.addEventListener('input', () => {
            const value = this.value();
            this.update(value);
            target[property] = value;
            if (this._onInput) this._onInput(value);
        })
        this.input.addEventListener('change', () => {
            if (this._onChange) this._onChange(this.value());
        });

        this.setup(target[property], ...args);
        this.update(this.value());
    }

    // Assigns to the properties of this.input.
    setInput(fields) { Object.assign(this.input, fields); }

    //////////////////////////
    // Overrideable methods //
    // The methods below define behaviors that are shared by some parameter types, but still need to
    // be redefined by others.

    // Initialisation of the parameter given the initial value, must be defined in the concrete
    // subclass.
    setup() { throw new Error('Method "setup()" must be implemented.'); }

    // Returns the current value of the parameter in the UI, must be defined in the concrete
    // subclass.
    value() { throw new Error('Method "value()" must be implemented.'); }

    // Update the UI given the new value.
    update() {}

    //////////////////////////////////
    // Chainable definition methods //

    // Make the input read-only.
    readOnly() { this.input.disabled = true; return this; }

    // Register a listener for the change event.
    onChange(fun) { this._onChange = fun; return this; }

    // Register a listener for the input event.
    onInput(fun) { this._onInput = fun; return this; }
}

class Boolean extends InputParam {
    setup(initial) {
        this.input.css({
            width: '20px',
            height: '20px',
            accentColor: '#ff6b6b',
            cursor: 'pointer',
            transform: 'scale(1.2)',
        });
        this.setInput({type: 'checkbox', checked: initial});
    }
    value() { return this.input.checked; }
}

class Range extends InputParam {
    setup(initial, min, max, step) {
        this.input.css({
            width: '100%',
            height: '6px',
            appearance: 'none',
            background: 'linear-gradient(90deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)',
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
        });
        this.setInput({
            type: 'range',
            min: min,
            max: max,
            step: step,
            value: initial,
        })
        this.valueSpan = spawn('span', this.valueContainer, {
            width: '45px',
            marginLeft: '8px',
            padding: '2px 6px',
            background: 'linear-gradient(135deg, #ff9ff3 0%, #54a0ff 100%)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        });

        // Style the slider thumb
        const style = spawn('style', document.head);
        style.textContent = `
            input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 18px;
                height: 18px;
                background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            }
            input[type="range"]::-moz-range-thumb {
                appearance: none;
                width: 18px;
                height: 18px;
                background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
                border-radius: 50%;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            }
            input[type="range"]::-moz-range-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            }
        `;
    }

    update(value) { this.valueSpan.textContent = value; }
    value() { return parseFloat(this.input.value); }
}

class Select extends InputParam {
    setup(initial, options) {
        this.input.css({
            width: '100%',
            padding: '6px 10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
            outline: 'none',
        });
        for (const [key, value] of Object.entries(options)) {
            const option = spawn('option', this.input);
            option.text = key;
            option.value = JSON.stringify(value);
            option.style.background = '#764ba2';
            option.style.color = '#fff';
            if (value === initial) option.selected = true;
        }
    }

    tag() { return 'select'; }
    value() { return JSON.parse(this.input.value); }
}

class Number extends InputParam {
    setup(initial) {
        this.input.css({
            width: '100%',
            padding: '6px 10px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            transition: 'all 0.3s ease',
        });
        this.setInput({type: 'number', value: initial});
        
        // Add focus effects
        this.input.addEventListener('focus', () => {
            this.input.style.borderColor = '#ff6b6b';
            this.input.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
        });
        this.input.addEventListener('blur', () => {
            this.input.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.input.style.boxShadow = 'none';
        });
    }
    value() { return parseFloat(this.input.value); }
}

class ReadOnly extends Param {
    constructor(parent, content) {
        super(parent);
        this.update(content);
    }

    tag() { return 'label'; }

    update(content) {
        this.input.textContent = content;
        this.input.css({
            padding: '6px 10px',
            background: 'linear-gradient(135deg, #54a0ff 0%, #5f27cd 100%)',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '500',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        });
    }
}
