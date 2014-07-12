var draw = require('./draw');

draw('./test.jpeg')
.then(function() {
    console.log('Finished !');
})
.fail(function(err) {
    console.log(err);
});
