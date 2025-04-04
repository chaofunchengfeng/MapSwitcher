import {defaultOptions} from '/js/defaultOptions.js';

// for 地图坐标系经纬度转换
// source code from https://github.com/hujiulong/gcoord
// license https://github.com/hujiulong/gcoord/blob/bd6e63d79bc38ad47e868ddab3bf263bca16b4c6/LICENSE (MIT License)
import gcoord from '/js/gcoord.esm-browser.prod.js';

// not Module scripts should use importScripts
// see: https://web.dev/es-modules-in-sw/
//
// TypeError: Failed to execute 'importScripts' on 'WorkerGlobalScope': Module scripts don't support importScripts().
// try {
//     importScripts('/js/gcoord.global.prod.js');
// } catch (e) {
//     console.error(e);
// }

// 获取设置
const optionsKeyArr = Object.keys(defaultOptions);
const options = defaultOptions;
chrome.storage.sync.get(null, (items) => {
    console.log("options:\t", items);
    for (let optionsKey of optionsKeyArr) {
        if (items[optionsKey]) {
            options[optionsKey] = items[optionsKey];
        }
    }
    console.log("options now:\t", options);
});

// 设置修改
chrome.storage.onChanged.addListener((changes) => {
    console.log("options changes:\t", changes);
    for (let optionsKey of optionsKeyArr) {
        if (changes[optionsKey]) {
            options[optionsKey] = changes[optionsKey].newValue;
        }
    }
    console.log("options now:\t", options);
});

// // 首次安装 同步默认设置
// chrome.runtime.onInstalled.addListener((details) => {
//     if (details.reason !== chrome.runtime.OnInstalledReason.INSTALL) {
//         return;
//     }
//     void chrome.storage.sync.set(defaultOptions);
// });

// action from popup.html
chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (message) {
        void doAction(message.command, message.tab)
    });
})

// action from 快捷键
chrome.commands.onCommand.addListener(async (command, tab) => {
    void doAction(command, tab)
});

/**
 * doAction
 */
async function doAction(command, tab) {
    console.log("****************************************************************************************************");

    //
    console.log("tab url:\t", tab.url);

    //
    let mapInfo = await getCurrentMapInfo(tab);
    console.log("mapInfo1:\t", mapInfo);
    if (!mapInfo) {
        mapInfo = {};
    }
    coordSystemLngLatConvert(mapInfo);
    console.log("mapInfo2:\t", mapInfo);

    //
    console.log("command:\t" + command);

    //
    // let funcName = "getUrl2" + command.substring(10);
    // let url = eval(funcName+"(mapInfo)");

    //
    let url;
    switch (command) {
        case "command1ToAmap": {
            url = getUrl2Amap(mapInfo);
            break;
        }
        case "command2ToBaiduMap": {
            url = getUrl2BaiduMap(mapInfo);
            break;
        }
        case "command3ToGoogleSatellite": {
            url = getUrl2GoogleSatellite(mapInfo);
            break;
        }
        case "command4ToGoogleEarth": {
            url = getUrl2GoogleEarth(mapInfo);
            break;
        }
        case "command5ToGoogleMap": {
            url = getUrl2GoogleMap(mapInfo);
            break;
        }
        case "command6ToTencentMap": {
            url = getUrl2TencentMap(mapInfo);
            break;
        }
        case "command7ToOverpassTurbo": {
            url = getUrl2OverpassTurbo(mapInfo);
            break;
        }
        default: {
            return;
        }
    }

    // open new url
    let newTab = await createTab(tab, url);

    // Google卫星隐藏标签
    // if ("command3ToGoogleSatellite" === command && url.indexOf("/place/") === -1) {
    if ("command3ToGoogleSatellite" === command) {
        googleSatelliteHideLabels(newTab);
    }

}

/**
 * 注入js
 * @param tab
 * @param injectedFunction
 * @param args
 * @returns
 */
