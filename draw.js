var Q = require('q');
var fs = require('fs');
var _ = require('lodash');
var Canvas = require('canvas');


module.exports = function(output, options) {
    var d = Q.defer();

    options = _.defaults(options || {}, {
        "title": "My Book",
        "author": "Author",
        "font": {
            "size": null,
            "family": "Arial",
            "color": '#424242'
        },
        "size": {
            "w": 1800,
            "h": 2360
        },
        "background": {
            "color": '#fff'
        }
    });
    options.font.size = options.font.size || (options.size.w/(options.title.length/2));

    var canvas = new Canvas(options.size.w, options.size.h);

    var ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = options.background.color;
    ctx.fillRect(0, 0, options.size.w, options.size.h);

    // Title
    ctx.fillStyle = options.font.color;
    ctx.font = options.font.size+"px "+options.font.family;
    ctx.fillText(options.title, 50, options.font.size);

    var out = fs.createWriteStream(output);
    var stream = canvas.jpegStream();

    stream.pipe(out);

    stream.on('end', d.resolve);

    return d.promise;
};
