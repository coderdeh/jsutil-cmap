import {
  Scene,
  GaodeMap,
  RasterLayer,
  Map,
  Popup,
  Marker,
  MarkerLayer,
  PolygonLayer,
  LineLayer,
  PointLayer,
  Source,
  HeatmapLayer,
  CoordsTransform
} from 'cci-map'
import { DrawCircle, DrawControl } from 'cci-lib-l7-draw'
import L from 'leaflet'

class SgupJsUtilMap {
  constructor(from, to, mapCenter) {
    // 定义变量用于转化坐标系 其中FROM为当前坐标系，TO为目标坐标系
    this.FROM = from
    this.TO = to
    this.MAPCENTER = mapCenter
  }
  // 地图实例
  cciMap = null

  // 点位图层
  markerLayer = {}

  // 点位集合
  markerGather = {}

  // popup集合
  popupGather = {}

  // 绘制对象
  drawer = null

  // wms服务图层
  WMSLayer = null

  // polygon 网格边界图层
  polygonObj = {}

  // 聚合图层集合
  clusterPointGather = {}
  clusterTextGather = {}

  // 热力图层
  heatLayer = {}

  // 地图工具图层
  mapUtilLayer = null

  // 点位坐标系转化
  pointCoordTransform (lng, lat) {
    // 百度坐标系（BD09）转 火星坐标系（GCJ02）
    if (this.FROM === 'BD09' && this.TO === 'GCJ02') {
      return CoordsTransform.bd09togcj02(lng, lat)
    }

    // 火星坐标系（GCJ02）转 百度坐标系（BD09）
    if (this.FROM === 'GCJ02' && this.TO === 'BD09') {
      return CoordsTransform.gcj02tobd09(lng, lat)
    }

    // WGS84 转 火星坐标系GCj02
    if (this.FROM === 'WGS84' && this.TO === 'GCJ02') {
      return CoordsTransform.wgs84togcj02(lng, lat)
    }

    // 火星坐标系GCj02 转 WGS84
    if (this.FROM === 'GCJ02' && this.TO === 'WGS84') {
      return CoordsTransform.gcj02towgs84(lng, lat)
    }

    // 百度坐标系（BD09）转 WGS84
    if (this.FROM === 'BD09' && this.TO === 'WGS84') {
      return CoordsTransform.bd09towgs84(lng, lat)
    }

    // WGS84 转 百度坐标系（BD09）
    if (this.FROM === 'WGS84' && this.TO === 'BD09') {
      return CoordsTransform.wgs84tobd09(lng, lat)
    }

  }

  // geojson坐标系转化
  geoCoordTransform (geojson) {
    return CoordsTransform.transform(geojson, this.FROM, this.TO)
  }

  // 初始化网片地图
  initTileMap (id, url = '/sgup/tile?x={x}&y={y}&z={z}&customid=midnight&type=WGS84') {
    this.cciMap = new Scene({
      id,
      map: new Map({
        zoom: 10,
        maxZoom: 19,
        minZoom: 2,
        center: this.pointCoordTransform(this.MAPCENTER[1], this.MAPCENTER[0])
      }),
    })

    const tileLayer = new RasterLayer({
      zIndex: 1,
    }).source(url, {
      parser: {
        type: 'rasterTile',
        tileSize: 256
      },
    })

    this.cciMap.on('loaded', () => {
      // 加载瓦片地图
      this.cciMap.addLayer(tileLayer)

      // 初始化wms
      this.initWMS()

      // 地图点击
      this.onMapClick()
    })
  }

  // 初始化地图
  initGaodeMap (id) {
    this.cciMap = new Scene({
      id,
      map: new GaodeMap({
        zoom: 12,
        pitch: 45,
        rotation: 0,
        maxZoom: 19,
        minZoom: 2,
        style: 'amap://styles/16d60dffc843ee44186f60243c9a3739?isPublic=true',
        token: 'f3e9c993c516afa3eeb7d20f21acfa82',
        center: this.pointCoordTransform(this.MAPCENTER[1], this.MAPCENTER[0])
      })
    })

    this.cciMap.on('loaded', () => {
      // 初始化wms
      this.initWMS()
      // 地图点击
      this.onMapClick()
    })
  }