async function callInjectedFunction(tab, injectedFunction, ...args) {
    console.log("callInjectedFunction:\t", injectedFunction.name);
    console.log("args:\t", args);
    // 注入
    let injection = {
        target: {tabId: tab.id}, func: injectedFunction, world: "MAIN"
    };
    if (args && args.length > 0) {
        injection.args = args;
    }
    let arr = await chrome.scripting.executeScript(injection);
    let result = arr[0].result;
    console.log("injectedFunction result:\t", result);
    return result;
}

/**
 * Google卫星隐藏标签
 * @param tab
 */
function googleSatelliteHideLabels(tab) {
    let pollCount = 0;
    let intervalID = setInterval(async () => {
        try {
            pollCount++;
            if (pollCount > 5) {
                clearInterval(intervalID);
                // 注入
                void callInjectedFunction(tab, injectedFunctionGoogleSatelliteHideLabels);
                return;
            }
            if ("complete" === tab.status) {
                clearInterval(intervalID);
                // 注入
                void callInjectedFunction(tab, injectedFunctionGoogleSatelliteHideLabels);
            }
        } catch (e) {
            console.error(e)
            clearInterval(intervalID);
        }
    }, 200);
}

/**
 * 注入 - Google卫星隐藏标签
 */
function injectedFunctionGoogleSatelliteHideLabels() {

    let pollCount = 0;
    let intervalID = setInterval(async () => {
        try {
            pollCount++;
            if (pollCount > 50) {
                clearInterval(intervalID);
                return;
            }

            let elementNodeListOf = document.querySelectorAll("button[jsaction='layerswitcher.intent.labels']");
            if (!elementNodeListOf.length) {
                return;
            }
            if (elementNodeListOf.length > 1) {
                clearInterval(intervalID);
                return;
            }

            clearInterval(intervalID);
            // 隐藏标签
            elementNodeListOf[0].click();
        } catch (e) {
            console.error(e)
            clearInterval(intervalID);
        }
    }, 200);


    // document.querySelectorAll("button[jsaction='layerswitcher.intent.labels']")[0].click();
}

/**
 * 从当前页面中获取经纬度等信息
 * @param tab
 * @returns {lng, lat, coordType} mapInfo
 */
