import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Info, Ruler, Save, Scale, ShieldCheck, Target, Trophy, UserRound } from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
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

const STEPS = [
  { title: 'About you', icon: UserRound },
  { title: 'Your goal', icon: Target },
  { title: 'Your setup', icon: Trophy },
];

function validate(profile) {
  const errors = {};
  const displayName = String(profile.displayName || '').trim();
  if (!displayName || displayName.length > 80) errors.displayName = 'Enter a preferred name between 1 and 80 characters.';
  Object.entries(RULES).forEach(([field, rule]) => {
    const value = Number(profile[field]);
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) errors[field] = rule.label + ' must be between ' + rule.min + ' and ' + rule.max + '.';
  });
  if (!Number.isInteger(Number(profile.age))) errors.age = 'Enter your age in whole years.';
  ['level', 'goal', 'time', 'location', 'equipment'].forEach((field) => {
    if (!String(profile[field] || '').trim()) errors[field] = 'Please choose an option.';
  });
  if (profile.leaderboardOptIn && !String(profile.leaderboardName || '').trim()) errors.leaderboardName = 'Choose a public display name.';
  return errors;
}

const STEP_FIELDS = [
  ['displayName', 'age', 'height', 'weight'],
  ['level', 'goal'],
  ['time', 'location', 'equipment', 'leaderboardName'],
];

