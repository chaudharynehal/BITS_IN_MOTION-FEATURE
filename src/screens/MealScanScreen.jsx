import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CircleAlert, Plus, RotateCcw, ScanLine, Trash2, Utensils } from 'lucide-react';
import teamData from '../data/foodFeatureData.json';
import { api } from '../services/api';

const { foods, labels, sources, thresholds, disclaimer } = teamData.foodDetection;
const round = (value) => Math.round(value * 10) / 10;

function labelForDetection(value) {
  const normalized = String(value).trim().toLowerCase().replace(/[_\s]+/g, '-');
  return labels.find((entry) => [entry.key, entry.displayName, entry.defaultFoodId, ...entry.alternatives]
    .some((candidate) => String(candidate).toLowerCase().replace(/[_\s]+/g, '-') === normalized));
}

function foodOptionsForLabel(value) {
  const label = labelForDetection(value);
  const ids = label ? [label.defaultFoodId, ...label.alternatives] : [String(value)];
  return [...new Set(ids)].map((id) => foods.find((food) => food.id === id)).filter(Boolean);
}

function nutrition(food, grams) {
  const factor = Number(grams) / 100;
  const calories = food.caloriesPer100g * factor;
  const uncertainty = food.uncertainty || 0;
  return {
    calories: round(calories),
    protein: round(food.proteinPer100g * factor),
    low: round(calories * (1 - uncertainty)),
    high: round(calories * (1 + uncertainty)),
  };
}