async function getCurrentMapInfo(tab) {
    if (!tab || !tab.url) {
        return null;
    }
    let urlObj = new URL(tab.url);
    if ("http:" !== urlObj.protocol && "https:" !== urlObj.protocol) {
        return null;
    }

    let mapInfo = {};
    let urlPathname = urlObj.pathname;
    let urlHost = urlObj.host;
    if (urlHost.endsWith("amap.com") || urlHost.endsWith("gaode.com")) {
        // 高德地图

        // poiid获取
        if (urlPathname.startsWith("/place/") || urlPathname.startsWith("/detail/")) {
            const poiid = urlPathname.substring(urlPathname.indexOf("/", 1) + 1);

            // 仅地图页
            if (urlPathname.startsWith("/place/")) {
                let amapPlacePoint = await callInjectedFunction(tab, injectedFunctionGetAmapPlacePoint, poiid);
                if (amapPlacePoint) {
                    mapInfo.coordType = gcoord.GCJ02;
                    mapInfo.lng = amapPlacePoint.lng;
                    mapInfo.lat = amapPlacePoint.lat;
                    return mapInfo;
                }
            }

            if (options.amapKey) {
                const data = await getAmapPoiidDetail(poiid);
                if (data && data.pois && data.pois.length) {
                    const pois = data.pois[0];
                    console.log("poiid lnglat:\t", pois.location);
                    let arr = pois.location.split(",");

                    mapInfo.coordType = gcoord.GCJ02;
                    mapInfo.lng = arr[0];
                    mapInfo.lat = arr[1];
                    // mapInfo.title = pois.name;
                    // mapInfo.content = pois.pname + pois.cityname + pois.adname + pois.address;
                    return mapInfo;
                }
            }
        }

        // if (options.amapKey && (urlPathname.startsWith("/place/") || urlPathname.startsWith("/detail/"))) {
        //     const poiid = urlPathname.substring(urlPathname.indexOf("/", 1) + 1);
        //     const data = await getAmapPoiidDetail(poiid);
        //     if (data && data.pois && data.pois.length) {
        //         const pois = data.pois[0];
        //         console.log("poiid lnglat:\t", pois.location);
        //         let arr = pois.location.split(",");
        //
        //         mapInfo.coordType = gcoord.GCJ02;
        //         mapInfo.lng = arr[0];
        //         mapInfo.lat = arr[1];
        //         // mapInfo.title = pois.name;
        //         // mapInfo.content = pois.pname + pois.cityname + pois.adname + pois.address;
        //         return mapInfo;
        //     }
        // }

        // 注入获取
        let amapCenter = await callInjectedFunction(tab, injectedFunctionGetAmapCenter);
        if (!amapCenter) {
            return null;
        }

        mapInfo.coordType = gcoord.GCJ02;
        mapInfo.lng = amapCenter.lng;
        mapInfo.lat = amapCenter.lat;
        return mapInfo;
    } else if ("map.baidu.com" === urlHost || "ditu.baidu.com" === urlHost) {
        // 百度地图

        // 街景获取
        if (urlObj.hash && urlObj.hash.startsWith("#panoid=")) {

            //
            let regexp = /#panoid=([0-9A-Za-z]*?)&/g;
            let found = urlObj.hash.match(regexp);

            if (found && found[0]) {
                let panoId = found[0].substring(8, found[0].length - 1);

                //
                let baiduMapPanoPoint = await callInjectedFunction(tab, injectedFunctionGetPanoPoint, panoId)
                if (baiduMapPanoPoint) {
                    mapInfo.coordType = gcoord.BD09MC;
                    mapInfo.lng = baiduMapPanoPoint.lng;
                    mapInfo.lat = baiduMapPanoPoint.lat;
                    return mapInfo;
                }

            }

        }

        // 获取uid
        let uid = urlObj.searchParams.get("uid");
        if (uid) {
            let baiduMapUidPoint = await callInjectedFunction(tab, injectedFunctionGetBaiduMapUidPoint, uid);
            if (baiduMapUidPoint) {
                mapInfo.coordType = gcoord.BD09MC;
                mapInfo.lng = baiduMapUidPoint.lng;
                mapInfo.lat = baiduMapUidPoint.lat;
                return mapInfo;
            }
        }

        // if (options.baiduMapKey && urlObj.searchParams.get("uid")) {
        //     let uid = urlObj.searchParams.get("uid");
        //     const data = await getBaiduMapPoiUidDetail(uid);
        //     if (data && data.result && data.result.location) {
        //         const result = data.result;
        //         console.log("uid lnglat:\t", result.location);
        //
        //         mapInfo.coordType = gcoord.GCJ02;
        //         mapInfo.lng = result.location.lng;
        //         mapInfo.lat = result.location.lat;
        //         // mapInfo.title = result.name;
        //         // mapInfo.content = result.province + result.city + result.area + result.address;
        //         return mapInfo;
        //     }
        // }

        // url获取
        let regexp = /\/@[-\d.]*?,[-\d.]*?,[\d.]*?z/g;
        let found = urlPathname.match(regexp);
        if (!found || !found[0]) {
            return null;
        }
        let lngLatZoomStr = found[0].substring(2, found[0].length - 1);
        let lngLatArr = lngLatZoomStr.split(",");

        mapInfo.coordType = gcoord.BD09MC;
        mapInfo.lng = lngLatArr[0];
        mapInfo.lat = lngLatArr[1];
        return mapInfo;
    } else if ("qq-map.netlify.app" === urlHost) {
        // 腾讯地图街景
        if (!urlObj.hash) {
            return null;
        }
        let hashArr = urlObj.hash.replaceAll("#", "").split("&");
        let centerStr = hashArr.filter((item) => {
            return item.startsWith("center=")
        });
        if (!centerStr || !centerStr.length) {
            return null;
        }
        let lngLatArr = centerStr[0].substring(7).split("%2C");
        mapInfo.coordType = gcoord.GCJ02;
        mapInfo.lng = lngLatArr[1];
        mapInfo.lat = lngLatArr[0];
        return mapInfo;
    } else if (urlHost.indexOf("google.com") > -1) {
        // Google地图 && Google地球
        let isGoogleEarth = ("earth.google.com" === urlHost);
        if (isGoogleEarth) {
            if (!urlPathname.startsWith("/web/")) {
                return null;
            }
        } else if (!urlPathname.startsWith("/maps/")) {
            return null;
        }

        let regexp = /\/@[-\d.]*?,[-\d.]*?,/g;
        let found = urlPathname.match(regexp);
        if (!found || !found[0]) {
            return null;
        }

        let lngLatStr = found[0].substring(2, found[0].length - 1);
        let lngLatArr = lngLatStr.split(",");

        if (isGoogleEarth) {
            // Google地球
            mapInfo.coordType = gcoord.WGS84;
        } else if (urlPathname.indexOf("/data=!3m1!1e3") > -1) {
            // Google地图 - 卫星
            mapInfo.coordType = gcoord.WGS84;
        } else {
            // Google地图 - 默认
            mapInfo.coordType = gcoord.GCJ02;
        }

        mapInfo.lng = lngLatArr[1];
        mapInfo.lat = lngLatArr[0];
        return mapInfo;
    } else if ("overpass-turbo.eu" === urlHost) {
        let overpassTurboCenter = await callInjectedFunction(tab, injectedFunctionGetOverpassTurboCenter);
        mapInfo.coordType = gcoord.WGS84;
        mapInfo.lng = overpassTurboCenter.lng ? overpassTurboCenter.lng : 0;
        mapInfo.lat = overpassTurboCenter.lat ? overpassTurboCenter.lat : 0;
        return mapInfo;
    } else {

        // 三方引入

        // 高德地图
        let mapCenter = await callInjectedFunction(tab, injectedFunctionGetAmapCenter);
        if (mapCenter && mapCenter.lng && mapCenter.lat) {
            console.log("third party:\t高德");
            mapInfo.coordType = gcoord.GCJ02;
            mapInfo.lng = mapCenter.lng;
            mapInfo.lat = mapCenter.lat;
            return mapInfo;
        }

        // 百度地图
        mapCenter = await callInjectedFunction(tab, injectedFunctionGetThirdPartyBmapCenter);
        if (mapCenter && mapCenter.lng && mapCenter.lat) {
            console.log("third party:\t百度");
            mapInfo.coordType = gcoord.BD09;
            mapInfo.lng = mapCenter.lng;
            mapInfo.lat = mapCenter.lat;
            return mapInfo;
        }

        // flightradar24
        mapCenter = await callInjectedFunction(tab, injectedFunctionGetThirdPartyFlightradar24Center);
        if (mapCenter && mapCenter.lng && mapCenter.lat && mapCenter.coordType) {
            console.log("third party:\tflightradar24");
            // mapInfo.coordType = gcoord.GCJ02;
            // mapInfo.lng = mapCenter.lng;
            // mapInfo.lat = mapCenter.lat;
            // return mapInfo;
            return mapCenter;
        }

        console.log("third party:\tnull");

    }

//
    return null;
}

