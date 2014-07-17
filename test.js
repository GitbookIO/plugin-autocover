var draw = require('./draw');

draw('./test.jpeg', {
    title: "The Swift Programming Language 中文版",
    author: "Samy Pessé"
})
.then(function() {
    console.log('Finished !');
})
.fail(function(err) {
    console.log(err);
});