function SelectField({ label, name, value, onChange, options, error }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange} aria-invalid={Boolean(error)}>
        <option value="">Select</option>
        {options.map((option) => <option value={option} key={option}>{name === 'time' ? option + ' minutes' : option}</option>)}
      </select>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default function ProfileScreen({ initialProfile, signedIn, demoMode, accountName, hasExistingProfile, onSubmit, onBack }) {
  const [profile, setProfile] = useState(initialProfile);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const bmi = useMemo(() => calculateBmi(profile.weight, profile.height), [profile.weight, profile.height]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setProfile((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleBack() {
    if (step > 0) setStep((current) => current - 1);
    else onBack();
  }

  function handleContinue() {
    const allErrors = validate(profile);
    const stepErrors = Object.fromEntries(Object.entries(allErrors).filter(([field]) => STEP_FIELDS[step].includes(field)));
    setErrors((current) => ({ ...current, ...stepErrors }));
    if (!Object.keys(stepErrors).length) setStep((current) => Math.min(2, current + 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    if (step < 2) {
      handleContinue();
      return;
    }
    const nextErrors = validate(profile);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStep(STEP_FIELDS.findIndex((fields) => fields.some((field) => nextErrors[field])));
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await onSubmit({ ...profile, displayName: String(profile.displayName).trim() });
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="screen-page profile-page">
      <ScreenHeader
        eyebrow={hasExistingProfile ? 'Fitness profile' : 'Personal setup'}
        title={hasExistingProfile ? 'Update what fits your routine' : 'Build a plan around your real day'}
        description="Only the details used for recommendations are requested. You can update them anytime."
        onBack={handleBack}
      />

      <div className="onboarding-steps" aria-label={'Profile setup step ' + (step + 1) + ' of 3'}>
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          return <div className={index === step ? 'active' : index < step ? 'complete' : ''} key={item.title}><i>{index < step ? <Check size={15} /> : <Icon size={15} />}</i><span><small>Step {index + 1}</small>{item.title}</span></div>;
        })}
      </div>

      <div className="profile-layout">
        <form className="panel profile-form onboarding-form" onSubmit={handleSubmit} noValidate>
          <div className="profile-sync-state"><ShieldCheck size={17} /><span>{signedIn ? 'Your saved profile stays with your private account.' : demoMode ? 'Judge Demo stays temporary and isolated.' : 'Guest profile data stays only in this browser.'}</span></div>

          {step === 0 && (
            <section className="onboarding-section">
              <div className="section-title"><UserRound size={20} /><div><h2>About you</h2><p>We’ll use your preferred name throughout the app.</p></div></div>
              <label className="form-field preferred-name-field">
                <span>Preferred name</span>
                <input name="displayName" maxLength="80" autoComplete="name" placeholder="Enter your name" value={profile.displayName || ''} onChange={handleChange} aria-invalid={Boolean(errors.displayName)} />
                <small className="field-help">{signedIn && accountName ? 'Your Google name is a starting point—you can choose what the app calls you.' : 'First name or nickname is perfect.'}</small>
                {errors.displayName && <small className="field-error">{errors.displayName}</small>}
              </label>
              <div className="form-grid form-grid-three">
                <label className="form-field"><span>Age</span><div className="input-with-unit"><input type="number" name="age" min="16" max="80" value={profile.age} onChange={handleChange} aria-invalid={Boolean(errors.age)} /><small>years</small></div>{errors.age && <small className="field-error">{errors.age}</small>}</label>
                <label className="form-field"><span>Height</span><div className="input-with-unit"><Ruler size={17} /><input type="number" name="height" min="120" max="230" value={profile.height} onChange={handleChange} aria-invalid={Boolean(errors.height)} /><small>cm</small></div>{errors.height && <small className="field-error">{errors.height}</small>}</label>
                <label className="form-field"><span>Weight</span><div className="input-with-unit"><Scale size={17} /><input type="number" name="weight" min="30" max="250" value={profile.weight} onChange={handleChange} aria-invalid={Boolean(errors.weight)} /><small>kg</small></div>{errors.weight && <small className="field-error">{errors.weight}</small>}</label>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="onboarding-section">
              <div className="section-title"><Target size={20} /><div><h2>Your goal</h2><p>Choose the closest fit. Recommendations remain easy to understand.</p></div></div>
              <div className="form-grid">
                <SelectField label="Fitness level" name="level" value={profile.level} onChange={handleChange} options={OPTIONS.level} error={errors.level} />
                <SelectField label="Primary goal" name="goal" value={profile.goal} onChange={handleChange} options={OPTIONS.goal} error={errors.goal} />
              </div>
              <div className="goal-preview">
                <Target size={23} /><div><strong>{profile.goal || 'Your goal shapes the plan'}</strong><span>We adjust the mix and explain why every recommendation was selected.</span></div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="onboarding-section">
              <div className="section-title"><Trophy size={20} /><div><h2>Your setup</h2><p>Tell us the time and space you can actually use.</p></div></div>
              <div className="form-grid">
                <SelectField label="Available time" name="time" value={profile.time} onChange={handleChange} options={OPTIONS.time} error={errors.time} />
                <SelectField label="Workout location" name="location" value={profile.location} onChange={handleChange} options={OPTIONS.location} error={errors.location} />
                <SelectField label="Available equipment" name="equipment" value={profile.equipment} onChange={handleChange} options={OPTIONS.equipment} error={errors.equipment} />
              </div>
              <div className="preference-stack">
                <label className="toggle-row"><input type="checkbox" name="lowImpact" checked={Boolean(profile.lowImpact)} onChange={handleChange} /><span><strong>Prefer low-impact movements</strong><small>Recommendation rules will favour gentler alternatives.</small></span></label>
                <label className={'toggle-row ' + (!signedIn ? 'disabled' : '')}><input type="checkbox" name="leaderboardOptIn" checked={Boolean(profile.leaderboardOptIn)} onChange={handleChange} disabled={!signedIn} /><span><strong>Join the community leaderboard</strong><small>Optional. Only your chosen alias and workout totals are shown.</small></span></label>
                {profile.leaderboardOptIn && signedIn && <label className="form-field leaderboard-name-field"><span>Public leaderboard name</span><input name="leaderboardName" maxLength="40" value={profile.leaderboardName || ''} onChange={handleChange} aria-invalid={Boolean(errors.leaderboardName)} />{errors.leaderboardName && <small className="field-error">{errors.leaderboardName}</small>}</label>}
              </div>
            </section>
          )}

          {saveError && <p className="field-error" role="alert">{saveError}</p>}
          <div className="onboarding-actions">
            <button className="button button-quiet" type="button" onClick={handleBack} disabled={saving}><ArrowLeft size={17} /> Back</button>
            {step < 2 ? (
              <button className="button button-primary" type="button" onClick={handleContinue}>Continue <ArrowRight size={17} /></button>
            ) : (
              <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving your profile…' : hasExistingProfile ? <><Save size={17} /> Save & refresh plan</> : <>Create my plan <ArrowRight size={17} /></>}</button>
            )}
          </div>
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