/**
 * 不同坐标系经纬度转换
 * @param mapInfo
 */
function coordSystemLngLatConvert(mapInfo) {
    if (!mapInfo.lng || !mapInfo.lat || !mapInfo.coordType) {
        mapInfo.status = false;
        return;
    }

    //
    mapInfo.status = true;

    // to WGS84
    const wgs84LngLat = gcoord.transform([mapInfo.lng, mapInfo.lat], mapInfo.coordType, gcoord.WGS84);
    mapInfo.wgs84Lng = wgs84LngLat[0];
    mapInfo.wgs84Lat = wgs84LngLat[1];

    // to GCJ02
    const gcj02LngLat = gcoord.transform([mapInfo.lng, mapInfo.lat], mapInfo.coordType, gcoord.GCJ02);
    mapInfo.gcj02Lng = gcj02LngLat[0];
    mapInfo.gcj02Lat = gcj02LngLat[1];

    // to BD09MC
    const bd09mcLngLat = gcoord.transform([mapInfo.lng, mapInfo.lat], mapInfo.coordType, gcoord.BD09MC);
    mapInfo.bd09mcLng = bd09mcLngLat[0];
    mapInfo.bd09mcLat = bd09mcLngLat[1];

    // to BD09
    const bd09LngLat = gcoord.transform([mapInfo.lng, mapInfo.lat], mapInfo.coordType, gcoord.BD09);
    mapInfo.bd09Lng = bd09LngLat[0];
    mapInfo.bd09Lat = bd09LngLat[1];
}