  // 添加地图的点击事件
  onMapClick () { }

  // 获取地图层级
  getMapZoom () {
    return this.cciMap.getZoom()
  }

  // 获取地图中心点
  getMapCenter () {
    return this.cciMap.getCenter()
  }

  // 获取地图仰角
  getMapPitch () {
    return this.cciMap.getPitch()
  }

  // 设置地图样式
  setMapStyle (url = 'light') {
    this.cciMap.setMapStyle(url)
  }

  // 设置地图中心点
  setMapCenter (arr = [120.21289, 30.291124], option) {
    this.cciMap.setCenter(arr, Object.assign(option, {
      padding: {
        top: 10
      }
    }))
  }

  // 设置地图旋转 rotation取值范围 0 - 360
  setMapRotation (rotation) {
    this.cciMap.setRotation(rotation)
  }

  // 设置地图缩放等级和中心点
  setMapZoomAndCenter (zIndex, arr = [120.21289, 30.291124]) {
    this.cciMap.setZoomAndCenter(zIndex, arr)
  }

  /// 设置地图放大一级
  setZoomIn () {
    this.cciMap.zoomIn()
  }

  // 设置地图缩小一级
  setZoomOut () {
    this.cciMap.zoomOut()
  }

  // 移动地图到某一点
  setPanTo (LngLat = [120.21289, 30.291124]) {
    this.cciMap.panTo(LngLat)
  }

  // 创建Popup
  createPopup (arr, uniqueId) {
    const markerType = uniqueId.split('_').shift()
    const pop = new Popup({
      offsets: [0, 60],
      closeButton: true,
      closeOnClick: true
    }).setLnglat(arr)

    this.popupGather[markerType] = this.popupGather[markerType] || {}
    this.popupGather[markerType][uniqueId] = pop
    return pop
  }

  // 获取popup
  getPopup (uniqueId) {
    const type = uniqueId.split('_').shift()
    const pops = this.getAllPopup(type) || {}
    return pops[uniqueId]
  }

  // 获取某一类型的全部popup
  getAllPopup (type) {
    if (type && this.popupGather[type]) {
      return this.popupGather[type]
    }
    return null
  }

  /**
   * 地图打点 
   * 如果弹框是自定义组件，需将 setHTML(String) 方法换成 setDOMContent(DOM)
   * markerType:主要是为了获取自定义图标样式的
   * detail.uniqueId: 主要是获取自定义popup弹框组件
  **/
  addMarker (detail, markerType = 'default', isCluster = false, isPopup = false, callback = null) {
    let { uniqueId, location } = detail
    // 坐标系之间的点位转化
    location = this.pointCoordTransform(location[0], location[1])

    // uniqueId主要用来控制图层名的，而markerType主要用来控制显示的图标的
    if (!uniqueId) {
      return console.log('无点位类型')
    }

    const mType = uniqueId.split('_').shift()

    if (!this.markerLayer[mType]) {
      this.markerLayer[mType] = new MarkerLayer({
        cluster: isCluster,
      })
    }

    const EL = this.createEL()
    const imageDefault = this.createDefaultIcon(markerType)
    const imageActive = this.createActiveIcon(markerType)
    EL.appendChild(imageDefault)

    // 设置中心点
    this.setPanTo(location)

    const marker = this.createMarker(EL, detail, mType)

    // 将marker添加到地图上
    if (!marker) return
    marker.setLnglat(location)
    this.markerLayer[mType].addMarker(marker)
    this.cciMap.addMarkerLayer(this.markerLayer[mType])

    // 判断是否显示Popup弹框
    const popup = isPopup ? this.createPopup(location, detail.uniqueId) : null

    // marker的点击事件
    marker.on('click', (e) => {
      // 设置中心点
      this.setPanTo(location)
      if (popup) {
        this.openOneMarkerInfo(detail)
      }
      if (callback) {
        return callback(marker.getExtData())
      }
    })

    // popup的打开与关闭
    this.popupEvent(popup, 'open', EL, imageActive)
    this.popupEvent(popup, 'close', EL, imageDefault)
  }

