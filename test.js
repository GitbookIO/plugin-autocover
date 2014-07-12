var draw = require('./draw');

draw('./test.jpeg', {
    title: "Wordpress tutorials"
})
.then(function() {
    console.log('Finished !');
})
.fail(function(err) {
    console.log(err);
});
