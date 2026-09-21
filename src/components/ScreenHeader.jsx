export default function ScreenHeader({ eyebrow, title, description, action }) {
  return (
    <div className="screen-heading">
      <div className="screen-heading-row">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
