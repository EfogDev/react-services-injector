let Service = function() {
    this.services = {};

    this.servicesDidRegistered = () => {
        this.services = injector.get();
    }
};

class Injector {
    constructor() {
        this.key = -1;
        this.components = [];
        this.services = [];
    }

    createInstance(service) {
        let self = this;
        let instance = new service();
        let methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));

        methods.forEach(method => {
            if (method === 'constructor' || method.indexOf('get') === 0 || method.indexOf('_') === 0)
        return;

        instance['__' + method] = instance[method];

        instance[method] = function (...args) {
            instance['__' + method].apply(instance, args);

            self.components.forEach(component => component.instance.forceUpdate.call(component.instance));
        };
    });

        instance.$update = function () {
            self.components.forEach(component => component.instance.forceUpdate.call(component.instance));
        };

        return instance;
    }

    get() {
        return this.services.reduce((obj, service) => Object.assign(obj, {
            [service.name]: service.instance
        }), {});
    }

    register(data) {
        if (Array.isArray(data)) {
            data.forEach(item => this.services.push({name: item.name, instance: this.createInstance(item.service)}))
        } else {
            this.services.push({name: data.name, instance: this.createInstance(data.service)});
        }

        this.services.forEach(service => service.instance.servicesDidRegistered.apply(service.instance));
        this.services.forEach(service => {
            if (!service.instance.serviceDidConnected)
        return;

        service.instance.serviceDidConnected.apply(service.instance);
    });
    }

    connectInstance(instance) {
        this.components.push({
            key: ++this.key,
            instance
        });

        return this.key;
    }

    disconnectInstance(id) {
        this.components = this.components.filter(item => item.key !== id);
    }

    connect(component) {
        var key = null;

        class ConnectedComponent extends component {
            constructor(props) {
                super(props);
            }

            componentWillMount() {
                key = injector.connectInstance(this);
                this.services = Object.assign({}, injector.get());

                if (super.componentWillMount)
                    super.componentWillMount();
            }

            componentWillUnmount() {
                injector.disconnectInstance(key);

                if (super.componentWillUnmount)
                    super.componentWillUnmount();
            }

            static get name() {
                return component.name;
            }
        }

        return ConnectedComponent;
    }
}

const injector = new Injector();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {injector, Service};
} else {
    exports.injector = injector;
    exports.Service = Service;
}