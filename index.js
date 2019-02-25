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
        this.registered = false;
        this.key = -1;
        this.components = [];
        this.services = [];
    }

    getComponentsToUpdate(calledBy) {
        return this.components.filter(component => {
            return component.toRender.indexOf(calledBy) !== -1;
        });
    }

    updateComponents(calledBy) {
        const componentsToUpdate = this.getComponentsToUpdate(calledBy);

        return Promise.all(componentsToUpdate.map(component => {
            return new Promise(resolve => {
                component.instance.forceUpdate.call(component.instance, resolve);
            });
        })).then(() => componentsToUpdate.map(component => component.instance));
    }

    createInstance(service) {
        let self = this;
        let instance = new service();
        let prototype = service.prototype;
        let methods = Helpers.getDescriptors(service);

        methods.forEach(method => {
            const {name, descriptor} = method;

            if (!Helpers.isFunction(descriptor) || descriptor.value === service)
                return;

            if (Helpers.isGetter(descriptor))
                return;

            if (Helpers.isFunction(descriptor) && (name.indexOf('get') === 0 || name.indexOf('find') === 0))
                return;

            const fn = instance[method.name];

            instance[method.name] = (function (...args) {
                let result = null;

                try {
                    result = fn.apply(instance, args);
                } catch (e) {
                    return Promise.reject(e);
                }

                return self.updateComponents(instance)
                    .then(components => {
                        if (Array.isArray(service.$executionHandlers))
                            service.$executionHandlers.forEach(handler => {
                                handler.call(instance, method.name, args, components);
                            });
                    })
                    .then(() => result);
            }).bind(instance);
        });

        instance.$update = function () {
            return self.updateComponents(instance);
        };

        return instance;
    }

    get(arrayFormat = false) {
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
        return services.reduce((store, service) => Object.assign(store, {[service.constructor.publicName || service.constructor.name]: service}), {});
    }

    register(data) {
        if (this.registered)
            throw new Error('Services have already been registered.');

        if (!Array.isArray(data)) {
            data = [data];
        }

        data.forEach(item => this.services.push({name: item.publicName || item.name, instance: this.createInstance(item)}));

        this.services.forEach(service => service.instance.servicesDidRegister.apply(service.instance));
        this.services.forEach(service => service.instance.serviceDidConnect && service.instance.serviceDidConnect.apply(service.instance));

        this.registered = true;
    }

    connectInstance(instance, options) {
        const services = injector.get(true);
        const toRender = Array.isArray(options && options.toRender) ? options.toRender.map(this.byName) : options ? [] : services;

        instance.services = Object.assign({}, injector.get());

        this.components.push({
            key: ++this.key,
            instance,
            toRender,
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
        const classes = {};

        classes[component.name] = class extends component {
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
        };

        try {
            Object.defineProperty(classes[component.name], 'name', {
                get: () => component.name
            });
        } catch (e) {}

        return classes[component.name];
    }
}

function addExecutionHandler(service, handler) {
    if (!Array.isArray(service.$executionHandlers))
        service.$executionHandlers = [];

    service.$executionHandlers.push(handler);

    return service;
}

function defaultLogger(service) {
    return addExecutionHandler(service, function (method, args, updatedComponents) {
        try {
            const prototype = Object.getPrototypeOf(this);
            const constructor = prototype && prototype.constructor;
            const name = constructor && constructor.publicName;

            console.group(`${name || this.constructor.name}.${method}`);

            if (args && args.length)
                console.log('Arguments:', args);

            if (updatedComponents && updatedComponents.length)
                console.log('Updated:', updatedComponents);

            console.groupEnd();
        } catch (e) {
            console.error('An error occured while logging methods execution.', e);
        }
    });
}

const injector = new Injector();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        injector,
        Service,
        addExecutionHandler,
        defaultLogger
    };
} else {
    exports.injector = injector;
    exports.Service = Service;
    exports.defaultLogger = defaultLogger;
    exports.addExecutionHandler = addExecutionHandler;
}
