var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var Canvas = require('canvas');

var createCover = require('./draw');

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

    // WARNING:
    // This is a hack to fix "Premature end of JPEG file" errors
    // Basically that error happens because data isn't flushed to the disk
    // By doing this setTimeout, we are forcing Node to go back to it's event loop
    // where it finishes the I/O and flushes the data to disk
    setTimeout(function() {
        img.src = input;
    }, 0);

    return d.promise;
};

var copy = function(from, to) {
    var d = Q.defer();
    var r = fs.createReadStream(from);
    var w = fs.createWriteStream(to);

    w.on('finish', d.resolve);
    w.on('error', d.reject);
    r.on('error', d.reject);

    r.pipe(w);

    return d.promise;
};

module.exports = {
    book: {},
    hooks: {
        "finish:before": function() {
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
                    title: that.options.title,
                    author: that.options.author
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