export default function MealScanScreen({ onBack }) {
  const [file, setFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [items, setItems] = useState([]);
  const [selectedFood, setSelectedFood] = useState(foods[0]?.id || '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPhotoUrl(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const totals = useMemo(() => items.reduce((sum, item) => {
    const value = nutrition(item.food, item.grams);
    sum.calories += value.calories;
    sum.protein += value.protein;
    sum.low += value.low;
    sum.high += value.high;
    return sum;
  }, { calories: 0, protein: 0, low: 0, high: 0 }), [items]);

  function addFood(food, confidence = null) {
    if (!food) return;
    setItems((current) => [...current, { id: `${food.id}-${Date.now()}-${Math.random()}`, food, grams: food.defaultServingGrams, confidence }]);
  }

  function reset() {
    setFile(null);
    setItems([]);
    setError('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function scan() {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError('Choose an image smaller than 3 MB.'); return; }
    setStatus('loading');
    setError('');
    setItems([]);
    try {
      const response = await api.detectFoodPhoto(file);
      const matched = response.predictions.map((prediction) => ({ foods: foodOptionsForLabel(prediction.label), confidence: prediction.confidence }))
        .filter(({ foods: choices }) => choices.length > 0);
      setItems(matched.map(({ foods: choices, confidence }) => { const food = choices[0]; return { id: `${food.id}-${Date.now()}-${Math.random()}`, food, choices, grams: food.defaultServingGrams, confidence }; }));
      setStatus('ready');
      if (!matched.length) setError('No supported foods were recognized. Add foods below to estimate this meal.');
    } catch (requestError) {
      setError(requestError.message || 'Photo recognition is unavailable. Add foods manually below.');
      setStatus('error');
    }
  }

  return (
    <main className="meal-scan-page">
      <button className="text-button meal-back" type="button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <header className="meal-heading">
        <span className="eyebrow"><Utensils size={14} /> Temporary meal estimate</span>
        <h1>What’s on your plate?</h1>
        <p>Take a meal photo to identify supported foods and estimate nutrition. Your scan stays in this screen and is cleared when you leave.</p>
      </header>

      <section className="meal-layout">
        <div className="meal-panel">
          <h2><Camera size={19} /> Meal photo</h2>
          <label className="meal-upload" htmlFor="meal-photo-input">
            {photoUrl ? <img src={photoUrl} alt="Selected meal preview" /> : <span className="meal-upload-prompt"><Camera size={30} /><strong>Take a photo or choose an image</strong><small>JPEG, PNG, or WebP · up to 3 MB</small></span>}
          </label>
          <input ref={inputRef} id="meal-photo-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { setFile(event.target.files?.[0] || null); setItems([]); setError(''); setStatus('idle'); }} />
          <div className="meal-photo-actions">
            <button type="button" className="button button-secondary" onClick={() => inputRef.current?.click()}><Camera size={17} /> {file ? 'Choose another photo' : 'Choose photo'}</button>
            <button type="button" className="button button-primary" onClick={scan} disabled={!file || status === 'loading'}><ScanLine size={17} /> {status === 'loading' ? 'Analyzing…' : 'Detect foods'}</button>
            {(file || items.length > 0) && <button type="button" className="button button-secondary meal-reset" onClick={reset} aria-label="Clear scan"><RotateCcw size={17} /> Clear</button>}
          </div>
          {error && <p className="meal-error" role="status"><CircleAlert size={17} /> {error}</p>}
          <p className="meal-privacy">Photo is sent only to the configured recognition service for this request. The app does not save it or save meal results.</p>
        </div>

        <div className="meal-panel meal-results">
          <div className="meal-results-heading"><div><span className="eyebrow">Review before estimating</span><h2>Foods in this meal</h2></div><span className="meal-temporary">Not saved</span></div>
          {items.length ? <ul className="meal-items">{items.map((item) => {
            const values = nutrition(item.food, item.grams);
            const source = sources.find((entry) => entry.id === item.food.sourceId) || sources[0];
            return <li key={item.id}>
              <div className="meal-item-title"><strong>{item.food.name}</strong><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Remove ${item.food.name}`}><Trash2 size={16} /></button></div>
              {item.choices?.length > 1 && <label className="meal-serving">Confirm food <select aria-label={`Confirm food for result ${item.food.name}`} value={item.food.id} onChange={(event) => setItems((current) => current.map((entry) => { if (entry.id !== item.id) return entry; const food = entry.choices.find((option) => option.id === event.target.value); return { ...entry, food, grams: food.defaultServingGrams }; }))}>{item.choices.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select></label>}
              <label className="meal-serving">Serving size <span><input type="number" min={thresholds.minimumServingGrams} max={thresholds.maximumServingGrams} step="5" value={item.grams} onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, grams: Math.min(thresholds.maximumServingGrams, Math.max(thresholds.minimumServingGrams, Number(event.target.value) || thresholds.minimumServingGrams)) } : entry))} /> g</span></label>
              <p className="meal-nutrition">{values.calories} kcal <span>({values.low}–{values.high})</span> · {values.protein} g protein</p>
              {item.confidence !== null && <small className="meal-confidence">Photo match · {Math.round(item.confidence * 100)}% confidence</small>}
              <small className="meal-source">Source: <a href={source.url || '#meal-disclaimer'} target={source.url ? '_blank' : undefined} rel={source.url ? 'noreferrer' : undefined}>{source.name}</a></small>
            </li>;
          })}</ul> : <div className="meal-empty"><Utensils size={25} /><p>After detection, check the foods and adjust serving sizes. Or add foods manually.</p></div>}
          <div className="meal-add-row"><label htmlFor="meal-food-select">Add a food manually</label><div><select id="meal-food-select" value={selectedFood} onChange={(event) => setSelectedFood(event.target.value)}>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select><button type="button" className="button button-secondary" onClick={() => addFood(foods.find((food) => food.id === selectedFood))}><Plus size={17} /> Add</button></div></div>
          {items.length > 0 && <section className="meal-total" aria-live="polite"><div><span>Estimated meal total</span><strong>{round(totals.calories)} kcal</strong></div><p>Approx. {round(totals.low)}–{round(totals.high)} kcal · {round(totals.protein)} g protein</p></section>}
        </div>
      </section>
      <aside id="meal-disclaimer" className="meal-disclaimer"><strong>Nutrition estimates are approximate.</strong> {disclaimer} Photo recognition needs a configured model service; if it is unavailable, add foods manually. Nutrition values cite the provided NutriLens table, which reports values averaged from IFCT 2017 and USDA FoodData Central. Verify the source values before relying on them.</aside>
    </main>
  );
}
