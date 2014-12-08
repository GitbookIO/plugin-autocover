var assert = require('assert');

var titleParts = require('../lib/titleparts');


describe('title parts', function() {
    it('should split and group across lines', function() {
        var parts = titleParts(
            // Title
            "The Swift Programming Language 中文版",
            // Font
            "Helvetica",
            // Boundary dimensions
            1800 * 0.8, // Width
            2360 * 0.10 // Heigh
        );

        console.log("parts =", parts);
        assert.equal(parts.length, 4, "Title should be splt across 4 lines");
    });
});