/**
 * 注入高德地图，获取经纬度
 * @returns {*|{lat}|{lng}} gcj02
 */
function injectedFunctionGetAmapCenter() {
    // let center = window.themap.getBounds(1).getCenter();
    // if (center.lng && center.lat) {
    //     return center;
    // }
    // return window.amap.getCenter();

    // 2024年12月22日 兼容三方引入
    if (window.themap && window.themap.getBounds) {
        let center = window.themap.getBounds(1).getCenter();
        if (center.lng && center.lat) {
            return center;
        }
    }

    if (window.amap && window.amap.getCenter) {
        let center = window.amap.getCenter();
        if (center.lng && center.lat) {
            return center;
        }
    }

    // 三方引入
    if (window.map && window.map.getCenter) {
        let center = window.map.getCenter();
        if (center.lng && center.lat) {
            return center;
        } else if (center.x && center.y) {
            center.lng = center.x;
            center.lat = center.y;
            return center;
        }
    }

    return null;
}

/**
 * 注入高德地图，获取place经纬度
 * @param poiid
 * @returns {{lng: *, lat: *}|null}
 */
function injectedFunctionGetAmapPlacePoint(poiid) {
    if (poiid) {

        // 1
        if (window.amap?.iwdata?.poiid && poiid === window.amap.iwdata.poiid //
            && window.amap.iwdata.pos?.lng && window.amap.iwdata.pos.lat) {
            return {lng: window.amap.iwdata.pos.lng, lat: window.amap.iwdata.pos.lat};
        }

        // 2
        if (window.amap?.placeinfo?.base?.poiid && poiid === window.amap.placeinfo.base.poiid  //
            && window.amap.placeinfo.base.x && window.amap.placeinfo.base.y) {
            return {lng: window.amap.placeinfo.base.x, lat: window.amap.placeinfo.base.y};
        }

        // 3
        if (window.amap?.hotSpotActive?.id && poiid === window.amap.hotSpotActive.id  //
            && window.amap.hotSpotActive.lnglat?.lng && window.amap.hotSpotActive.lnglat.lat) {
            return {lng: window.amap.hotSpotActive.lnglat.lng, lat: window.amap.hotSpotActive.lnglat.lat};
        }

    }
    return null;
}

/**
 * 注入百度地图，获取uid经纬度
 * @param uid
 * @returns {{lng: *, lat: *}|null}
 */
function injectedFunctionGetBaiduMapUidPoint(uid) {
    if (uid) {
        if ("poi" !== window._appStateFromUrl.feature) {
            return null;
        }

        let data = window.jssdkCurPoiCard || window.prePoiDetailCard;
        if (!data || !data.jssdkBaseData) {
            return null;
        }

        if (uid !== data.jssdkBaseData.uid) {
            return null;
        }

        if (data.jssdkBaseData.x && data.jssdkBaseData.y) {
            return {lng: data.jssdkBaseData.x, lat: data.jssdkBaseData.y};
        } else if (data.jssdkBaseData.navi_x && data.jssdkBaseData.navi_y) {
            return {lng: data.jssdkBaseData.navi_x, lat: data.jssdkBaseData.navi_y};
        } else {
            return null;
        }
    }
    return null;
}

/**
 * 注入百度地图，获取经纬度
 * @param panoId
 * @returns {{lng: *, lat: *}|null}
 */
