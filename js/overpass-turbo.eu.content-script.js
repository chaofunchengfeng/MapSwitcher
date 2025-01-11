// https://overpass-turbo.eu/ 添加 Google Map 卫星图瓦片

(function () {

    if (!window.localStorage) {
        return;
    }

    //
    let key = "overpass-ide_customTiles";
    let itemStr = window.localStorage.getItem(key);
    if (!itemStr) {
        itemStr = "[]";
    }

    //
    let item = JSON.parse(itemStr);
    let customTiles = "https://khms3.google.com/kh/v=992?x={x}&y={y}&z={z}";
    if (item.includes(customTiles)) {
        return;
    }

    //
    item.push(customTiles);
    window.localStorage.setItem(key, JSON.stringify(item));

    //
    location.reload();

})();