  // 删除点位
  clearMarker (markerType = null) {
    if (markerType && this.markerLayer[markerType]) {
      this.cciMap.removeMarkerLayer(this.markerLayer[markerType])
    } else {
      const mKeys = Object.keys(this.markerLayer)
      mKeys.forEach(key => {
        this.cciMap.removeMarkerLayer(this.markerLayer[key])
        delete this.markerLayer[key]
      })
    }
  }

  // 创建marker图标的DOM元素
  createEL () {
    const EL = document.createElement('label')
    EL.className = 'marker-label'
    return EL
  }

  // 创建普通icon
  createDefaultIcon (markerType) {
    const imageDefault = document.createElement('img')
    imageDefault.src = this.getIcon(`${markerType}_default`)
    imageDefault.className = 'marker-default-image'
    return imageDefault
  }

  // 创建高亮icon
  createActiveIcon (markerType) {
    // 高亮marker
    const imageActive = document.createElement('img')
    imageActive.src = this.getIcon(`${markerType}_default`)
    imageActive.className = 'marker-active-image'
    return imageActive
  }

  // 获取marker的icon
  getIcon (markerType) { }

  // 创建marker点位
  createMarker (EL, detail, markerType) {
    const markerOption = {
      element: EL,
      extData: {
        detail,
      }
    }

    const marker = new Marker(markerOption)
    const markerId = marker.getExtData().detail.uniqueId

    this.markerGather[markerType] = this.markerGather[markerType] || {}
    this.markerGather[markerType][markerId] = marker

    return marker
  }

  // 获取marker
  getMarker (markerId) {
    const markerType = markerId.split('_').shift()

    const markers = this.getAllMarkers(markerType) || {}

    return markers[markerId]
  }


  // 获取全部的marker
  getAllMarkers (type) {
    if (type && this.markerGather[type]) {
      return this.markerGather[type]
    }
    return null
  }

  // 主要为了实现icon的缩放
  popupEvent (popup, event = 'open', EL, image) {
    if (popup) {
      popup.on(event, () => {
        while (EL.hasChildNodes()) {
          EL.removeChild(EL.firstChild)
        }
        EL.appendChild(image)
      })
    }
  }

  // 获取网格中心点
  getPolygonCenter (geojson) {
    const polygon = L.geoJSON(geojson, {})
    return polygon.getBounds().getCenter()
  }

  // 打开popup弹框
  openOneMarkerInfo () { }

  // 删除marker弹框  popup
  clearInfoWindow (type = null) {
    if (type && this.popupGather[type]) {
      const pKeys = Object.keys(this.popupGather[type])
      pKeys.forEach(key => {
        this.popupGather[type][key].close()
      })
    } else {
      Object.keys(this.popupGather).forEach(item => {
        let sKey = Object.keys(this.popupGather[item])
        sKey.forEach(key => {
          this.popupGather[item][key].close()
        })
      })
    }
  }

