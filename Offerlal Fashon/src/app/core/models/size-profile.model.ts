export interface SizeProfile {
  bust: number;
  waist: number;
  hip: number;
  shoulder: number;
  blouseLength: number;
  sleeveLength: number;
  height: number;
  lehengaLength: number;
  unit: 'in' | 'cm';
  preferredSize: string;
  notes?: string;
  updatedAt: string;
}
