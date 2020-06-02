// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {dialog, BrowserWindow} = require('electron').remote
const fs = require("fs");

function $(id) {
    return document.getElementById(id);
}

window.addEventListener('DOMContentLoaded', () => {
    $("dirGetTest").onclick = () => {
        dialog.showOpenDialog({ properties: ['openDirectory'] }).then((dialog_select) => {
            var dir_path = dialog_select.filePaths[0];
            console.log(dir_path);
            fs.readdir(dir_path, (err, files)=>{
                console.log(files);
            });
        })
    };

    $("fullscreenTest").onclick = () => {
        const mainWindow = new BrowserWindow({
            fullscreen: true,
            webPreferences: {
                // preload: path.join(__dirname, 'preload.js'),
                // nodeIntegration: true,
                // enableRemoteModule: true
            }
        });

        // and load the index.html of the app.
        mainWindow.loadFile('view.html');
    };

    const max_height = 200;
    const max_width = 50;
    const max_ratio = max_height / max_width;
    var img = new Image();
    img.src = "01.jpg";
    img.onload = ()=>{
        var nat_height = img.naturalHeight;
        var nat_width = img.naturalWidth;
        if(nat_height <= max_height && nat_width <= max_width)
            return;

        var nat_ratio = nat_height / nat_width;
        if(nat_ratio > max_ratio) {
            img.height = max_height;
            img.width = max_height / nat_ratio;
        }
        else {
            img.width = max_width;
            img.height = max_width * nat_ratio;
        }
        $("imageSet").append(img);
    };
})
