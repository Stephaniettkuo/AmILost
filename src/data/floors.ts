// The GDC floor plans. width/height are the image sizes in pixels,
// so node x/y (traced on these images) line up with the picture.
import { Floor } from '../types';

export const gdcFloors: Floor[] = [
  { id: 'GDC-1', name: 'Floor 1', width: 2428, height: 1514 },
  { id: 'GDC-2', name: 'Floor 2', width: 2422, height: 1520 },
  { id: 'GDC-3', name: 'Floor 3', width: 2414, height: 1530 },
];

// The image file for each floor id.
export const floorImages: Record<string, number> = {
  'GDC-1': require('../../assets/gdc-1.png'),
  'GDC-2': require('../../assets/gdc-2.png'),
  'GDC-3': require('../../assets/gdc-3.png'),
};

// The same plans with a transparent page and sepia ink lines (made by scripts/make_clear_plans.py).
// Same pixel size, so x/y still line up. The editor keeps using the originals above.
export const floorImagesClear: Record<string, number> = {
  'GDC-1': require('../../assets/gdc-1-clear.png'),
  'GDC-2': require('../../assets/gdc-2-clear.png'),
  'GDC-3': require('../../assets/gdc-3-clear.png'),
};
