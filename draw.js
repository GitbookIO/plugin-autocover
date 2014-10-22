var Q = require('q');
var fs = require('fs');
var _ = require('lodash');
var Canvas = require('canvas');
var compileFromFile = require('svg-templater').compileFromFile;
var canvg = require("canvg");

var topics = require('./topic');
var colors = require('./colors.json');


function textsize(str, size, font) {
    // We only want the context to do our predictions
    var ctx = new Canvas().getContext('2d');

    // Set font
    ctx.font = size+"px "+font;

    // Get dimensions it would occupy
    var dim = ctx.measureText(str);

    return {
        width: dim.width,
        height: dim.emHeightAscent + dim.emHeightDescent,
    };
}

// Get the good font size for text to fit in a given width
function fontSizeForDimensions(str, font, width, height, lower, upper) {
    // Lower and upper bounds for font
    lower = (lower === undefined) ? 0 : lower;
    upper = (upper === undefined) ? 1000 : upper;

    // The font size we're guessing with
    var middle = Math.floor((upper + lower) / 2);

    if(middle === lower) return middle;

    // Get text dimensions
    var tsize = textsize(str, middle, font);

    return (
        // Are we above or below ?
        (tsize.width <= width && tsize.height <= height) ?
        // Go up
        fontSizeForDimensions(str, font, width, height, middle, upper) :
        // Go down
        fontSizeForDimensions(str, font, width, height, lower, middle)
    );
}


module.exports = function(output, options) {

    //
    // Default options
    //

    options = _.defaults(options || {}, {
        "title": "",
        "author": "",
        "font": {
            "size": null,
            "family": "Arial",
            "color": '#424242'
        },
        "template": "templates/default.svg",
        "size": {
            "w": 1800,
            "h": 2360
        },
        "background": {
            "color": '#fff'
        }
    });


    //
    // Topic color
    //

    var topic = topics(options.title)[0];

    options.topic = options.topic || {};
    options.topic.color = (topic && colors[topic]) ? colors[topic] : colors.default;


    //
    // Title split in lines & size
    //

    // Max width that text can take
    var maxWidth = Math.floor(options.size.w * 0.8);

    // Words of title
    var parts = options.title.split(/\s+/);

    // Height allocated to each part
    var partHeight = Math.min(
        Math.floor((options.size.h * 0.6) / parts.length),
        Math.floor(options.size.h * 0.1)
    );

    options.title = parts.reduce(function(lines, part) {
        // First part
        if(lines.length === 0) return [part];

        // Last part
        var prevPart = lines[lines.length - 1];
        // Current part appended to last part
        var newPart = prevPart + ' ' + part;

        // Size of previous part by itself
        var fsize = fontSizeForDimensions(
            prevPart,
            options.font, maxWidth, partHeight
        );

        // How big is it if we add our new part ?
        var fsize2 = fontSizeForDimensions(
            newPart,
            options.font, maxWidth, partHeight
        );

        // If sizes are the same, then merge parts to same line
        if(fsize == fsize2) {
            lines[lines.length - 1] = newPart;
            return lines;
        }

        return lines.concat(part);
    }, []);

    options.size.title = options.size.title
    || Math.min.apply(Math, options.title.map(function(title)
    {
      return fontSizeForDimensions(
        title, options.font.family, maxWidth, partHeight
      );
    }))


    //
    // Author size
    //

    options.size.author = options.size.author || fontSizeForDimensions(
        options.author,
        options.font.family,

        // Cover width with some margin
        Math.floor(options.size.w * 0.8) / 4,
        100
    );


    //
    // Generate the cover
    //

    var d = Q.defer();

    compileFromFile(options.template, options, function(error, data) {
      if(error) return d.reject(error);

      // Setup canvas & context
      var canvas = new Canvas(options.size.w, options.size.h);

      // Render SVG image
      canvg(canvas, data,
      {
        ignoreAnimation: true,
        renderCallback: function()
        {
          // Create streams
          var out = fs.createWriteStream(output);
          var stream = canvas.jpegStream();

          // Pipe
          stream.pipe(out);

          // Wait till finished piping/writing
          out.on('close', d.resolve);
          out.on('error', d.reject);
        }
      });
    });

    return d.promise;
};
