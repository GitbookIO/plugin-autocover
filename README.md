Cover Generation for GitBook
================

Generate a cover for the book.

## Installation

```
$ npm install gitbook-plugin-autocover
```

This module use [node-canvas](https://github.com/LearnBoost/node-canvas). You need to install some modules on your system before being able to use it: [Wiki of node-canvas](https://github.com/LearnBoost/node-canvas/wiki/_pages).

## How to use it:

In your **book.json**:

```
{
    "plugins": ["autocover"],
    "pluginsConfig": {
        "autocover": {
            // Configuration for autocover (see below)
        }
    }
}
```

## Configuration

Here is default configuration of **autocover**, you can change it in your book.json:

```js
{
    "title": "My Book",
    "author": "Author",
    "font": {
        "size": null,
        "family": "Impact",
        "color": "#FFF"
    },
    "size": {
        "w": 1800,
        "h": 2360
    },
    "background": {
        "color": "#09F"
    }
}
```
