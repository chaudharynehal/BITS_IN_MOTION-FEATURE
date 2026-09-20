import { useMemo, useState } from 'react';
import { ArrowRight, Info, Ruler, Scale, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
import StepRail from '../components/StepRail';
import { calculateBmi, getBmiLabel } from '../utils/bmi';

const OPTIONS = {
  level: ['Beginner', 'Intermediate'],
  goal: ['Stay fit', 'Build strength', 'Support weight management'],
  time: ['10', '20', '30'],
  location: ['Hostel room', 'Home', 'Campus', 'PG room'],
  equipment: ['None', 'Resistance band', 'Dumbbells', 'Backpack'],
};

const RULES = {
  age: { min: 16, max: 80, label: 'Age' },
  height: { min: 120, max: 230, label: 'Height' },
  weight: { min: 30, max: 250, label: 'Weight' },
};

function validate(profile) {
  const errors = {};
  Object.entries(RULES).forEach(([field, rule]) => {
    const value = Number(profile[field]);
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      errors[field] = `${rule.label} must be between ${rule.min} and ${rule.max}.`;
    }
  });
  ['level', 'goal', 'time', 'location', 'equipment'].forEach((field) => {
    if (!String(profile[field] || '').trim()) errors[field] = 'Please choose an option.';
  });
  if (profile.leaderboardOptIn && !String(profile.leaderboardName || '').trim()) {
    errors.leaderboardName = 'Choose a public display name.';
  }
  return errors;
}

function SelectField({ label, name, value, onChange, options, error }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange} aria-invalid={Boolean(error)}>
        <option value="">Select</option>
        {options.map((option) => <option value={option} key={option}>{name === 'time' ? `${option} minutes` : option}</option>)}
      </select>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default function ProfileScreen({ initialProfile, signedIn, demoMode, accountName, onSubmit, onBack }) {
  const [profile, setProfile] = useState(initialProfile);
  const [errors, setErrors] = useState({});
  const bmi = useMemo(() => calculateBmi(profile.weight, profile.height), [profile.weight, profile.height]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setProfile((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(profile);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onSubmit(profile);
  }

  return (
    <main className="screen-page">
      <StepRail current="Profile" />
      <ScreenHeader eyebrow="Step 1 of 5" title="Build your workout profile" description="A few details help us keep the plan realistic for your day and space." onBack={onBack} />

      <div className="profile-layout">
        <form className="panel profile-form" onSubmit={handleSubmit} noValidate>
          <div className="profile-sync-state"><ShieldCheck size={17} /><span>{signedIn ? `Changes save automatically to ${accountName}'s account when the plan is created.` : demoMode ? 'Judge Demo is temporary and does not change guest or account data.' : 'Guest data stays only in this browser.'}</span></div>
          <div className="section-title"><UserRound size={20} /><div><h2>Your basics</h2><p>{signedIn ? 'Stored securely in your account.' : demoMode ? 'Used only for this temporary demo.' : 'Used only on this device.'}</p></div></div>
          <div className="form-grid form-grid-three">
            <label className="form-field">
              <span>Age</span><div className="input-with-unit"><input type="number" name="age" min="16" max="80" value={profile.age} onChange={handleChange} aria-invalid={Boolean(errors.age)} /><small>years</small></div>
              {errors.age && <small className="field-error">{errors.age}</small>}
            </label>
            <label className="form-field">
              <span>Height</span><div className="input-with-unit"><Ruler size={17} /><input type="number" name="height" min="120" max="230" value={profile.height} onChange={handleChange} aria-invalid={Boolean(errors.height)} /><small>cm</small></div>
              {errors.height && <small className="field-error">{errors.height}</small>}
            </label>
            <label className="form-field">
              <span>Weight</span><div className="input-with-unit"><Scale size={17} /><input type="number" name="weight" min="30" max="250" value={profile.weight} onChange={handleChange} aria-invalid={Boolean(errors.weight)} /><small>kg</small></div>
              {errors.weight && <small className="field-error">{errors.weight}</small>}
            </label>
          </div>

          <div className="form-divider" />
          <div className="section-title"><div className="section-index">02</div><div><h2>What works today?</h2><p>Choose the closest fit. You can change this anytime.</p></div></div>
          <div className="form-grid">
            <SelectField label="Fitness level" name="level" value={profile.level} onChange={handleChange} options={OPTIONS.level} error={errors.level} />
            <SelectField label="Goal" name="goal" value={profile.goal} onChange={handleChange} options={OPTIONS.goal} error={errors.goal} />
            <SelectField label="Available time" name="time" value={profile.time} onChange={handleChange} options={OPTIONS.time} error={errors.time} />
            <SelectField label="Location" name="location" value={profile.location} onChange={handleChange} options={OPTIONS.location} error={errors.location} />
            <SelectField label="Equipment" name="equipment" value={profile.equipment} onChange={handleChange} options={OPTIONS.equipment} error={errors.equipment} />
          </div>

          <div className="form-divider" />
          <div className="section-title"><Trophy size={20} /><div><h2>Preferences & community</h2><p>These choices can be changed at any time.</p></div></div>
          <div className="preference-stack">
            <label className="toggle-row">
              <input type="checkbox" name="lowImpact" checked={Boolean(profile.lowImpact)} onChange={handleChange} />
              <span><strong>Prefer low-impact movements</strong><small>Recommendation rules will favour gentler alternatives.</small></span>
            </label>
            <label className={`toggle-row ${!signedIn ? 'disabled' : ''}`}>
              <input type="checkbox" name="leaderboardOptIn" checked={Boolean(profile.leaderboardOptIn)} onChange={handleChange} disabled={!signedIn} />
              <span><strong>Join the community leaderboard</strong><small>Optional. Only your alias and workout totals are shown—never email, BMI or weight.</small></span>
            </label>
            {profile.leaderboardOptIn && signedIn && (
              <label className="form-field leaderboard-name-field">
                <span>Public leaderboard name</span>
                <input name="leaderboardName" maxLength="40" value={profile.leaderboardName || ''} onChange={handleChange} aria-invalid={Boolean(errors.leaderboardName)} />
                {errors.leaderboardName && <small className="field-error">{errors.leaderboardName}</small>}
              </label>
            )}
          </div>

          <button className="button button-primary form-submit" type="submit">Create my plan <ArrowRight size={18} /></button>
        </form>

        <aside className="bmi-card">
          <span className="eyebrow light">Informational indicator</span>
          <div className="bmi-value">{bmi ?? '—'}</div>
          <strong>{bmi ? getBmiLabel(bmi) : 'Enter height and weight'}</strong>
          <div className="bmi-scale"><i /><i /><i /><i /></div>
          <p><Info size={15} /> BMI is a general screening indicator, not a diagnosis or a complete measure of health.</p>
        </aside>
      </div>
    </main>
  );
}