  // 绘制网格边界 只有需要显示popup弹框时，才需要传如详情数据detail
  addOneGrid (data, polygonColor = '#0DCCFF', isShowTxt = false, isShowPop = false, detail = {}, polygonClick = null) {
    const { uniqueId } = detail
    if (!uniqueId) return

    this.polygonObj[uniqueId] = {
      polygonLayer: null,
      wallLayer: null,
      lineDownLayer: null,
      lineUpLayer: null,
      textLayer: null
    }

    // 由于后端返回的geojson数据不符合要求，需要整合
    const gData = this.geoCoordTransform({
      type: 'FeatureCollection',
      features: [data]
    })

    // 绘制地图板块
    this.polygonObj[uniqueId].polygonLayer = new PolygonLayer({
      autoFit: true
    }).source(gData).size(200).color(polygonColor).shape('extrude').style({
      opacity: 0.8,
      heightfixed: true,
      pickLight: true,
      raisingHeight: 20,
    }).active(true)

    // 绘制地图围栏
    this.polygonObj[uniqueId].wallLayer = new LineLayer().source(gData).shape('wall').size(200).style({
      heightfixed: true,
      opacity: 0.6,
      sourceColor: polygonColor,
      targetColor: 'rbga(255,255,255, 0)'
    })

    // 绘制边界线 （上下两部分）
    this.polygonObj[uniqueId].lineDownLayer = new LineLayer().source(gData).shape('line').color(polygonColor).size(1).style({
      raisingHeight: 0
    })

    this.polygonObj[uniqueId].lineUpLayer = new LineLayer({ zIndex: 1 }).source(gData).shape('line').color(polygonColor).size(1).style({
      raisingHeight: 201
    })

    // 网格中心点
    const pCenter = this.getPolygonCenter(data)

    // 是否显示标注  注意数据源中一定要有name以及经纬度属性
    if (isShowTxt) {
      const txtContent = [{
        name: gData.features[0].properties.groupName,
        ...gData.features[0].properties.groupName,
        ...pCenter
      }]
      this.polygonObj[uniqueId].textLayer = new PointLayer({
        zIndex: 500
      }).source(txtContent, {
        parser: {
          type: 'json',
          x: 'lng',
          y: 'lat'
        }
      }).shape('name', 'text').size(20).color('#fff').style({
        fontWeight: 20,
        // 文本相对锚点的位置 center|left|right|top|bottom|top-left
        textAnchor: 'center',
        // 文本相对锚点的偏移量 [水平, 垂直]
        textOffset: [0, 0],
        // 字符间距
        spacing: 2,
        // 文本包围盒 padding [水平，垂直]，影响碰撞检测结果，避免相邻文本靠的太近
        padding: [1, 1],
        // 描边颜色
        strokeColor: '#fff',
        // 描边宽度 & 透明度
        strokeWidth: 1,
        strokeOpacity: 1.0
      })
    }

    // 是否绘制网格结束后立即显示popup弹框
    if (isShowPop) {
      detail.longitude = pCenter.lng
      detail.latitude = pCenter.lat
      detail.location = [Number(pCenter.lng), Number(pCenter.lat)]

      this.createPopup(detail.location, detail.uniqueId)
      this.openOneMarkerInfo(detail)
    }

    Object.keys(this.polygonObj[uniqueId]).forEach(key => {
      this.polygonObj[uniqueId][key] && this.cciMap.addLayer(this.polygonObj[uniqueId][key])
    })

    // 网格的点击事件
    if (polygonClick) {
      this.polygonObj[uniqueId].polygonLayer.on('click', e => {
        polygonClick(e)
      })
    }

    return this.polygonObj[uniqueId].polygonLayer
  }

  // 删除网格边界
  deletePolygon () {
    Object.keys(this.polygonObj).length && Object.keys(this.polygonObj).forEach(key => {
      this.polygonObj[key] && Object.keys(this.polygonObj[key]).forEach(grid => {
        this.polygonObj[key][grid] && this.cciMap.removeLayer(this.polygonObj[key][grid])
      })
    })
  }

