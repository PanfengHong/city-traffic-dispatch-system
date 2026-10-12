import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTrafficStore } from '../../store/trafficStore';
import { useUIStore } from '../../store/uiStore';
import type { RoadData, VehicleData, IncidentData } from '../../types';

// 真实城市中心点（上海中心）
const CITY_CENTER: [number, number] = [121.505760, 31.23041];
// 模拟器局部坐标 → 经纬度的缩放比例（仅用于回退）
const SCALE = 0.000065;

// 只取主干道路，避免细碎路段过多
const MAIN_ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];

function toLngLat(x: number, y: number): [number, number] {
  return [CITY_CENTER[0] + x * SCALE, CITY_CENTER[1] + y * SCALE];
}

function congestionColor(c: number): string {
  if (c < 0.3) return '#4ade80';
  if (c < 0.6) return '#facc15';
  return '#f87171';
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

/** 沿 LineString 按比例 t∈[0,1] 取点 */
function pointAlongLine(coords: number[][], t: number): [number, number] {
  if (coords.length < 2) return coords[0] as [number, number];
  const segIndex = Math.min(Math.floor(t * (coords.length - 1)), coords.length - 2);
  const localT = t * (coords.length - 1) - segIndex;
  const a = coords[segIndex];
  const b = coords[segIndex + 1];
  return [a[0] + (b[0] - a[0]) * localT, a[1] + (b[1] - a[1]) * localT];
}

export default function CityMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // 缓存从矢量瓦片提取的真实道路几何
  const realRoadsRef = useRef<GeoJSON.Feature[]>([]);
  const snapshot = useTrafficStore((s) => s.snapshot);
  const selectedIncidentId = useUIStore((s) => s.selectedIncidentId);
  const focusRoadId = useUIStore((s) => s.focusRoadId);
  // 记录已飞行定位到的事件 / 路段，避免每次快照刷新重复飞行
  const flownIncidentRef = useRef<string | null>(null);
  const flownRoadRef = useRef<string | null>(null);

  /** 取真实道路几何上的一个点（按索引映射，与图层渲染保持一致） */
  const coordForRoadIndex = (index: number, fallback: [number, number]): [number, number] => {
    const realRoads = realRoadsRef.current;
    if (realRoads.length === 0) return fallback;
    const road = realRoads[index % realRoads.length];
    const lineCoords =
      road.geometry.type === 'MultiLineString'
        ? (road.geometry as GeoJSON.MultiLineString).coordinates[0]
        : (road.geometry as GeoJSON.LineString).coordinates;
    return pointAlongLine(lineCoords, 0.5);
  };

  // 从 openmaptiles 矢量源提取真实主干道路几何
  const refreshRealRoads = (map: MapLibreMap) => {
    try {
      const features = map.querySourceFeatures('openmaptiles', {
        sourceLayer: 'transportation',
      });
      const roads = features.filter((f) => {
        const geom = f.geometry;
        if (geom.type !== 'LineString' && geom.type !== 'MultiLineString') return false;
        const cls = f.properties?.class;
        return MAIN_ROAD_CLASSES.includes(cls);
      });
      realRoadsRef.current = roads;
    } catch (e) {
      console.warn('[CityMap] 提取真实道路失败', e);
    }
  };

  // 初始化地图
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: CITY_CENTER,
      zoom: 14.5,
      pitch: 52,
      bearing: -18,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right'
    );
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      map.resize();

      // 3D 建筑层
      try {
        map.addSource('osm-buildings', {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet',
        });
        map.addLayer({
          id: '3d-buildings',
          type: 'fill-extrusion',
          source: 'osm-buildings',
          'source-layer': 'building',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'render_height'], 0],
              // 0, '#5a6a7e',
              // 40, '#8a9aae',
              // 120, '#b8c8d8',
              0, '#d8d8d8',
              40, '#e0e0e0',
              120, '#ffffff',
            ],
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.9,
          },
        });
      } catch (e) {
        console.warn('[CityMap] 3D 建筑层加载失败', e);
      }

      // === 交通图层 ===
      map.addSource('traffic-roads', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'traffic-roads-glow',
        type: 'line',
        source: 'traffic-roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 5, 16, 12],
          'line-opacity': 0.3,
          'line-blur': 4,
        },
      });
      map.addLayer({
        id: 'traffic-roads-line',
        type: 'line',
        source: 'traffic-roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 16, 6],
          'line-opacity': 0.95,
        },
      });

      // 选中路段高亮（单独图层，避免与缩放表达式混用）
      map.addLayer({
        id: 'traffic-roads-highlight',
        type: 'line',
        source: 'traffic-roads',
        filter: ['==', ['get', 'selected'], true],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2377bb',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 7, 16, 16],
          'line-opacity': 0.85,
        },
      });

      // 车辆点位
      map.addSource('traffic-vehicles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'traffic-vehicles',
        type: 'circle',
        source: 'traffic-vehicles',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 16, 6],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.95,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 0.8,
          'circle-stroke-opacity': 0.6,
        },
      });

      // 事件点位
      map.addSource('traffic-incidents', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'traffic-incidents',
        type: 'circle',
        source: 'traffic-incidents',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 10],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-pitch-alignment': 'map',
        },
      });

      // 选中事件高亮圈（单独图层）
      map.addLayer({
        id: 'traffic-incidents-highlight',
        type: 'circle',
        source: 'traffic-incidents',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 17],
          'circle-color': 'rgba(35,119,187,0.15)',
          'circle-stroke-color': '#2377bb',
          'circle-stroke-width': 3,
          'circle-pitch-alignment': 'map',
        },
      });

      // 事件点击 → 选中并联动研判面板
      map.on('click', 'traffic-incidents', (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (!id) return;
        const ui = useUIStore.getState();
        ui.setSelectedIncidentId(id);
        ui.setActiveTab('incident');
      });
      map.on('mouseenter', 'traffic-incidents', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'traffic-incidents', () => {
        map.getCanvas().style.cursor = '';
      });

      refreshRealRoads(map);
      mapRef.current = map;
    });

    // 瓦片加载完成后刷新真实道路缓存
    map.on('sourcedata', (e) => {
      if (e.isSourceLoaded && e.sourceId === 'openmaptiles') {
        refreshRealRoads(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 实时更新交通数据 → 映射到真实道路几何
  useEffect(() => {
    if (!mapRef.current || !snapshot) return;
    const map = mapRef.current;
    const realRoads = realRoadsRef.current;
    const simRoads = snapshot.roads;

    // 1. 拥堵道路：用真实道路几何 + 模拟器拥堵值
    const roadsSource = map.getSource('traffic-roads') as GeoJSONSource | undefined;
    if (roadsSource) {
      let features: GeoJSON.Feature[];
      if (realRoads.length > 0) {
        features = realRoads.map((rr, i) => {
          const simRoad = simRoads[i % simRoads.length];
          return {
            type: 'Feature',
            properties: {
              id: simRoad.id,
              congestion: simRoad.congestion,
              color: congestionColor(simRoad.congestion),
              selected: simRoad.id === focusRoadId,
            },
            geometry: rr.geometry,
          };
        });
      } else {
        // 真实道路尚未加载，回退到模拟器网格
        features = simRoads.map((r: RoadData) => ({
          type: 'Feature',
          properties: {
            id: r.id,
            congestion: r.congestion,
            color: congestionColor(r.congestion),
            selected: r.id === focusRoadId,
          },
          geometry: {
            type: 'LineString',
            coordinates: [toLngLat(r.from.x, r.from.y), toLngLat(r.to.x, r.to.y)],
          },
        }));
      }
      roadsSource.setData({ type: 'FeatureCollection', features });
    }

    // 2. 车辆：吸附到真实道路沿线
    const vehiclesSource = map.getSource('traffic-vehicles') as GeoJSONSource | undefined;
    if (vehiclesSource) {
      const features = snapshot.vehicles.map((v: VehicleData, i: number) => {
        let coords: [number, number];
        if (realRoads.length > 0) {
          const road = realRoads[i % realRoads.length];
          const lineCoords =
            road.geometry.type === 'MultiLineString'
              ? (road.geometry as GeoJSON.MultiLineString).coordinates[0]
              : (road.geometry as GeoJSON.LineString).coordinates;
          const t = (i * 0.137) % 1; // 伪随机沿路分布
          coords = pointAlongLine(lineCoords, t);
        } else {
          coords = toLngLat(v.x, v.y);
        }
        return {
          type: 'Feature',
          properties: { color: v.color, speed: v.speed, type: v.type },
          geometry: { type: 'Point', coordinates: coords },
        } as GeoJSON.Feature;
      });
      vehiclesSource.setData({ type: 'FeatureCollection', features });
    }

    // 3. 事件：吸附到真实道路
    const incidentsSource = map.getSource('traffic-incidents') as GeoJSONSource | undefined;
    if (incidentsSource) {
      const sevColor: Record<string, string> = {
        high: '#f87171',
        medium: '#fbbf24',
        low: '#60a5fa',
      };
      const features = snapshot.incidents.map((inc: IncidentData, i: number) => {
        let coords: [number, number];
        if (realRoads.length > 0) {
          const road = realRoads[i % realRoads.length];
          const lineCoords =
            road.geometry.type === 'MultiLineString'
              ? (road.geometry as GeoJSON.MultiLineString).coordinates[0]
              : (road.geometry as GeoJSON.LineString).coordinates;
          coords = pointAlongLine(lineCoords, 0.5);
        } else {
          coords = toLngLat(inc.position.x, inc.position.y);
        }
        return {
            type: 'Feature',
            properties: {
              id: inc.id,
              type: inc.type,
              severity: inc.severity,
              color: sevColor[inc.severity] || '#f87171',
              selected: inc.id === selectedIncidentId,
            },
            geometry: { type: 'Point', coordinates: coords },
          } as GeoJSON.Feature;
      });
      incidentsSource.setData({ type: 'FeatureCollection', features });
    }
  }, [snapshot, selectedIncidentId, focusRoadId]);

  // 选中事件 → 飞行定位（仅在选中项变化时触发一次）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !snapshot || !selectedIncidentId) return;
    if (flownIncidentRef.current === selectedIncidentId) return;
    const index = snapshot.incidents.findIndex((i) => i.id === selectedIncidentId);
    if (index < 0) return;
    flownIncidentRef.current = selectedIncidentId;
    const inc = snapshot.incidents[index];
    const coord = coordForRoadIndex(index, toLngLat(inc.position.x, inc.position.y));
    map.flyTo({ center: coord, zoom: 15.6, duration: 1200, essential: true });
  }, [selectedIncidentId, snapshot]);

  // 聚焦路段 → 飞行定位
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !snapshot || !focusRoadId) return;
    if (flownRoadRef.current === focusRoadId) return;
    const index = snapshot.roads.findIndex((r) => r.id === focusRoadId);
    if (index < 0) return;
    flownRoadRef.current = focusRoadId;
    const road = snapshot.roads[index];
    const coord = coordForRoadIndex(index, toLngLat(road.from.x, road.from.y));
    map.flyTo({ center: coord, zoom: 15.2, duration: 1200, essential: true });
  }, [focusRoadId, snapshot]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
