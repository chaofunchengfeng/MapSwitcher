document.getElementById('command1ToAmap').onclick = function () {
    void handleClick("command1ToAmap");
}
document.getElementById('command2ToBaiduMap').onclick = function () {
    void handleClick("command2ToBaiduMap");
}
document.getElementById('command3ToGoogleSatellite').onclick = function () {
    void handleClick("command3ToGoogleSatellite");
}
document.getElementById('command4ToGoogleEarth').onclick = function () {
    void handleClick("command4ToGoogleEarth");
}
document.getElementById('command5ToGoogleMap').onclick = function () {
    void handleClick("command5ToGoogleMap");
}
document.getElementById('command6ToTencentMap').onclick = function () {
    void handleClick("command6ToTencentMap");
}
document.getElementById('command7ToOverpassTurbo').onclick = function () {
    void handleClick("command7ToOverpassTurbo");
}

/**
 * 消息发送给 服务工作进程 做统一处理
 * @param command 须保持与 manifest.json文件 中的 commands节点 定义一致，以方便统一处理
 * @returns {Promise<void>}
 */
async function handleClick(command) {
    let tab = await getCurrentTab();
    chrome.runtime.connect().postMessage({tab: tab, command: command});

    //
    // window.close();
}

/**
 * 获取当前标签页 <br>
 * 这里不能使用chrome.tabs.getCurrent，原因见doc: https://developer.chrome.com/docs/extensions/reference/tabs/#method-getCurrent
 * @returns {Promise<chrome.tabs.Tab>}
 */
async function getCurrentTab() {
    let queryOptions = {active: true, lastFocusedWindow: true};
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}