  // 添加聚合 PointLayer
  addCluster (data, type) {
    const SourceData = new Source(data, {
      parser: {
        type: 'json',
        x: 'deviceLon',
        y: 'deviceLat'
      },
      cluster: true
    })

    // 聚合点
    this.clusterPointGather[type] = new PointLayer({}).source(SourceData).shape('circle').scale('point_count', {
      type: 'quantile'
    }).size('point_count', [20]).color('rgb(73,167,86)').style({
      strokeWidth: 1,
      stroke: '#fff'
    })

    // 聚合标注
    this.clusterTextGather[type] = new PointLayer({
      autoFit: false
    }).source(SourceData).shape('point_count', 'text').size(12).color('#fff').style({
      strokeWidth: 0,
      stroke: '#fff'
    })

    this.cciMap.addLayer(this.clusterPointGather[type])
    this.cciMap.addLayer(this.clusterTextGather[type])
  }

  // 清除聚合
  clearCluster (type = null) {
    if (type && this.clusterPointGather[type]) {
      this.cciMap.removeLayer(this.clusterPointGather[type])
      delete this.clusterPointGather[type]
      this.cciMap.removeLayer(this.clusterTextGather[type])
      delete this.clusterTextGather[type]
    } else {
      const cKeys = Object.keys(this.clusterPointGather)
      cKeys.forEach(key => {
        this.cciMap.removeLayer(this.clusterPointGather[key])
        delete this.clusterPointGather[key]
        this.cciMap.removeLayer(this.clusterTextGather[key])
        delete this.clusterTextGather[key]
      })
    }
  }

  // 添加热力图
  addHeatMap (heatType, data) {
    this.heatLayer[heatType] = null
    const hData = this.heatDataIntegrate(data)
    this.heatLayer[heatType] = new HeatmapLayer({
      zIndex: 2
    }).source(hData).size('capacity', [0, 1]).shape('heatmap3D').style({
      intensity: 5,
      radius: 10,
      rampColors: {
        colors: [
          '#2E8AE6',
          '#69D1AB',
          '#DAF291',
          '#FFD591',
          '#FF7A45',
          '#CF1D49'
        ],
        positions: [0, 0.2, 0.4, 0.6, 0.8, 1.0]
      }
    })
    this.cciMap.addLayer(this.heatLayer[heatType])
  }

  // 清除热力图
  clearHeatMap (type = null) {
    if (type && this.heatLayer[type]) {
      return this.cciMap.removeLayer(this.heatLayer[type])
    } else {
      Object.keys(this.heatLayer).length && Object.keys(this.heatLayer).forEach(item => {
        this.cciMap.removeLayer(this.heatLayer[item])
      })
    }
  }

  // 热力图数据整合
  heatDataIntegrate (data = []) {
    if (!Array.isArray(data)) return
    const fea = data.map(item => {
      return {
        type: 'Feature',
        properties: {
          annualCarbon: 29.15,
          capacity: 6720,
          coalType: "Bituminous",
          country: "China",
          plant: "Datang Tuoketuo power station",
          status: "Operating",
          type: "Subcritical",
          retire1: 2100,
          retire2: 2100,
          retire3: 2100,
          start1: 2003,
          start2: 2017,
          year1: 2017,
          year2: 2019,
          startLabel: "2003 - 2017",
          regionLabel: "China"
        },
        geometry: {
          "type": "Point",
          "coordinates": [
            Number(item.longitude),
            Number(item.latitude)
          ]
        }
      }
    })
    return {
      type: 'FeatureCollection',
      features: fea,
    }
  }

  // 绘制圆形
  addCircle () {
    return new DrawCircle(this.cciMap, {
      multiple: false,
      adsorbOptions: {},
      editable: false,
    })
  }

  // 清除圆形
  clearCircle () {
    this.drawer?.clear()
    this.drawer?.deleteCurrentFeature()
  }

  // 初始化WMS
  initWMS () { }

  // 添加地图工具
  addMapUtil () {
    this.clearMapUtil()
    this.mapUtilLayer = new DrawControl(this.cciMap, {})
    this.cciMap.addControl(this.mapUtilLayer)
  }

  clearMapUtil () {
    this.mapUtilLayer && this.cciMap.removeControl(this.mapUtilLayer)
  }

}

export default SgupJsUtilMap