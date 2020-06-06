
window.addEventListener('DOMContentLoaded', () => {
    var args = process.argv.slice(-1);
    document.getElementById("test").src = args[0];
    console.log(args);
});