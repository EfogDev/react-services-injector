var Service = function() {
    var self = this;
    this.services = {};

    this.servicesDidRegistered = function () {
        self.services = injector.get();
    };
};

function Injector() {
    this.key = -1;
    this.components = [];
    this.services = [];

    var self = this;

    this.updateComponents = function() {
        return Promise.all(self.components.map(function(component) {
            return new Promise(function(resolve) {
                component.instance.forceUpdate.call(component.instance, resolve);
            });
        }));
    };

    this.createInstance = function(service) {
        var instance = new service();
        var methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));

        methods.forEach(function(method) {
            if (method === 'constructor' || method.indexOf('get') === 0 || method.indexOf('_') === 0)
                return;

            instance['__' + method] = instance[method];

            instance[method] = function () {
                var result = instance['__' + method].apply(instance, arguments);

                return self.updateComponents()
                    .then(function () {
                        return result;
                    });
            };
        });

        instance.$update = function () {
            self.components.forEach(function(component) {
                component.instance.forceUpdate.call(component.instance);
            });
        };

        return instance;
    };

    this.get = function() {
        var services = {};

        self.services.forEach(function (service) {
            services[service.name] = service.instance;
        });

        return services;
    };

    this.register = function(data) {
        if (Array.isArray(data)) {
            data.forEach(function(item) {
                self.services.push({name: item.name, instance: self.createInstance(item.service)})
            });
        } else {
            self.services.push({name: data.name, instance: self.createInstance(data.service)});
        }

        self.services.forEach(function(service) {
            service.instance.servicesDidRegistered.apply(service.instance);
        });

        self.services.forEach(function(service) {
            if (!service.instance.serviceDidConnected)
                return;

            service.instance.serviceDidConnected.apply(service.instance);
        });
    };

    this.connectInstance = function(instance) {
        self.components.push({
            key: ++self.key,
            instance
        });

        return self.key;
    };

    this.disconnectInstance = function(key) {
        self.components.some(function(component, index) {
            if (component.key === key) {
                self.components.splice(index, 1);
                return true;
            }
        });
    };

    this.connect = function(component) {
        "use strict";

        var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

        function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

        function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

        function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

        var ConnectedComponent = function (_component) {
            _inherits(ConnectedComponent, _component);

            function ConnectedComponent(props) {
                _classCallCheck(this, ConnectedComponent);

                return _possibleConstructorReturn(this, _component.call(this, props));
            }

            ConnectedComponent.prototype.componentWillMount = function componentWillMount() {
                this.__injector_key = injector.connectInstance(this);
                this.services = Object.assign({}, injector.get());

                if (_component.prototype.componentWillMount) _component.prototype.componentWillMount.call(this);
            };

            ConnectedComponent.prototype.componentWillUnmount = function componentWillUnmount() {
                injector.disconnectInstance(this.__injector_key);

                if (_component.prototype.componentWillUnmount) _component.prototype.componentWillUnmount.call(this);
            };

            try {
                _createClass(ConnectedComponent, null, [{
                    key: "name",
                    get: function get() {
                        return component.name;
                    }
                }]);
            } catch (e) {
                console.error('Looks like you\'re using fucking iOS.');
            }

            return ConnectedComponent;
        }(component);

        return ConnectedComponent;
    }
}

var injector = new Injector();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {injector: injector, Service: Service};
} else {
    exports.injector = injector;
    exports.Service = Service;
}