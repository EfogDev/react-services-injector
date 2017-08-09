React Services Injector
===================
Got tired with Redux? Or maybe you are used to be an Angular-developer? Then you definitely should try some services in React!
The library helps you to connect components one to each other and create shared stores.

Data flow and principles
-------------
The main principle of services injector is to update components automatically each time you change any data so you don't need to control that process. Also, the library written in the as-simple-as-possible way: it doesn't require you to write tons of code (as `redux` does (sorry, I hate `redux`)). 

Installation
-------------
`npm i --save react-services-injector`

Using
-------------
To start, create your first service (`services/storage.js`):
```javascript
import {Service} from 'react-services-injector';

class Storage extends Service {
  constructor() {
    super();
    this.changeNumber();
  }

  changeNumber() {
    this.randomNumber = Math.random();
  }

  get number() {
    //we can store pure data and format it in getters
    return Math.floor(this.randomNumber * 100);
  }
}

export default Storage;
```

> **Important!** You should use getters for any methods, that are not modifying any data in the service. If you use common function for that purpose, it may result into an infinite loop. Any non-getter methods of service will update components that specified the service in their `toUse` or `toRender` options.  

Then, let's create a service that will automatically update the random number (`services/intervalService.js`):
```javascript
import {Service} from 'react-services-injector';

class IntervalService extends Service {
  constructor() {
    super();

    this.enabled = false;
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  serviceDidConnect() {
    const {Storage} = this.services;

    setInterval(() => this.enabled && Storage.changeNumber(), 1000);
  }
}

export default IntervalService;
```

> **Important!** Any non-getter methods of service always returns promise. ALWAYS! Even if you return a pure number, you will have to use `.then()` in a component or another service to get value. 

Create an `index.js` in your `services` directory to export them all:
```javascript
import Storage from './storage';
import IntervalService from './intervalService';

//always export array, even if you have only one service
export default [Storage, IntervalService];
```

Register your service in the main file (`app.js`):
```javascript
import React from 'react';
import {render} from 'react-dom';
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
import React from 'react';
import {injector} from 'react-services-injector';
import Test from './Test';

class App extends React.Component {
  render() {
    const {Storage} = this.services;

    return (
      <h2>
        The random nubmer is: {Storage.number}

        <Test /> //definition below
      </h2>
    );
  }
}

export default injector.connect(App, {
  toRender: ['Storage'] //we only need Storage in the component
});
```
> **Important!** second argument of `injector.connect` is object containing two arrays: `toRender` and `toUse`. `toRender` should contain names of services that render result of component depends on. Other services that you use in the component should be in the `toUse` array.  
> **Note:** you shouldn't use services in the class constructor. You can't to, actually. Use it, for example, in the `componentWillMount` lifecycle method if you need something to be done once component is created.

Here is our `Test` component:
```javascript
import React from 'react';
import {injector} from 'react-services-injector';

class Test extends React.Component {
  render() {
    const {Storage, IntervalService} = this.services;

    return (
      <div>
        <button onClick={() => Storage.changeNumber()}>
          Generate number
        </button>

        <button onClick={() => IntervalService.toggle()}>
          Auto-generation: 
          {IntervalService.enabled ? 'ENABLED' : 'DISABLED'}
        </button>
      </div>
    );
  }
}

export default injector.connect(Test, {
  toRender: ['IntervalService'], //render result depends only on IntervalService
  toUse: ['Storage'] //but we also need to use Storage
});
```

You can also use services in another services in the same way in any method except `constructor`.

Initialization
--------------
If you need to do some initialization of your service (probably asynchronous), you can use `serviceDidConnect` lifecycle method of service. That is the only lifecycle method so far.

Behavior
========
#### Data modifying 
Never modify service fields from outside! Make a method for that. Don't use setters. 

#### Data storing
It's better (not always) to store pure data in the service class and format it in getters.

#### Singletons
Services are singletons, so you can use your service in multiple components to store/get/modify any data.

#### Asynchronous actions
If you want to do some asynchronous stuff (like http requests or `setTimeout`) if your service, please use `this.$update()` after it is done (remember `$scope.$apply()`, huh?) 
For example:
```javascript
changeNumber() {
  httpGet('/number')
    .then(number => {
      this.randomNumber = number;
      this.$update();
    })
}
```
#### Only ES6 classes
It is already 2017, right? Please, use ES6 classes instead of `React.createComponent` (especially as even React says that method is deprecated). Also, the library won't connect your functional components -- create a class if you want to use services there.

#### `toRender` and `toUse`
It's not important, but strongly recommended to pass options object to the `connect()` method. 
If you don't pass it, the component will be connected to all services. 
If you do pass, but don't specify one of `toRender` or `toUse` arrays, component will be connected only to specified services.

#### Dependencies
`require()` function should be supported in the project. 
Recommended bundler is `webpack`.

#### Troubleshooting
Please, feel free to create an issue any time if you found a bug or unexpected behavior.
Feature requests are pretty much acceptable too.
