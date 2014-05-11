var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var Canvas = require('canvas');

var createCover = function(output, options) {
    var d = Q.defer();

    options = _.defaults(options || {}, {
        "title": "My Book",
        "author": "Author",
        "font": {
            "size": null,
            "family": "Impact",
            "color": '#FFF'
        },
        "size": {
            "w": 1600,
            "h": 2400
        },
        "background": {
            "color": '#09F'
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
    var stream = canvas.createPNGStream();

    stream.on('data', function(chunk){
        out.write(chunk);
    });
    stream.on('end', function() {
        d.resolve();
    });

    return d.promise;
};

module.exports = {
    book: {},
    hooks: {
        "finish": function() {
            // Check if a cover already exists in the input
            if (fs.existsSync(path.join(this.options.input, "book.jpg"))
            || fs.existsSync(path.join(this.options.input, "book.png"))) {
                return;
            }

            // Generate cover
            return createCover(
            path.join(this.options.output, "book.jpg"),
            _.extend({}, {
                title: this.options.title
            }, this.options.pluginsConfig.autocover));
        }
    }
};
