import { Info, Utensils } from 'lucide-react';

function guidanceForGoal(goal) {
  const normalized = String(goal || '').toLowerCase();
  if (normalized.includes('muscle') || normalized.includes('strength')) {
    return 'Add a clear protein source such as dal, curd, eggs, paneer or soy to each main meal. Pair it with rice or roti, vegetables and water.';
  }
  if (normalized.includes('weight') || normalized.includes('fat')) {
    return 'Build a balanced plate: plenty of vegetables, one palm-sized protein choice, a moderate rice or roti portion, and water before sugary drinks.';
  }
  return 'Aim for a simple balanced plate: vegetables, dal or another protein, rice or roti, plus fruit or curd when available. Keep water nearby.';
}

export default function FoodGuidanceCard({ goal }) {
  return (
    <aside className="food-card">
      <div className="food-icon"><Utensils size={22} /></div>
      <div>
        <span className="eyebrow">Hostel-friendly fuel</span>
        <h3>Keep the next meal balanced</h3>
        <p>{guidanceForGoal(goal)}</p>
        <small><Info size={14} /> General guidance only—not medical advice or dietary treatment.</small>
      </div>
    </aside>
  );
}
