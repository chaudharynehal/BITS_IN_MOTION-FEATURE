export const TRUST_PUBLICATION_DATE = '22 September 2026';

export const PRIVACY_SECTIONS = [
  {
    title: 'Who we are',
    paragraphs: [
      'BITS in Motion is a student-focused fitness application created for Smart India Hackathon 2026. It provides personal fitness setup, workout plans, movement guidance, progress records, and an optional leaderboard.',
      'This Privacy Policy explains how the application handles information when you use it as a Guest or sign in with Google. The governing region for this policy is India.',
    ],
  },
  {
    title: 'Camera usage: nothing is recorded or stored',
    tone: 'camera',
    paragraphs: [
      'The Camera Coach uses Google MediaPipe inside your web browser. Camera frames are analysed in temporary device memory to estimate body landmarks, count supported movements, and show observable form cues.',
    ],
    bullets: [
      'Video and images are not uploaded to BITS in Motion, Neon, Google Identity Services, or another remote service.',
      'Camera frames are not recorded, saved to local storage, written to the database, or retained after processing.',
      'No external service or third-party AI provider receives or processes your camera frames.',
      'When you stop the camera, leave the Camera Coach, or switch movements, the application stops the active camera tracks and clears the live stream from the page.',
    ],
  },
  {
    title: 'What information we collect',
    paragraphs: [
      'The information handled by BITS in Motion depends on how you choose to use the application.',
    ],
    groups: [
      {
        title: 'If you use Guest Mode',
        paragraphs: [
          'The application keeps the fitness profile you enter, your generated workout plan, and your saved workout or movement-session history in this browser only. Guest records are not written to a Neon account database and are not automatically imported if you later sign in.',
        ],
      },
      {
        title: 'If you sign in with Google',
        paragraphs: [
          'Google Identity Services provides a unique Google account identifier, your name, email address, and profile-picture URL. BITS in Motion also stores the fitness profile you submit, generated plans, and workout or movement-session results so they can be restored for your account.',
          'BITS in Motion does not receive or store your Google password and does not request access to Google Drive, Contacts, Calendar, or Gmail.',
        ],
      },
      {
        title: 'If you join the leaderboard',
        paragraphs: [
          'Leaderboard participation is off by default. If you opt in, the public leaderboard shows only the alias you choose together with aggregate workouts, repetitions, and active-day totals. Your Google name and email address are not published. Turning participation off removes your entry from public rankings.',
        ],
      },
    ],
  },
  {
    title: 'Where your data is stored',
    bullets: [
      { lead: 'Guest Mode:', text: ' your profile, plan, and saved session history are stored in this browser’s local storage on this device.' },
      { lead: 'Google account:', text: ' your account identity, fitness profile, plans, and session results are stored in a Neon PostgreSQL database and accessed through the BITS in Motion server API.' },
      { lead: 'Session access:', text: ' signed-in access uses a signed, HttpOnly session cookie. A successful sign-out clears that cookie in the current browser.' },
      { lead: 'Camera Coach:', text: ' camera pixels remain in temporary browser memory and are not part of either storage path.' },
    ],
  },
  {
    title: 'Third party services we use',
    paragraphs: [
      'BITS in Motion uses a limited set of services to deliver the application:',
    ],
    bullets: [
      { lead: 'Google Identity Services:', text: ' provides Google sign-in and basic identity information when you choose to sign in.' },
      { lead: 'Neon:', text: ' hosts the PostgreSQL database used for signed-in profiles, plans, and workout results.' },
      { lead: 'Vercel:', text: ' hosts the web application and its server-side API.' },
      { lead: 'Google MediaPipe:', text: ' supplies the pose model used locally in your browser; it does not receive your camera stream.' },
      { lead: 'Google Fonts:', text: ' supplies the Manrope and Space Grotesk web fonts used by the interface.' },
    ],
    note: 'The application does not include advertising networks, marketing analytics SDKs, third-party behavioural tracking, or session-recording tools.',
  },
  {
    title: 'Your rights and choices',
    bullets: [
      'Use Guest Mode instead of creating a cloud-synced account.',
      'Decline camera permission or revoke it later in your browser settings.',
      'Review and update your fitness profile and chosen leaderboard alias.',
      'Keep leaderboard participation off, or opt out after joining.',
      'Sign out of your Google-linked BITS in Motion session.',
      'Ask the project team about correction or deletion of signed-in account data through the contact channel below.',
    ],
  },
  {
    title: 'Data retention',
    bullets: [
      { lead: 'Guest data:', text: ' remains in the browser until it is removed. Clearing your browser data or cache will permanently delete this information.' },
      { lead: 'Signed-in data:', text: ' is retained to provide account sync, saved plans, and progress history. The application does not currently provide a self-service account export or deletion control.' },
      { lead: 'Camera data:', text: ' is not retained. Preview and live camera frames are discarded as they are processed, and the stream is released when camera use ends.' },
    ],
  },
  {
    title: 'Contact us',
    paragraphs: [
      'For privacy questions or a request concerning signed-in account data, contact the BITS in Motion team through the official Smart India Hackathon project channel through which the application was shared. No separate public contact address is published in the application.',
    ],
  },
  {
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy as the project changes. When we do, we will revise the “Last updated” date on this page. Please review the current policy when you use the application.',
    ],
  },
];

