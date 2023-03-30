import {defaultOptions} from '/js/defaultOptions.js';

const optionsKeyArr = Object.keys(defaultOptions);

/**
 * 初始化
 */
function initOptions() {
    chrome.storage.sync.get(null, (items) => {
        console.log("options:\t", items);
        if (!Object.keys(items).length) {
            if (window.confirm("检测到所有项目均未设置，是否恢复默认？")) {
                void setDefaultOptions();
                return;
            }
        }
        for (let optionsKey of optionsKeyArr) {
            if (items[optionsKey]) {
                document.getElementById(optionsKey).defaultValue = items[optionsKey];
            }
        }
    });
}

/**
 * 保存
 */
function saveOptions() {
    const saveData = {};
    for (let optionsKey of optionsKeyArr) {
        saveData[optionsKey] = document.getElementById(optionsKey).value.trim();
    }
    void chrome.storage.sync.set(saveData);
}

/**
 * 恢复默认
 * @returns {Promise<void>}
 */
async function setDefaultOptions() {
    // await chrome.storage.sync.clear();
    await chrome.storage.sync.set(defaultOptions);
    location.reload();
}

/**
 * 清空
 * @returns {Promise<void>}
 */
async function clearOptions() {
    if (window.confirm("该操作可能致使该扩展无法正常工作，确定要继续吗？")) {
        await chrome.storage.sync.clear();
        location.reload();
    }
}

/**
 * 打开网址
 * @param url
 */
function createTab(url) {
    console.log("open url:\t", url);
    void chrome.tabs.create({
        url: url
    });
}

function jump2AmapKeyPage() {
    let url = "https://console.amap.com/dev/key/app";
    createTab(url);
}

function jump2BaiduMapKeyPage() {
    let url = "https://lbsyun.baidu.com/apiconsole/key#/home";
    createTab(url);
}

//
document.addEventListener("DOMContentLoaded", initOptions);
document.getElementById("setDefault").onclick = setDefaultOptions;
document.getElementById("clear").onclick = clearOptions;
document.getElementById("amapKeyHelp").onclick = jump2AmapKeyPage
document.getElementById("baiduMapKeyHelp").onclick = jump2BaiduMapKeyPage
document.getElementById("form").onsubmit = saveOptions;

