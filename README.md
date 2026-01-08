# week4
# GEE NDVI Calculator for Melbourne SA2 (week4)
This is a cloud-based GIS project for GEOM2138/2151 course, which implements NDVI calculation and visualization for Melbourne SA2 regions using Google Earth Engine.

## Project Overview
This web application is developed based on Google Earth Engine (GEE) platform, aiming to calculate the Normalized Difference Vegetation Index (NDVI) of Melbourne SA2 geographical divisions, and realize functions such as spatial visualization and data export.

### Key Features
- NDVI calculation for Sentinel-2 remote sensing images
- Spatial visualization of Melbourne SA2 boundary and NDVI results
- Export of NDVI data as GeoTIFF and CSV formats
- Interactive operation panel for SA4 region selection

## Usage Steps
1. Access the GEE script snapshot via the link below
2. Run the script in GEE Code Editor, select the target SA4 region in Melbourne
3. Click **Run NDVI** button to execute vegetation index calculation
4. View the NDVI distribution map and export the required data format

## Links
https://code.earthengine.google.com/7daf22509feb6d2a5020d202600c2891
https://sodium-hangar-483706-q1.projects.earthengine.app/view/week

### Core NDVI Calculation Code
```javascript
// Calculate NDVI for Sentinel-2
var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};
