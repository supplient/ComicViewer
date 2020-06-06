
function $(id) {
    return document.getElementById(id);
}

function createImg(img_path, max_height, max_width, callback) {
    var img = new Image(max_width, max_height);
    img.src = urlEscape(img_path);
    img.onload = ()=>{
        var nat_height = img.naturalHeight;
        var nat_width = img.naturalWidth;
        var tmp = adjustWidthHeight(nat_width, nat_height, max_width, max_height);
        img.width = tmp[0];
        img.height = tmp[1];
        if(callback)
            callback(img);
    };
    return img;
}

function adjustWidthHeight(nat_width, nat_height, max_width, max_height) {
    var max_ratio = max_height / max_width;
    var width, height;
    if(nat_height <= max_height && nat_width <= max_width)
        return [nat_width, nat_height];

    var nat_ratio = nat_height / nat_width;
    if(nat_ratio > max_ratio) {
        height = max_height;
        width = max_height / nat_ratio;
    }
    else {
        width = max_width;
        height = max_width * nat_ratio;
    }
    return [width, height];
}

function urlEscape(url) {
    url = url.replace("+", "%2B");
    url = url.replace(" ", "%20");
    url = url.replace("%", "%25");
    url = url.replace("#", "%23");
    url = url.replace("&", "%26");
    url = url.replace("=", "%3D");
    return url;
}