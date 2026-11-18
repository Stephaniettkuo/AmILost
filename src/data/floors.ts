// The GDC floor plans. width/height are the image sizes in pixels,
// so node x/y (traced on these images) line up with the picture.
import { Floor } from '../types';

export const gdcFloors: Floor[] = [
  { id: 'GDC-1', name: 'Floor 1', width: 2428, height: 1514 },
  { id: 'GDC-2', name: 'Floor 2', width: 2422, height: 1520 },
  { id: 'GDC-3', name: 'Floor 3', width: 2414, height: 1530 },
  // Floors 4-7 come from a newer, larger export of the plans (drawn smaller on the page).
  { id: 'GDC-4', name: 'Floor 4', width: 2788, height: 1776 },
  { id: 'GDC-5', name: 'Floor 5', width: 2800, height: 1754 },
  { id: 'GDC-6', name: 'Floor 6', width: 2794, height: 1754 },
  { id: 'GDC-7', name: 'Floor 7', width: 2788, height: 1758 },
];

// The image file for each floor id.
export const floorImages: Record<string, number> = {
  'GDC-1': require('../../assets/gdc-1.png'),
  'GDC-2': require('../../assets/gdc-2.png'),
  'GDC-3': require('../../assets/gdc-3.png'),
  'GDC-4': require('../../assets/gdc-4.png'),
  'GDC-5': require('../../assets/gdc-5.png'),
  'GDC-6': require('../../assets/gdc-6.png'),
  'GDC-7': require('../../assets/gdc-7.png'),
};

// The same plans with a transparent page and sepia ink lines (made by scripts/make_clear_plans.py).
// Same pixel size, so x/y still line up. The editor keeps using the originals above.
export const floorImagesClear: Record<string, number> = {
  'GDC-1': require('../../assets/gdc-1-clear.png'),
  'GDC-2': require('../../assets/gdc-2-clear.png'),
  'GDC-3': require('../../assets/gdc-3-clear.png'),
  'GDC-4': require('../../assets/gdc-4-clear.png'),
  'GDC-5': require('../../assets/gdc-5-clear.png'),
  'GDC-6': require('../../assets/gdc-6-clear.png'),
  'GDC-7': require('../../assets/gdc-7-clear.png'),
};