function injectedFunctionGetPanoPoint(panoId) {
    if (panoId) {
        let _instances = window.$BAIDU$._instances;
        for (let key in _instances) {
            let value = _instances[key];
            if (value && value.container && value.container.id && value.container.id === "pano-flash-wrapper" && value.panorama && value.panorama.panoData && value.panorama.panoData.panoId === panoId) {

                //
                if (value.panorama.panoData.rx && value.panorama.panoData.ry) {
                    return {lng: value.panorama.panoData.rx, lat: value.panorama.panoData.ry};
                } else {
                    return {lng: value.panorama.panoData.panoX, lat: value.panorama.panoData.panoY};
                }

            }
        }
    }
    return null;
}

/**
 * 注入OverpassTurbo，获取经纬度
 * @returns {{lng: string, lat: string}} wgs84
 */
function injectedFunctionGetOverpassTurboCenter() {
    let lng = window.localStorage.getItem("overpass-ide_coords_lon");
    let lat = window.localStorage.getItem("overpass-ide_coords_lat");
    return {lng: lng, lat: lat};
}

/**
 * 注入三方百度地图，获取经纬度
 * @returns {*|{lat}|{lng}} BD09
 */
function injectedFunctionGetThirdPartyBmapCenter() {

    if (window._indoorMgr && window._indoorMgr._map && window._indoorMgr._map.getCenter) {
        return window._indoorMgr._map.getCenter();
    }

    return null;
}

/**
 * 注入 flightradar24，获取经纬度
 * @returns {*|{lat}|{lng}} gcj02
 */
function injectedFunctionGetThirdPartyFlightradar24Center() {

    // playback
    // for example: https://www.flightradar24.com/data/aircraft/b-2404#394bbe73
    if (window.nite?.map?.center?.lng && window.nite.map.center.lat) {
        let mapType = window.localStorage.getItem("map.type")
        if (mapType) {
            mapType = JSON.parse(mapType).toString();
        }
        return {
            lng: window.nite.map.center.lng(), lat: window.nite.map.center.lat(), coordType: getCoordType(mapType)
        }
    }

    // homepage
    let lng = window.localStorage.getItem("map.longitude");
    let lat = window.localStorage.getItem("map.latitude");
    if (lng && lat) {
        let mapType = null;
        let settings = window.localStorage.getItem("settings");
        if (settings) {
            let settingsObj = JSON.parse(settings);
            if (settingsObj?.map?.style) {
                mapType = settingsObj.map.style;
            }
        }
        return {lng: lng, lat: lat, coordType: getCoordType(mapType)};
    }

    return null;

    // "terrain"
    // "roadmap"
    // "simple_style"
    // "radar_style"
    // "radar_style2"
    // "aubergine_style"
    // "satellite"
    // "hybrid"
    // "black_white"
    function getCoordType(mapType) {
        if (mapType === "satellite" || mapType === "hybrid") {
            return "WGS84"
        }
        return "GCJ02";
    }
}

/**
 * 高德地图
 * @param mapInfo
 * @returns {string} url
 */
function getUrl2Amap(mapInfo) {
    if (!mapInfo.status) {
        // return "https://www.amap.com";
        return options.amapDefaultUrl;
    }

    // if (mapInfo.title) {
    //     let name = mapInfo.title;
    //     if (mapInfo.content) {
    //         name += ("%20%20" + mapInfo.content);
    //     }
    //     return "https://ditu.amap.com/regeo?lng=" + mapInfo.lng + "&lat=" + mapInfo.lat + "&name=" + name + "&src=uriapi&callnative=1&innersrc=uriapi";
    // } else {
    //     return "https://ditu.amap.com/regeo?lng=" + mapInfo.lng + "&lat=" + mapInfo.lat + "&src=uriapi&callnative=1&innersrc=uriapi";
    // }

    // 2023年2月20日 高德有bug，偶尔会因定位问题，视角跑偏
    // //  方式1：单点标注
    // // doc: https://lbs.amap.com/api/uri-api/guide/mobile-web/point
    // return "https://ditu.amap.com/regeo?lng=" + mapInfo.gcj02Lng + "&lat=" + mapInfo.gcj02Lat + "&src=uriapi&callnative=1&innersrc=uriapi";

    // 方式2：多点标注
    // doc: https://lbs.amap.com/api/uri-api/guide/mobile-web/points
    return "https://ditu.amap.com/marker?markers=" + mapInfo.gcj02Lng + "," + mapInfo.gcj02Lat + "&src=uriapi&innersrc=uriapi";
}

