var SA2_ASSET = ee.FeatureCollection('projects/sodium-hangar-483706-q1/assets/SA2_2021_Mel_WGS84');
var FIELD_SA4 = 'SA4_NAME21';
var FIELD_SA2 = 'SA2_NAME21';
var START_DATE = '2024-10-01'; // summertime window
var END_DATE = '2025-03-31';
var CLOUD_MAX = 15;     // % cloud cover threshold
var SCALE = 10;     // Sentinel-2 resolution (m)

var S2_COLLECTION = 'COPERNICUS/S2_HARMONIZED';
var BANDS_NDVI = ['B8', 'B4'];    // NIR, Red
var NDVI_PALETTE = ['brown', 'yellow', 'green'];
var MAX_PIXELS = 1e13;       // allow large exports

var SA2 = ee.FeatureCollection(SA2_ASSET);
Map.centerObject(SA2, 8);
var outlineAll = ee.Image().paint(SA2, 0, 1);
Map.addLayer(outlineAll, { palette: 'yellow' }, 'SA2 outline', false);

var panel = ui.Panel({ style: { width: '340px', padding: '12px' } });
ui.root.insert(0, panel);
// General title and descriptions
panel.add(ui.Label('NDVI of Greater Melbourne', { fontWeight: 'bold', fontSize: '18px' }));
panel.add(ui.Label(
  'Step 1: Choose an SA4.\n' +
  'Step 2: Click Run to compute NDVI over that SA4.\n' +
  'Step 3: Export GeoTIFF (SA4 clip) or CSV (per-SA2 stats).',
  { fontSize: '12px', color: 'gray' }
));

// Drop-down selector for select sa4
var sa4Select = ui.Select({ placeholder: 'Loading SA4…', style: { stretch: 'horizontal' } });
panel.add(ui.Label('SA4:')); panel.add(sa4Select);

// Buttons configuration
var runBtn = ui.Button({ label: 'Run NDVI', style: { stretch: 'horizontal' } });
var expImgBtn = ui.Button({ label: 'Export NDVI GeoTIFF (SA4)', style: { stretch: 'horizontal' } });
var expCsvBtn = ui.Button({ label: 'Export NDVI Stats CSV (SA2s within SA4)', style: { stretch: 'horizontal' } });
panel.add(runBtn); panel.add(expImgBtn); panel.add(expCsvBtn);

// Message setting
var msg = ui.Label('', { color: 'tomato' });
var out = ui.Panel();
panel.add(msg); panel.add(out);
// Function 1: Import image layer based on users' selection of sa4
function getS2(aoi) {
  return ee.ImageCollection(S2_COLLECTION)
    .filterBounds(aoi)
    .filterDate(START_DATE, END_DATE)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_MAX));
}

// Function 2: Clip image layer based on users' selection
function compositeMedian(aoi) {
  return getS2(aoi).median().clip(aoi);
}

// Function 3: NDVI calculation
function calcNDVI(img) {
  return img.normalizedDifference(BANDS_NDVI).rename('NDVI');
}

// Function 4: Zonal statistic
function zonalStatsPerSA2(ndviImg, sa4name) {
  var sa2InSa4 = SA2.filter(ee.Filter.eq(FIELD_SA4, sa4name));
  return ndviImg.reduceRegions({
    collection: sa2InSa4,
    reducer: ee.Reducer.mean(),
    scale: SCALE
  })
}
var lastSa4Name = null;
var lastNdvi = null;
var lastSa4Geom = null;

// Populate SA4
var sa4List = SA2.aggregate_array(FIELD_SA4).distinct().sort();
sa4List.evaluate(function (list) {
  sa4Select.items().reset(list);
  sa4Select.setPlaceholder('Select an SA4 (' + list.length + ' options)');
});

// When SA4 changes zoom and reset map extent
sa4Select.onChange(function (sa4name) {
  lastNdvi = null; lastSa4Name = null; lastSa4Geom = null;

  var fc = SA2.filter(ee.Filter.eq(FIELD_SA4, sa4name));
  lastSa4Geom = fc.geometry();
  Map.centerObject(lastSa4Geom, 10);

  Map.layers().reset();
  Map.addLayer(outlineAll, { palette: 'yellow' }, 'SA2 outline', false);

  lastSa4Name = sa4name;
});
// "RunNDVI" button defined in UI panel
runBtn.onClick(function () {
  msg.setValue(''); out.clear();
  var sa4name = sa4Select.getValue();

  // output warning if no SA4 was selected
  if (!sa4name) { msg.setValue('Please select an SA4.'); return; }

  // compute over SA4 geometry
  var geom = lastSa4Geom;
  var s2_comp = compositeMedian(geom); var ndvi = calcNDVI(s2_comp); lastNdvi = ndvi;

  // Map: NDVI only + boundary
  Map.layers().reset();
  Map.addLayer(ndvi, { min: 0, max: 1, palette: NDVI_PALETTE }, 'NDVI (' + sa4name + ')');
  var outlineSa4 = ee.Image().paint(SA2.filter(ee.Filter.eq(FIELD_SA4, sa4name)), 0, 2);
  Map.addLayer(outlineSa4, { palette: 'yellow' }, 'SA4 boundary');
});

// Export as GeoTIFFS
expImgBtn.onClick(function () {
  msg.setValue('');
  if (!lastNdvi || !lastSa4Geom) {
    msg.setValue('Run NDVI first.'); return;
  }

  var ndviClip = lastNdvi.clip(lastSa4Geom);

  var url = ndviClip.getDownloadURL({
    region: lastSa4Geom,
    scale: 50,
    format: 'GEO_TIFF' // or 'GEOTIFF' also works
  });

  out.clear();
  out.add(ui.Label('Download GeoTIFF', { fontWeight: 'bold' }));
  out.add(ui.Label('click here', null,
    url)); // clickable link
});

// Export as csv
expCsvBtn.onClick(function () {
  msg.setValue('');
  if (!lastNdvi || !lastSa4Name) {
    msg.setValue('Run NDVI first.'); return;


  }
  var table = zonalStatsPerSA2(lastNdvi, lastSa4Name);
  var url = table.getDownloadURL({
    format: 'CSV',
  });
  out.clear();
  out.add(ui.Label('Download CSV', { fontWeight: 'bold' })); out.add(ui.Label('click here', null,
    url)); // clickable link
});
