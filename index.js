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

var copy = function(from, to) {
    var d = Q.defer();
    var f = fs.createReadStream(from);

    f.on('end', function() {
        d.resolve();
    });

    f.pipe(fs.createWriteStream(to));

    return d.promise;
};

module.exports = {
    book: {},
    hooks: {
        "finish": function() {
            var that = this;
            var multiLangs = that.options.langsSummary != null;

            var inputDir = that.options.input;
            var outputDir = that.options.output;

            if (multiLangs) {
                inputDir = path.resolve(inputDir, "..");
                outputDir = path.resolve(outputDir, "..");
            }

            return Q()

            // Generate big cover
            .then(function() {
                // Check if a cover already exists in the output
                if (fs.existsSync(path.join(outputDir, "cover.jpg"))) return Q();

                // Check if a cover already exists in the input
                if (fs.existsSync(path.join(inputDir, "cover.jpg"))) {
                    // Copy this cover
                    return copy(
                        path.join(inputDir, "cover.jpg"),
                        path.join(outputDir, "cover.jpg")
                    );
                }

                return createCover(
                path.join(outputDir, "cover.jpg"),
                _.extend({}, {
                    title: that.options.title
                }, that.options.pluginsConfig.autocover));
            })

            // Generate small cover
            .then(function() {
                // Check if a cover already exists in the output
                if (fs.existsSync(path.join(outputDir, "cover_small.jpg"))) return Q();

                // Check if a cover already exists in the input
                if (fs.existsSync(path.join(inputDir, "cover_small.jpg"))) {
                    // Copy this cover
                    return copy(
                        path.join(inputDir, "cover_small.jpg"),
                        path.join(outputDir, "cover_small.jpg")
                    );
                }

                return resize(
                    path.resolve(outputDir, "cover.jpg"),
                    path.join(outputDir, "cover_small.jpg"),
                    {
                        width: 200
                    }
                );
            })

            // Ignore error
            .fail(function(err) {
                console.log("Error with autocover: ", err.stack || err.message || err);
                return Q();
            });
        }
    }
};
