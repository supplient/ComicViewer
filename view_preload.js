const { remote } = require("electron");
const { Menu, MenuItem } = remote;

const screen_width = remote.getCurrentWindow().getSize()[0];
const screen_height = remote.getCurrentWindow().getSize()[1];

function updateImageDiv(img_ele) {
    $("imageDiv").innerHTML = "";
    $("imageDiv").append(img_ele);
    console.log(screen_height);
    console.log(screen_width);
}

window.addEventListener('DOMContentLoaded', () => {
    $("imgaeDiv").style = "width:" + toString(screen_width) + "; height:" + toString(screen_height) + ";";

    var args = process.argv.slice(-1);
    var img_path = args[0];

    var img_ele = createImg(img_path, screen_height, screen_width);
    updateImageDiv(img_ele);
});

// Build right menu
const right_menu = new Menu();
right_menu.append(new MenuItem({
    label: "Exit",
    click: function() {
        console.log("clicked");
        remote.getCurrentWindow().close();
    }
}));
window.addEventListener("contextmenu", function(e) {
    e.preventDefault();
    right_menu.popup({window: remote.getCurrentWindow()});
});