/**
 * 百度地图
 * @param mapInfo
 * @returns {string} url
 */
function getUrl2BaiduMap(mapInfo) {
    if (!mapInfo.status) {
        // return "https://map.baidu.com";
        return options.baiduMapDefaultUrl;
    }

    // // 方式1
    // // doc: https://lbsyun.baidu.com/index.php?title=uri/api/web#service-page-anchor4
    //
    // // 2022年4月1日 偶尔会因title/content失效
    // // 猜测原因：title/content含有敏感词！fuck censorship!!!
    // // 使用空白字符替代
    // let title = "⁣";
    // let content = "⁣"
    //
    // return "https://api.map.baidu.com/marker?location=" + mapInfo.gcj02Lat + "," + mapInfo.gcj02Lng + "&title=" + title + "&content=" + content + "&output=html&coord_type=gcj02" + "&src=webapp.baidu.openAPIdemo";

    // 方式2
    let str = "latlng=" + mapInfo.bd09Lat + "%2C" + mapInfo.bd09Lng + "&title=%20&content=%20&autoOpen=true";
    return "https://map.baidu.com/@" + mapInfo.bd09mcLng + "," + mapInfo.bd09mcLat + ",17z/" + encodeURIComponent(str);
}

/**
 * Google卫星
 * @param mapInfo
 * @returns {string} url
 */
function getUrl2GoogleSatellite(mapInfo) {
    if (!mapInfo.status) {
        // return "https://www.google.com.hk/maps/@39.9055599,116.3913001,59858m/data=!3m1!1e3";
        return options.googleSatelliteDefaultUrl;
    }

    return options.googleSatelliteHost + "/maps/@" + mapInfo.wgs84Lat + "," + mapInfo.wgs84Lng + ",100m/data=!3m1!1e3"
    // return options.googleSatelliteHost + "/maps/place/" + mapInfo.wgs84Lat + ",+" + mapInfo.wgs84Lng + "/@" + mapInfo.wgs84Lat + "," + mapInfo.wgs84Lng + ",400m/data=!3m1!1e3"
}

/**
 * Google地球
 * @param mapInfo
 * @returns {string} url
 */
function getUrl2GoogleEarth(mapInfo) {
    if (!mapInfo.status) {
        // return "https://earth.google.com/web/@39.90556082,116.39130062,71.18453274a,3351122.92518675d,1y,0h,0t,0r";
        return options.googleEarthDefaultUrl;
    }
    return "https://earth.google.com/web/@" + mapInfo.wgs84Lat + "," + mapInfo.wgs84Lng + ",37a,12000d,1y,0h,0t,0r";
}

/**
 * Google地图
 * @param mapInfo
 * @returns {string} url
 */
function getUrl2GoogleMap(mapInfo) {
    if (!mapInfo.status) {
        // return "https://www.google.com.hk/maps/@39.9055599,116.3913001,11z";
        return options.googleMapDefaultUrl;
    }

    return options.googleMapHost + "/maps/@" + mapInfo.gcj02Lat + "," + mapInfo.gcj02Lng + ",20z";
    // return options.googleMapHost + "/maps/place/" + mapInfo.gcj02Lat + ",+" + mapInfo.gcj02Lng + "/@" + mapInfo.gcj02Lat + "," + mapInfo.gcj02Lng + ",400m";
}

/**
 * Google地图
 * @param mapInfo
 * @returns {string} url
 */
