var Q = require('q');
var fs = require('fs');
var _ = require('lodash');
var Canvas = require('canvas');
var compileFromFile = require('svg-templater').compileFromFile;
var canvg = require("canvg");
var fontSize = require('./lib/fontsize');

var topics = require('./topic');
var colors = require('./colors.json');


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

    // Height allocated to each part
    var maxLineHeight = Math.floor(options.size.h * 0.1);

    // Words of title
    var parts = options.title.split(/\s+/);

    options.title = parts.reduce(function(lines, part) {
        // First part
        if(lines.length === 0) return [part];

        // Last processed part
        var prevPart = lines[lines.length - 1];
        // Current part appended to last part
        var newPart = prevPart + ' ' + part;

        // Size of previous part by itself
        var fsize = fontSize(
            prevPart,
            options.font, maxWidth, maxLineHeight
        );

        // How big is it if we add our new part ?
        var fsize2 = fontSize(
            newPart,
            options.font, maxWidth, maxLineHeight
        );

        // If sizes are the same, then merge parts to same line
        if(fsize == fsize2 && fsize2) {
            lines[lines.length - 1] = newPart;
            return lines;
        }

        return lines.concat(part);
    }, []);

    options.size.title = options.size.title ||
    Math.min.apply(Math, options.title.map(function(title)
    {
      return fontSize(
        title, options.font.family, maxWidth,
        Math.min(
          Math.floor(options.size.h * 0.6 / options.title.length),
          maxLineHeight
        )
      );
    }));


    //
    // Author size
    //

    options.size.author = options.size.author || fontSize(
        options.author,
        options.font.family, maxWidth, options.size.h
    );


    //
    // Generate the cover
    //

    var d = Q.defer();

    var template = fs.existsSync('cover.svg') ? 'cover.svg' : options.template;

    compileFromFile(template, options, function(error, data) {
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
