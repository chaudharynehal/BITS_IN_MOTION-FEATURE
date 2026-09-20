export function calculateBmi(weightKg, heightCm) {
  const weight = Number(weightKg);
  const height = Number(heightCm) / 100;

  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
    return null;
  }

  return Math.round((weight / (height * height)) * 10) / 10;
}

export function getBmiLabel(bmi) {
  if (!Number.isFinite(bmi)) return '';
  if (bmi < 18.5) return 'Below the general reference range';
  if (bmi < 25) return 'Within the general reference range';
  if (bmi < 30) return 'Above the general reference range';
  return 'Well above the general reference range';
}
