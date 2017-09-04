React Services Injector
===================
Got tired with Redux? 
Or maybe you are used to be an Angular-developer? 
Then you definitely should try some services in React! 
The library helps you to connect components one to each other and create shared stores.

Data flow and principles
-------------
The main principle of services injector is to update components automatically each time you change any data so you don't need to control that process. 
Also, the library written in the as-simple-as-possible way: it doesn't require you to write tons of code (as Redux does). Sorry, I hate Redux. 

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

//"publicName" property is important if you use any kind of minimization on your JS
Storage.publicName = 'Storage';

export default Storage;
```

> **Important!** You should use getters for any method that is not modifying any data in the service. If you use common function for that purpose, it may result into an infinite loop. Any non-getter methods of service will update components that specified the service in their `toRender` property.  

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
    const {Storage} = this.services; //any service has access to all other services

    setInterval(() => this.enabled && Storage.changeNumber(), 1000);
  }
}

IntervalService.publicName = 'IntervalService';

export default IntervalService;
```
> **Important!** Any non-getter methods of service always returns promise. ALWAYS! Even if you return a pure number, you will have to use `.then()` in a component or another service to get value.
> **Note:** please, don't forget to set the `publicName` property. 

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
> **Important!** Second argument of `injector.connect` is object containing `toRender` array. `toRender` should contain names of services that render result of component depends on. You will be still able to use any service you want in the component.
  
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

//render result depends only on IntervalService, 
//although we use Storage in the method
export default injector.connect(Test, {
  toRender: ['IntervalService']
});
```

Initialization
--------------
If you need to do some initialization of your service (probably asynchronous), you can use `serviceDidConnect` lifecycle method of service. That is the only lifecycle method so far.

Handling of methods execution
-----------------------------
Handlers are designed to help in development and don't supposed to be used in production build.
You are able to handle any method execution, for example, to log anything that does happen with your data.
The library already has default logger, but it isn't used by default.
To use default logger, do something like this when registering services:
```javascript
import {injector, defaultLogger} from 'react-services-injector';
import services from './services';

injector.register(services.map(defaultLogger));
```
Of course, you can write your own handler. There is an `addExecutionHandler` function: 
```javascript
//returns modified service class
addExecutionHandler(service, function (method, args, components) {
  //method — name of called method
  //args — arguments
  //components — array of components that has been updated
  doSomething();
});
```
Example usage:
```javascript
import {injector, addExecutionHandler} from 'react-services-injector';
import services from './services';

function logger(service) {
  return addExecutionHandler(service, (method, args, components) => {
    console.log(method, args, components));
  }
}

injector.register(services.map(logger));
```
You can use multiple handlers:
```javascript
injector.register(services.map(logger).map(defaultLogger));
```
Or you can use one handler for some services and another handler for others:
```javascript
import {TestService1, TestService2, TestService3, TestService4} from './services';

injector.register([
    ...[TestService1, TestService2].map(defaultLogger),
    ...[TestService3, TestService4].map(anotherHandler)
]);
```
> **Note:** any handler will be called after method execution and after components updating.

Behavior
========
#### Communication
In your service you can access `this.services` property same as in components. All services will be avaiable there.

#### Data modifying 
Never modify service fields from outside! Make a method for that. Don't use setters.
For example, don't write `Storage.randomNumber = 5` in component. It won't update any components. But it will if you create function `changeNumber(newNumber)` in service and use it in component.
 
#### Helpers
It isn't a good idea to make services for helper functions like `formatDate` or `objectToArray`. Just make a simple JS class and import it.

#### Data storing
It's better (not always) to store pure data in the service and format it in getters.

#### Singletons
Services are singletons, you can use any service in multiple components to store/get same data.

#### Asynchronous actions
If you want to do some asynchronous stuff (like http requests or `setTimeout`) in your service, please use `this.$update()` after it is done (remember `$scope.$apply()`, huh?) 

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
But the best decision may be to create a method to set new number: it will update components anyway because it isn't asynchronous. Btw, avoid using any async actions in non-async services: it is much better to take away all async methods. For example, you can create some kind of `RequestService` or `APIService` to communicate w/ your backend.

#### Only ES6 classes
It is already 2017, right? Please, use ES6 classes instead of `React.createComponent` (especially as even React says that method is deprecated). Also, the library won't connect your functional components — create a class if you want to use services there.

#### `toRender` property
It is important to pass `toRender` array to the `connect()` method. 
If you don't pass it, the component's render method won't be connected to any services. 
So it will never be updated.

#### Dependencies
`require()` function should be supported in the project. 
Recommended bundler is `webpack`.

#### Troubleshooting
Please, feel free to create an issue any time if you find a bug or unexpected behavior.
Feature requests are pretty much acceptable too.