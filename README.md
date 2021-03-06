# Ultrasonic

[![Build Status](https://secure.travis-ci.org/goliatone/ultrasonic.png)](http://travis-ci.org/goliatone/ultrasonic)

Ultrasonic chit chat

Taken from [here][src] and the [sonicnet][snet] library.


## Getting Started
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/goliatone/ultrasonic/master/dist/ultrasonic.min.js
[max]: https://raw.github.com/goliatone/ultrasonic/master/dist/ultrasonic.js

## Development
`npm install && bower install`

If you need to `sudo` the `npm` command, you can try to:

```terminal
sudo chown $(whoami) ~/.npm
sudo chown $(whoami) /usr/local/share/npm/bin
sudo chown -R $(whoami) /usr/local/lib/node_modules
```


If you bump versions, remember to update:
- package.json
- bower.json
- component.json
- etc.


## Bower
>Bower is a package manager for the web. It offers a generic, unopinionated solution to the problem of front-end package management, while exposing the package dependency model via an API that can be consumed by a more opinionated build stack. There are no system wide dependencies, no dependencies are shared between different apps, and the dependency tree is flat.

To register ultrasonic in the [bower](http://bower.io/) [registry](http://sindresorhus.com/bower-components/):
`bower register ultrasonic git://github.com/goliatone/ultrasonic.git`

Then, make sure to tag your module:

`git tag -a v0.1.0 -m "Initial release."`

And push it:

`git push --tags`


## Travis
In order to enable Travis for this specific project, you need to do so on your Travi's [profile](https://travis-ci.org/profile). Look for the entry `goliatone/ultrasonic`, activate, and sync.


## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Release History
_(Nothing yet)_

[src]:http://smus.com/ultrasonic-networking/
[snet]:https://github.com/borismus/sonicnet.js/tree/master/lib