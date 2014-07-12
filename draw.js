var Q = require('q');
var fs = require('fs');
var _ = require('lodash');
var Canvas = require('canvas');

function textsize(str, size, font) {
    // We only want the context to do our predictions
    var ctx = new Canvas().getContext('2d');

    // Set font
    ctx.font = size+"px "+font;

    // Get dimensions it would occupy
    return ctx.measureText(str);
}

// Get the good font size for text to fit in a given width
function fontSizeForWidth(str, font, width, lower, upper) {
    // Lower and upper bounds for font
    lower = (lower === undefined) ? 0 : lower;
    upper = (upper === undefined) ? 120 : upper;

    // The font size we're guessing with
    var middle = Math.floor((upper + lower) / 2);

    // Get text dimensions
    var tsize = textsize(str, middle, font);

    if(middle === lower) {
        return middle;
    }

    return (
        // Are we above or below ?
        (tsize.width < width) ?
        // Go up
        fontSizeForWidth(str, font, width, middle, upper) :
        // Go down
        fontSizeForWidth(str, font, width, lower, middle)
    );
}

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

    var fsize = fontSizeForWidth(
        options.title,
        options.font.family,

        // Cover width with some margin
        Math.floor(options.size.w * 0.8),

        0,
        options.size.w
    );

    options.font.size = options.font.size || fsize;

    var canvas = new Canvas(options.size.w, options.size.h);

    var ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = options.background.color;
    ctx.fillRect(0, 0, options.size.w, options.size.h);

    // Title
    ctx.fillStyle = options.font.color;
    ctx.font = options.font.size+"px "+options.font.family;
    ctx.fillText(
        // Title
        options.title,
        // Left Margin
        Math.floor(options.size.w * 0.1),
        // Top Margin
        options.font.size
    );

    var fasize = fontSizeForWidth(
        options.author,
        options.font.family,

        // Cover width with some margin
        Math.floor(options.size.w * 0.8) / 4,

        0,
        options.size.w
    );

    // Author
    ctx.fillStyle = options.font.color;
    ctx.font = fasize+"px "+options.font.family;
    ctx.fillText(
        // Title
        options.author,
        // Left Margin
        Math.floor(options.size.w * 0.1),
        // Top Margin
        options.size.h * 0.9
    );

    // Published with GitBook
    var pngData = fs.readFileSync(__dirname + '/published-with-gitbook.png');
    img = new Canvas.Image();
    img.src = pngData;
    ctx.drawImage(img, options.size.w - img.width/1.5, options.size.h - img.height/1.5, img.width/1.5, img.height/1.5);


    var out = fs.createWriteStream(output);
    var stream = canvas.jpegStream();

    stream.pipe(out);

    stream.on('end', d.resolve);

    return d.promise;
};
