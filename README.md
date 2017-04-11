React Services Injector
===================
Got tired with Redux? Really hate that `ACTION_THAT_DOES_SOME_ACTION: "ACTION_THAT_DOES_SOME_ACTION"`? Or maybe you are used to be an Angular-developer? So then you definitely should try some services in React!

Installation
-------------
`npm i --save react-services-injector`

Using
-------------
At first, create your first service (`services/storage.js`):
```javascript
export default class Storage {
    constructor() {
        this.filter = '';
        this.products = [];
    }

    addProduct({name, price}) {
        this.products.push({name, price});
    }

    setFilter(filter = '') {
        this.filter = filter;
    }

    getFiltered() {
        return this.products.filter(product => {
            return (product.name || '').toLowerCase()
                       .indexOf(this.filter.toLowerCase()) === 0;
        }) || [];
    }
}
```

> **Important!** Methods that are not changing anything should be named as `getSomething`, starting with `get` keyword (don't get confused with getters).

Create an `index.js` in your `services` directory to export them all:
```javascript
import Storage from './storage';

export default [{
    name: 'storage',
    service: Storage
}];
```

Then register your service in the main file (`app.js`):
```javascript
import React from 'react';
import { render } from 'react-dom';
import Root from './containers/Root';

//here we go
import {injector} from 'react-services-injector';
import services from './services';

injector.register(services);

render(<Root />,
    document.getElementById('root')
);
```

Use your service! Wow, such simple, isn't it?
```javascript
import {injector} from 'react-services-injector';

class ProductTable extends React.Component {
    constructor(props) {
        super(props);

        this.addRandomProduct = this.addRandomProduct.bind(this);
    }

    addRandomProduct() {
        this.services.storage.addProduct({
            name: 'Test product',
            price: Math.floor(Math.random() * 250) + 50
        });
    }

    render() {
        let {storage} = this.services;

        return (
            <div>
                {storage.getFiltered().map((product, index) =>
                    <Product key={index} data={product} />
                )}

                <button onClick={() => this.addRandomProduct()}>Add</button>
            </div>
        )
    }
}

export default injector.connect(ProductTable);
```

> **Important!** You definitely shouldn't use services in constructor. You can't to, actually. Use it, for example, in the `componentWillMount` lifecycle method if you need something to be done once component is created.

Behavior
===
#### Singletons
Services are singletons, so you can use your service in multiple components with the same data.

#### Asynchronous actions
If you want to do some asynchronous stuff if your service, please use `this.$update()` after it is done (remember `$scope.$apply()`, huh?) For example:
```javascript
addProduct({name, price}) {
    setTimeout(() => {
        this.products.push({category, name, price, stocked});

        this.$update(); //here is it
    }, 200);
}
```
#### Only ES6 classes
It is already 2017, right? Please, use ES6 classes instead of `React.createComponent` (especially as even React says that method is deprecated). Also, the library won't connect your functional components -- create a class if you want to use services there.

#### Troubleshooting
Please, feel free to create an issue any time if you found a bug or unexpected behavior.
Feature requests are pretty much acceptable too.
