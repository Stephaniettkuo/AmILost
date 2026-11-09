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
