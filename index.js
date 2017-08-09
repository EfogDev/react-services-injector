let Service = function () {
    this.services = {};

    this.servicesDidRegister = () => {
        this.services = injector.get();
    }
};

class Helpers {
    static isGetter(descriptor) {
        return typeof descriptor.get === 'function';
    }

    static isSetter(descriptor) {
        return typeof descriptor.set === 'function';
    }

    static isFunction(descriptor) {
        return Helpers.isGetter(descriptor) || Helpers.isSetter(descriptor) || typeof descriptor.value === 'function';
    }

    static getDescriptors(fn) {
        return Object.getOwnPropertyNames(fn.prototype).map(field =>
            ({name: field, descriptor: Object.getOwnPropertyDescriptor(fn.prototype, field)})
        );
    }
}

class Injector {
    constructor() {
        this.key = -1;
        this.components = [];
        this.services = [];
    }

    updateComponents(calledBy) {
        return Promise.all(this.components.filter(component => {
            return component.toRender.indexOf(calledBy) !== -1;
        }).map(component => {
            return new Promise(resolve => {
                component.instance.forceUpdate.call(component.instance, resolve);
            });
        }));
    }

    createInstance(service) {
        let self = this;
        let instance = new service();
        let prototype = service.prototype;
        let methods = Helpers.getDescriptors(service);

        methods.forEach(method => {
            const {descriptor} = method;

            if (!Helpers.isFunction(descriptor) || descriptor.value === service)
                return;

            if (Helpers.isGetter(descriptor))
                return;

            const fn = instance[method.name];

            instance[method.name] = (function (...args) {
                let result = fn.apply(instance, args);

                return self.updateComponents(instance)
                    .then(() => result);
            }).bind(instance);
        });

        instance.$update = function () {
            return self.updateComponents(instance);
        };

        return instance;
    }

    get(arrayFormat) {
        if (arrayFormat)
            return this.services.map(service => service.instance);

        return this.services.reduce((obj, service) => Object.assign(obj, {
            [service.name]: service.instance
        }), {});
    }

    byName(name) {
        const services = injector.get();
        const service = services[name];

        if (!service)
            throw new Error(`Unable to find service "${name}".`);

        return service;
    }

    toObject(services) {
        return services.reduce((store, service) => Object.assign(store, {[service.constructor.name]: service}), {});
    }

    register(data) {
        if (Array.isArray(data)) {
            data.forEach(item => this.services.push({name: item.name, instance: this.createInstance(item)}))
        } else {
            this.services.push({name: data.name, instance: this.createInstance(data)});
        }

        this.services.forEach(service => service.instance.servicesDidRegister.apply(service.instance));
        this.services.forEach(service => service.instance.serviceDidConnect && service.instance.serviceDidConnect.apply(service.instance));
    }

    connectInstance(instance, options) {
        const services = injector.get(true);

        const toRender = Array.isArray(options && options.toRender) ? options.toRender.map(this.byName) : options ? [] : services;
        const toUse = Array.isArray(options && options.toUse) ? options.toUse.map(this.byName) : options ? [] : services;

        instance.services = Object.assign(this.toObject(toRender), this.toObject(toUse));

        this.components.push({
            key: ++this.key,
            instance,
            toRender,
            toUse
        });

        return this.key;
    }

    disconnectInstance(key) {
        this.components.some((component, index) => {
            if (component.key === key) {
                this.components.splice(index, 1);
                return true;
            }
        });
    }

    connect(component, options) {
        class ConnectedComponent extends component {
            constructor(props) {
                super(props);
            }

            componentWillMount() {
                this.__servicesInjectorKey = injector.connectInstance(this, options);

                if (super.componentWillMount)
                    super.componentWillMount();
            }

            componentWillUnmount() {
                injector.disconnectInstance(this.__servicesInjectorKey);

                if (super.componentWillUnmount)
                    super.componentWillUnmount();
            }
        }

        try {
            Object.defineProperty(ConnectedComponent, 'name', {
                get: () => component.name
            });
        } catch (e) {}

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