function getUrl2OverpassTurbo(mapInfo) {
    if (!mapInfo.status) {
        return "https://overpass-turbo.eu/";
    }
    return "https://overpass-turbo.eu/?lat=" + mapInfo.wgs84Lat + "&lon=" + mapInfo.wgs84Lng + "&zoom=18";
}

/**
 * 腾讯地图街景
 * @param mapInfo
 * @returns {string} url
 */
function getUrl2TencentMap(mapInfo) {
    if (!mapInfo.status) {
        return "https://qq-map.netlify.app/#base=roadmap&cov=qqcached&zoom=16&center=39.908411%2C116.397593";
    }

    return "https://qq-map.netlify.app/#base=roadmap&cov=qqcached&zoom=16&center=" + mapInfo.gcj02Lat + "%2C" + mapInfo.gcj02Lng;
}

/**
 * 新标签页中打开网址
 * @param tab
 * @param url
 */
async function createTab(tab, url) {
    console.log("open url:\t", url);
    return await chrome.tabs.create({
        url: url, index: tab.index + 1
    });
}

/**
 * 高德地图查询poiid详情 <br>
 * doc: https://lbs.amap.com/api/webservice/guide/api/search#id
 * @param poiid
 * @returns {Promise<*>}
 */
async function getAmapPoiidDetail(poiid) {
    let url = "https://restapi.amap.com/v5/place/detail?id=" + poiid + "&key=" + options.amapKey;
    return await requestJsonApi(url);
}

/**
 * 高德地图逆地理编码 - 经纬度转地址 <br>
 * doc: https://lbs.amap.com/api/webservice/guide/api/georegeo#regeo
 * @param lng
 * @param lat
 * @returns {Promise<*>}
 */
// async function amapRegeo(lng, lat) {
//     let url = "https://restapi.amap.com/v3/geocode/regeo?location=" + lng + "," + lat + "&key=" + options.amapKey;
//     return await requestJsonApi(url);
// }


// /**
//  * 百度地图查询poi uid详情 <br>
//  * old doc: https://api.map.baidu.com/lbsapi/webservice-placeapi.htm <br>
//  * new doc: https://lbsyun.baidu.com/index.php?title=webapi/guide/webservice-placeapi#service-page-anchor-1-4
//  * @param uid
//  * @returns {Promise<*>}
//  */
// async function getBaiduMapPoiUidDetail(uid) {
//     let url = "https://api.map.baidu.com/place/v2/detail?uid=" + uid + "&output=json&ret_coordtype=gcj02ll&extensions_adcode=true&scope=1&ak=" + options.baiduMapKey;
//     return await requestJsonApi(url);
// }


/**
 * 坐标系转换 - 百度地图api <br>
 * 现用本地文件替代，偏差很小且全面 <br>
 * old doc: https://api.map.baidu.com/lbsapi/changeposition.htm<br>
 * new doc: https://lbsyun.baidu.com/index.php?title=webapi/guide/changeposition
 * @param lng
 * @param lat
 * @param from
 * 1：GPS标准坐标；
 * 3：火星坐标（gcj02）
 * 5：百度地图采用的经纬度坐标（bd09ll）；
 * 6：百度地图采用的墨卡托平面坐标（bd09mc）;
 * @param to
 * 3：火星坐标（gcj02），即高德地图、腾讯地图及MapABC等地图使用的坐标；
 * 5：百度地图采用的经纬度坐标（bd09ll）；
 * 6：百度地图采用的墨卡托平面坐标（bd09mc）；
 * @returns {Promise<*>}
 */
// async function coordSystemLngLatConvertByApi(lng, lat, from, to) {
//     let url = "https://api.map.baidu.com/geoconv/v1/?coords=" + lng + "," + lat + "&from=" + from + "&to=" + to + "&ak=" + options.baiduMapKey;
//     return await requestJsonApi(url);
// }

/**
 * 同步请求json接口
 * @param url
 * @returns {Promise<any>}
 */
async function requestJsonApi(url) {
    console.log("api url:\t", url);
    let json = await (await fetch(url)).json();
    console.log("api response:\t", json);
    return json;
}
