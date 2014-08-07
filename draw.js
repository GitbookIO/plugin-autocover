var Q = require('q');
var fs = require('fs');
var _ = require('lodash');
var Canvas = require('canvas');

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

    // Get text dimensions
    var tsize = textsize(str, middle, font);

    if(middle === lower) {
        return middle;
    }

    return (
        // Are we above or below ?
        (tsize.width <= width && tsize.height <= height) ?
        // Go up
        fontSizeForDimensions(str, font, width, height, middle, upper) :
        // Go down
        fontSizeForDimensions(str, font, width, height, lower, middle)
    );
}

function drawBackground(ctx, options) {
    ctx.fillStyle = options.background.color;
    ctx.fillRect(0, 0, options.size.w, options.size.h);
}

function drawTitle(ctx, options) {
    // Continuous top offset
    var offset = Math.floor(options.size.h * 0.20);

    // Max width that text can take
    var maxWidth = Math.floor(options.size.w * 0.8);

    // Words of title
    var parts = options.title.split(/\s+/);

    // Height allocated to each part
    var partHeight = Math.min(
        Math.floor((options.size.h * 0.6) / parts.length),
        Math.floor(options.size.h * 0.1)
    );

    var lines = parts
    .reduce(function(lines, part) {
        // First part
        if(lines.length === 0) {
            return [part];
        }

        // Last part
        var prevPart = lines[lines.length - 1];
        // Current part appended to last part
        var newPart = prevPart + ' ' + part;

        // Size of previous part by itself
        var fsize = fontSizeForDimensions(
            prevPart,
            font, maxWidth, partHeight
        );


        // How big is it if we add our new part ?
        var fsize2 = fontSizeForDimensions(
            newPart,
            font, maxWidth, partHeight
        );

        // If sizes are the same, then merge parts to same line
        if(fsize == fsize2) {
            lines[lines.length - 1] = newPart;
            return lines;
        }

        return lines.concat(part);
    }, []);

    // Font
    var font = options.font.family;

    lines.forEach(function(part) {
        // Font size
        var fsize = fontSizeForDimensions(
            part, font, maxWidth, partHeight
        );

        // Text dimensions (width & height)
        var tdim = textsize(part, fsize, font);

        // Draw text
        ctx.fillStyle = options.font.color;
        ctx.font = fsize+"px "+font;
        ctx.fillText(
            // Part of title
            part,
            // Left Margin (center text)
            Math.floor(options.size.w/2 - tdim.width/2),
            // Top Margin
            offset
        );

        // Increase offset
        offset += tdim.height;
    });
}

function drawAuthor(ctx, options) {
    var fasize = fontSizeForDimensions(
        options.author,
        options.font.family,

        // Cover width with some margin
        Math.floor(options.size.w * 0.8) / 4,
        100
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
}

function drawPublished(ctx, options) {
    var w = options.size.w;
    var h = options.size.h;

    // Get image
    var pngData = fs.readFileSync(__dirname + '/published-with-gitbook.png');
    img = new Canvas.Image();
    img.src = pngData;

    var imgH = Math.floor(h * 0.15);
    var imgW = Math.floor(img.width * (imgH / img.height));

    ctx.drawImage(
        img,
        // Offset x
        w - imgW * 1.1,
        // Offset y
        h - imgH * 1.2,
        // Width
        imgW,
        // Height
        imgH
    );
}

function drawColor(ctx, options) {
    var _topics = topics(options.title);
    var topic = _topics[0];

    var color = (topic && colors[topic]) ? colors[topic] : colors.default;

    var hx = options.size.w / 2;
    var hy = options.size.h * 0.7;

    var x = 900;
    var y = 200;

    ctx.fillStyle = color;
    ctx.fillRect(hx-x/2, hy-y/2, x, y);
}

module.exports = function(output, options) {
    var d = Q.defer();

    // Default options
    options = _.defaults(options || {}, {
        "title": "",
        "author": "",
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

    // Setup canvas & context
    var canvas = new Canvas(options.size.w, options.size.h);
    var ctx = canvas.getContext('2d');

    // Background
    drawBackground(ctx, options);

    // Title
    drawTitle(ctx, options);

    // Author
    drawAuthor(ctx, options);

    // Published with GitBook
    drawPublished(ctx, options);

    // Draw the color (based on the detected topic)
    //drawColor(ctx, options);

    // Create streams
    var out = fs.createWriteStream(output);
    var stream = canvas.jpegStream();

    // Pipe
    stream.pipe(out);

    // Wait till finished piping/writing
    out.on('close', d.resolve);
    out.on('error', d.reject);

    return d.promise;
};
