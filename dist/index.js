'use strict';

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Service = function Service() {
    var _this = this;

    this.services = {};

    this.servicesDidRegister = function () {
        _this.services = injector.get();
    };
};

var Helpers = function () {
    function Helpers() {
        _classCallCheck(this, Helpers);
    }

    _createClass(Helpers, null, [{
        key: 'isGetter',
        value: function isGetter(descriptor) {
            return typeof descriptor.get === 'function';
        }
    }, {
        key: 'isSetter',
        value: function isSetter(descriptor) {
            return typeof descriptor.set === 'function';
        }
    }, {
        key: 'isFunction',
        value: function isFunction(descriptor) {
            return Helpers.isGetter(descriptor) || Helpers.isSetter(descriptor) || typeof descriptor.value === 'function';
        }
    }, {
        key: 'getDescriptors',
        value: function getDescriptors(fn) {
            return Object.getOwnPropertyNames(fn.prototype).map(function (field) {
                return { name: field, descriptor: Object.getOwnPropertyDescriptor(fn.prototype, field) };
            });
        }
    }]);

    return Helpers;
}();

var Injector = function () {
    function Injector() {
        _classCallCheck(this, Injector);

        this.registered = false;
        this.key = -1;
        this.components = [];
        this.services = [];
    }

    _createClass(Injector, [{
        key: 'getComponentsToUpdate',
        value: function getComponentsToUpdate(calledBy) {
            return this.components.filter(function (component) {
                return component.toRender.indexOf(calledBy) !== -1;
            });
        }
    }, {
        key: 'updateComponents',
        value: function updateComponents(calledBy) {
            var componentsToUpdate = this.getComponentsToUpdate(calledBy);

            return _Promise.all(componentsToUpdate.map(function (component) {
                return new _Promise(function (resolve) {
                    component.instance.forceUpdate.call(component.instance, resolve);
                });
            })).then(function () {
                return componentsToUpdate.map(function (component) {
                    return component.instance;
                });
            });
        }
    }, {
        key: 'createInstance',
        value: function createInstance(service) {
            var self = this;
            var instance = new service();
            var prototype = service.prototype;
            var methods = Helpers.getDescriptors(service);

            methods.forEach(function (method) {
                var descriptor = method.descriptor;


                if (!Helpers.isFunction(descriptor) || descriptor.value === service) return;

                if (Helpers.isGetter(descriptor)) return;

                var fn = instance[method.name];

                instance[method.name] = function () {
                    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                        args[_key] = arguments[_key];
                    }

                    var result = null;

                    try {
                        result = fn.apply(instance, args);
                    } catch (e) {
                        return _Promise.reject(e);
                    }

                    return self.updateComponents(instance).then(function (components) {
                        if (Array.isArray(service.$executionHandlers)) service.$executionHandlers.forEach(function (handler) {
                            handler.call(instance, method.name, args, components);
                        });
                    }).then(function () {
                        return result;
                    });
                }.bind(instance);
            });

            instance.$update = function () {
                return self.updateComponents(instance);
            };

            return instance;
        }
    }, {
        key: 'get',
        value: function get() {
            var arrayFormat = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            if (arrayFormat) return this.services.map(function (service) {
                return service.instance;
            });

            return this.services.reduce(function (obj, service) {
                return _extends(obj, _defineProperty({}, service.name, service.instance));
            }, {});
        }
    }, {
        key: 'byName',
        value: function byName(name) {
            var services = injector.get();
            var service = services[name];

            if (!service) throw new Error('Unable to find service "' + name + '".');

            return service;
        }
    }, {
        key: 'toObject',
        value: function toObject(services) {
            return services.reduce(function (store, service) {
                return _extends(store, _defineProperty({}, service.constructor.publicName || service.constructor.name, service));
            }, {});
        }
    }, {
        key: 'register',
        value: function register(data) {
            var _this2 = this;

            if (this.registered) throw new Error('Services have already been registered.');

            if (!Array.isArray(data)) {
                data = [data];
            }

            data.forEach(function (item) {
                return _this2.services.push({ name: item.publicName || item.name, instance: _this2.createInstance(item) });
            });

            this.services.forEach(function (service) {
                return service.instance.servicesDidRegister.apply(service.instance);
            });
            this.services.forEach(function (service) {
                return service.instance.serviceDidConnect && service.instance.serviceDidConnect.apply(service.instance);
            });

            this.registered = true;
        }
    }, {
        key: 'connectInstance',
        value: function connectInstance(instance, options) {
            var services = injector.get(true);
            var toRender = Array.isArray(options && options.toRender) ? options.toRender.map(this.byName) : options ? [] : services;

            instance.services = _extends({}, injector.get());

            this.components.push({
                key: ++this.key,
                instance: instance,
                toRender: toRender
            });

            return this.key;
        }
    }, {
        key: 'disconnectInstance',
        value: function disconnectInstance(key) {
            var _this3 = this;

            this.components.some(function (component, index) {
                if (component.key === key) {
                    _this3.components.splice(index, 1);
                    return true;
                }
            });
        }
    }, {
        key: 'connect',
        value: function connect(component, options) {
            var ConnectedComponent = function (_component) {
                _inherits(ConnectedComponent, _component);

                function ConnectedComponent(props) {
                    _classCallCheck(this, ConnectedComponent);

                    return _possibleConstructorReturn(this, (ConnectedComponent.__proto__ || Object.getPrototypeOf(ConnectedComponent)).call(this, props));
                }

                _createClass(ConnectedComponent, [{
                    key: 'componentWillMount',
                    value: function componentWillMount() {
                        this.__servicesInjectorKey = injector.connectInstance(this, options);

                        if (_get(ConnectedComponent.prototype.__proto__ || Object.getPrototypeOf(ConnectedComponent.prototype), 'componentWillMount', this)) _get(ConnectedComponent.prototype.__proto__ || Object.getPrototypeOf(ConnectedComponent.prototype), 'componentWillMount', this).call(this);
                    }
                }, {
                    key: 'componentWillUnmount',
                    value: function componentWillUnmount() {
                        injector.disconnectInstance(this.__servicesInjectorKey);

                        if (_get(ConnectedComponent.prototype.__proto__ || Object.getPrototypeOf(ConnectedComponent.prototype), 'componentWillUnmount', this)) _get(ConnectedComponent.prototype.__proto__ || Object.getPrototypeOf(ConnectedComponent.prototype), 'componentWillUnmount', this).call(this);
                    }
                }]);

                return ConnectedComponent;
            }(component);

            try {
                Object.defineProperty(ConnectedComponent, 'name', {
                    get: function get() {
                        return component.name;
                    }
                });
            } catch (e) {}

            return ConnectedComponent;
        }
    }]);

    return Injector;
}();

function addExecutionHandler(service, handler) {
    if (!Array.isArray(service.$executionHandlers)) service.$executionHandlers = [];

    service.$executionHandlers.push(handler);

    return service;
}

function defaultLogger(service) {
    return addExecutionHandler(service, function (method, args, updatedComponents) {
        try {
            var prototype = Object.getPrototypeOf(this);
            var _constructor = prototype && prototype.constructor;
            var name = _constructor && _constructor.publicName;

            console.group((name || this.constructor.name) + '.' + method);

            if (args && args.length) console.log('Arguments:', args);

            if (updatedComponents && updatedComponents.length) console.log('Updated:', updatedComponents);

            console.groupEnd();
        } catch (e) {
            console.error('An error occured while logging methods execution.', e);
        }
    });
}

var injector = new Injector();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        injector: injector,
        Service: Service,
        addExecutionHandler: addExecutionHandler,
        defaultLogger: defaultLogger
    };
} else {
    exports.injector = injector;
    exports.Service = Service;
    exports.defaultLogger = defaultLogger;
    exports.addExecutionHandler = addExecutionHandler;
}