export const TERMS_SECTIONS = [
  {
    title: 'Acceptance of terms',
    paragraphs: [
      'By accessing or using BITS in Motion, you confirm that you have read and agree to these Terms and Conditions. If you do not agree, do not use the application.',
    ],
  },
  {
    title: 'What BITS in Motion is',
    paragraphs: [
      'BITS in Motion is a student project created for Smart India Hackathon 2026. It provides general fitness setup, explainable workout recommendations, self-guided movements, an on-device Camera Coach for supported exercises, progress records, and an optional leaderboard.',
      'The application is provided for education, demonstration, and personal fitness support. It is not a medical device, clinical rehabilitation service, or substitute for a qualified trainer or healthcare professional.',
    ],
    links: [
      { label: 'Privacy Policy', route: 'privacy' },
      { label: 'Health Disclaimer', route: 'health-disclaimer' },
    ],
  },
  {
    title: 'Who can use this application',
    paragraphs: [
      'BITS in Motion is intended for people aged 16 or older who can safely take part in general physical activity. You are responsible for deciding whether the exercises are suitable for you and for seeking appropriate adult or professional guidance when needed.',
    ],
  },
  {
    title: 'Your account',
    bullets: [
      { lead: 'Guest Mode:', text: ' your profile, plan, and session history stay in this browser and are not synced to an account.' },
      { lead: 'Google sign-in:', text: ' your profile, plans, and session results are stored for the verified Google-linked account.' },
      'Provide accurate profile information and keep access to your Google account secure.',
      'Signing in does not automatically import Guest data. Guest and signed-in records remain separate.',
    ],
  },
  {
    title: 'Using the camera coach',
    paragraphs: [
      'The Camera Coach uses Google MediaPipe in your browser to estimate body landmarks, count supported movements, and display observable form cues. Camera access begins only after you grant browser permission.',
    ],
    bullets: [
      'Camera video and images are not uploaded, recorded, or stored by BITS in Motion.',
      'Place your device securely and keep your full body in frame where the movement requires it.',
      'Do not include another person in the camera view without their knowledge and permission.',
      'You may stop the stream at any time by ending the session, leaving the page, or revoking browser permission.',
    ],
  },
  {
    title: 'Your responsibilities',
    bullets: [
      'Check that your floor, furniture clearance, footwear, clothing, and device position are safe before exercising.',
      'Choose an appropriate fitness level and stop if you experience pain, dizziness, chest discomfort, unusual shortness of breath, or another warning symptom.',
      'Use the application only for lawful personal purposes and do not attempt to disrupt, bypass, scrape, or misuse its security or server functions.',
      'Do not use an abusive, misleading, or offensive public leaderboard alias.',
    ],
  },
  {
    title: 'No guarantee of accuracy',
    paragraphs: [
      'Workout recommendations, repetition counts, movement stages, form cues, BMI information, calorie estimates, and progress totals can be incomplete or inaccurate. Camera results are affected by lighting, framing, clothing, device position, visibility, and the limits of two-dimensional pose estimation.',
      'Do not continue a movement simply because the application counts it or shows a positive cue. How your body feels takes priority over application feedback.',
    ],
  },
  {
    title: 'Availability of the service',
    paragraphs: [
      'BITS in Motion is a hackathon project provided on an “as is” and “as available” basis. We do not guarantee uninterrupted access, permanent data availability, error-free operation, or continued availability of third-party services. Maintenance or project updates may change or interrupt features.',
    ],
  },
  {
    title: 'Limitation of liability',
    paragraphs: [
      'To the maximum extent permitted by applicable law, the BITS in Motion student project team and hackathon organisers are not liable for direct, indirect, incidental, special, consequential, or punitive loss arising from use of the application, including physical injury, inaccurate guidance or estimates, loss of Guest data, network interruption, or service downtime.',
      'Nothing in these Terms excludes a responsibility that cannot lawfully be excluded.',
    ],
  },
  {
    title: 'Ownership',
    paragraphs: [
      'The BITS in Motion name, original interface, project content, and project-created code and recommendation logic belong to their respective project creators. Third-party libraries, services, icons, fonts, and other materials remain subject to their own licences and terms.',
    ],
  },
  {
    title: 'Changes to these terms',
    paragraphs: [
      'We may update these Terms as the project changes. The “Last updated” date will identify the current version. Continuing to use the application after an update means that the current Terms apply to that use.',
    ],
  },
  {
    title: 'Governing law',
    paragraphs: [
      'These Terms and Conditions are governed by the laws of India.',
    ],
  },
  {
    title: 'Contact us',
    paragraphs: [
      'For questions about these Terms and Conditions, contact the BITS in Motion team through the official Smart India Hackathon project channel through which the application was shared. No separate public contact address is published in the application.',
    ],
  },
];

