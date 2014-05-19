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
            "w": 1800,
            "h": 2360
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
    var stream = canvas.createJPEGStream();

    stream.on('data', function(chunk){
        out.write(chunk);
    });
    stream.on('end', function() {
        d.resolve();
    });

    return d.promise;
};

var resize = function(input, output, nSize) {
    var d = Q.defer();

    var img = new Canvas.Image();

    img.onerror = function(err){
        d.reject(err);
    };

    img.onload = function(){
        console.log(img.width, img.height);

        if (!nSize.height) nSize.height = (img.height*nSize.width)/img.width;

        var canvas = new Canvas(nSize.width, nSize.height);
        var ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, nSize.width, nSize.height);

        var out = fs.createWriteStream(output);
        var stream = canvas.createJPEGStream();

        stream.on('data', function(chunk){
            out.write(chunk);
        });
        stream.on('end', function() {
            d.resolve();
        });
    };

    img.src = input;

    return d.promise;
};

module.exports = {
    book: {},
    hooks: {
        "finish": function() {
            var that = this;

            return Q()

            // Generate big cover
            .then(function() {
                // Check if a cover already exists in the input
                if (fs.existsSync(path.join(that.options.input, "cover.jpg"))) {
                    return;
                }

                return createCover(
                path.join(that.options.output, "cover.jpg"),
                _.extend({}, {
                    title: that.options.title
                }, that.options.pluginsConfig.autocover));
            })

            // Generate small cover
            .then(function() {
                // Check if a cover already exists in the input
                if (fs.existsSync(path.join(that.options.input, "cover_small.jpg"))) {
                    return;
                }

                return resize(
                    path.resolve(that.options.output, "cover.jpg"),
                    path.join(that.options.output, "cover_small.jpg"),
                    {
                        width: 200
                    }
                );
            });
        }
    }
};
