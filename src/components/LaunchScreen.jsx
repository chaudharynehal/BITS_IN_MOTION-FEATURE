import { Activity, ScanLine } from 'lucide-react';

export default function LaunchScreen() {
  return (
    <div className="launch-screen" role="status" aria-label="BITS in Motion is starting">
      <div className="launch-orbit" aria-hidden="true">
        <span className="launch-node node-one" />
        <span className="launch-node node-two" />
        <span className="launch-node node-three" />
        <ScanLine size={30} />
      </div>
      <img src="/logo.png" alt="" />
      <span className="launch-kicker"><Activity size={15} /> Smart India Hackathon 2026</span>
      <h1>BITS <em>in Motion</em></h1>
      <p>Plan smart. Move well. Build momentum.</p>
      <div className="launch-pulse" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}