export const HEALTH_SECTIONS = [
  {
    title: 'This is not medical advice',
    paragraphs: [
      'BITS in Motion provides general fitness information, workout recommendations, movement guidance, and estimates for educational and motivational use. It does not provide medical advice, diagnosis, treatment, physiotherapy, rehabilitation, or emergency support.',
      'The application is not a medical device. Do not use it as a substitute for advice from a qualified doctor or other healthcare professional.',
    ],
  },
  {
    title: 'Talk to a doctor first, if needed',
    paragraphs: [
      'Speak with a qualified healthcare professional before starting or changing an exercise routine if you are unsure whether exercise is safe for you, especially if you:',
    ],
    bullets: [
      'have a heart, blood-pressure, breathing, neurological, joint, muscle, bone, or balance condition;',
      'are pregnant, recently gave birth, are recovering from surgery or injury, or have recently been seriously unwell;',
      'take medication that affects heart rate, blood pressure, balance, or exercise tolerance; or',
      'have been told to limit physical activity.',
    ],
  },
  {
    title: 'Listen to your body',
    paragraphs: [
      'Stop exercising immediately and move to a safe position if you experience a warning symptom, including:',
    ],
    bullets: [
      'chest pain, pressure, tightness, or an irregular heartbeat;',
      'fainting, severe dizziness, confusion, loss of balance, or changes in vision;',
      'sharp, sudden, or worsening pain in a muscle, joint, or bone;',
      'severe or unusual shortness of breath, nausea, cold sweats, or weakness.',
    ],
    callout: {
      title: 'Emergency help',
      text: 'If you think you may be having a medical emergency in India, call 112. Ambulance services may also be reached at 102 or 108. If you are outside India, call your local emergency number. Do not rely on BITS in Motion for emergency assistance.',
      tone: 'warning',
    },
  },
  {
    title: 'Preparing your space, especially in a hostel room',
    paragraphs: [
      'Compact rooms can contain hazards that are easy to miss. Before every session:',
    ],
    bullets: [
      'clear enough floor space for the full movement; for wide or travelling movements, aim for about 2 metres by 2 metres;',
      'move away from bed frames, desk corners, chairs, shelves, doors, low lights, and ceiling fans;',
      'remove cables, bags, books, footwear, loose rugs, liquids, and other trip or slip hazards;',
      'use a dry, stable, non-slip surface and position the device where it cannot fall;',
      'use adequate lighting and ventilation, and avoid disturbing or endangering roommates or other people nearby.',
    ],
  },
  {
    title: 'Limits of the camera coach',
    paragraphs: [
      'The Camera Coach observes selected points in a two-dimensional camera image. It can support practice, but it cannot assess your health or guarantee safe technique.',
    ],
    bullets: [
      'It cannot measure pain, fatigue, joint load, spinal compression, muscle tension, balance risk, or an internal injury.',
      'Poor lighting, camera angle, partial visibility, loose clothing, rapid movement, or another object in frame can reduce accuracy.',
      'Rep counts and cues may be late, missed, or incorrect.',
      'It does not replace a qualified trainer, physiotherapist, or healthcare professional.',
    ],
  },
  {
    title: 'Exercise sensibly',
    bullets: [
      'Warm up before harder movements and cool down gradually afterwards.',
      'Choose a level, duration, and pace that match your current ability; take breaks when needed.',
      'Use low-impact options when you prefer them, but do not treat a “low impact” label as proof that an exercise is medically suitable.',
      'Wear suitable footwear or use a stable exercise mat, keep water nearby, and avoid exercising in excessive heat.',
      'Never push through sharp pain or continue only to reach a target, streak, result, or leaderboard position.',
    ],
  },
  {
    title: 'Calorie and fitness estimates',
    paragraphs: [
      'Calorie figures are estimates based on movement MET values, the body weight entered in your profile, and recorded session time. Actual energy use varies by individual and may differ substantially.',
      'BMI is shown as general information. It does not diagnose health, body composition, fitness, or medical risk. For users aged 16–19, the application does not apply adult BMI category labels because age-specific percentiles are not implemented.',
      'Workout recommendations use the profile choices you provide. They do not assess medical suitability.',
    ],
  },
  {
    title: 'Feedback',
    paragraphs: [
      'If you notice an exercise instruction, recommendation, or Camera Coach cue that appears unsafe or misleading, stop using that guidance and share the details with the BITS in Motion team through the official Smart India Hackathon project channel through which the application was shared.',
      'Feedback is not an emergency service. For urgent medical help, use the emergency numbers listed above.',
    ],
  },
];
