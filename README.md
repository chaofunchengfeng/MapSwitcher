# MapSwitcher 地图切换

在不同地图网站之间切换的Chrome扩展（mv3），目前支持:

- 高德地图
- 百度地图
- Google地图
- Google地球
- 腾讯地图街景
- Overpass turbo
- Flightradar24
- 三方引入高德、百度

它会尽可能保持地图的中心点一致。

A Chrome extension(mv3) to switch between different map sites, currently supports:

- GaoDe Map(AMap)
- Baidu Map
- Google Map
- Google Earth
- Tencent Map
- Overpass turbo
- Flightradar24
- Third party import from AMap or Baidu Map

It will keep the center point of the map as consistent as possible.

## 说明

如果 在地图上选择了POI点，切换后将会以选点为中心。

`  可以在扩展选项中设置 高德地图 API key，以使高德地图POI点切换后更准确。  `

~~当然，目前它仅适用于中国大陆。因为开发它的初心就是为了解决不同地理坐标系之间的偏差。~~

## 下载

### Chrome Web Store

[https://chromewebstore.google.com/detail/jfadcaeifemlgfkpglpdfoaafblppaij](https://chromewebstore.google.com/detail/jfadcaeifemlgfkpglpdfoaafblppaij)

### Microsoft Edge Add-ons

[https://microsoftedge.microsoft.com/addons/detail/dopggeomeenciodjfgfmkekphcejahec](https://microsoftedge.microsoft.com/addons/detail/dopggeomeenciodjfgfmkekphcejahec)

## 更新日志

### v2.0

*20250402*

1. 支持 腾讯地图街景

### v1.9

*20250303*

1. 支持 fr24 www.flightradar24.com

### v1.8

*20250112*

1. https://overpass-turbo.eu/ 添加 Google Map 卫星图瓦片
2. 支持境外切换

### v1.7

*20250110*

1. 优化 高德地图、百度地图 POI信息的获取方式
    - 高德地图 仅在 无法在地图中查找到POI信息后 调用高德API
    - 百度地图 直接从地图中获取POI信息，不再需要API key

### v1.6

*20250102*

1. i18n
2. 支持三方地图 一起看地图 www.17ditu.com

### v1.5

*20241222*

1. 支持三方引入的高德地图、百度地图

### v1.4

*20240422*

1. 支持Overpass turbo

### v1.3

*20231103*

1. Google卫星、Google地图点标记

### v1.2

*20231016*

1. Google卫星打开后自动隐藏标签

### v1.1

*20230510*

1. 修复百度街景地图获取经纬度的问题

### v1.0

*20230401*

1. 基础功能
