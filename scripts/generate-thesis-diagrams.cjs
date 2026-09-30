const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..', 'thesis-overleaf', 'figures');

const common = `
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 z" fill="#315fbd"/>
    </marker>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#24406f" flood-opacity="0.14"/>
    </filter>
    <style>
      .title{font:700 42px Arial,sans-serif;fill:#24334d}
      .subtitle{font:400 23px Arial,sans-serif;fill:#60718d}
      .box{fill:#fff;stroke:#b8c8e3;stroke-width:3;rx:24;filter:url(#shadow)}
      .aws{fill:#fff7e8;stroke:#e7a737}
      .docker{fill:#edf4ff;stroke:#4a78d0}
      .external{fill:#f4efff;stroke:#7c5ab7}
      .data{fill:#edfbf3;stroke:#3d9b68}
      .label{font:700 25px Arial,sans-serif;fill:#253550;text-anchor:middle}
      .small{font:400 20px Arial,sans-serif;fill:#61718b;text-anchor:middle}
      .arrow{fill:none;stroke:#315fbd;stroke-width:5;marker-end:url(#arrow)}
      .dash{stroke-dasharray:11 10}
    </style>
  </defs>`;

const architecture = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1020" viewBox="0 0 1800 1020">
${common}<rect width="1800" height="1020" fill="#f7f9fc"/>
<text x="900" y="66" class="title" text-anchor="middle">Υλοποιημένη αρχιτεκτονική Happy Tails</text>
<text x="900" y="105" class="subtitle" text-anchor="middle">AWS eu-central-1 · ένα EC2 instance · Docker Compose</text>
<rect x="70" y="380" width="220" height="130" class="box external"/><text x="180" y="430" class="label">Χρήστης</text><text x="180" y="468" class="small">HTTPS browser</text>
<rect x="355" y="380" width="230" height="130" class="box aws"/><text x="470" y="428" class="label">Route 53</text><text x="470" y="467" class="small">DNS domain</text>
<rect x="650" y="380" width="230" height="130" class="box aws"/><text x="765" y="428" class="label">Elastic IP</text><text x="765" y="467" class="small">σταθερή διεύθυνση</text>
<rect x="935" y="175" width="790" height="650" rx="34" fill="#fff" stroke="#ef9f25" stroke-width="5"/><text x="1330" y="225" class="label">EC2 t3.small · Amazon Linux 2023</text><text x="1330" y="262" class="small">Security group: 80/443 public · 22 restricted /32</text>
<rect x="1000" y="320" width="220" height="135" class="box docker"/><text x="1110" y="370" class="label">Nginx</text><text x="1110" y="406" class="small">TLS · reverse proxy</text>
<rect x="1270" y="320" width="220" height="135" class="box docker"/><text x="1380" y="370" class="label">Spring Boot</text><text x="1380" y="406" class="small">REST API + React</text>
<rect x="1000" y="570" width="220" height="135" class="box data"/><text x="1110" y="620" class="label">MySQL 8.4</text><text x="1110" y="656" class="small">mysql-data volume</text>
<rect x="1270" y="570" width="220" height="135" class="box data"/><text x="1380" y="615" class="label">Uploads &amp; logs</text><text x="1380" y="653" class="small">persistent volumes</text>
<rect x="1535" y="340" width="155" height="95" class="box external"/><text x="1612" y="380" class="label">SES</text><text x="1612" y="409" class="small">SMTP</text>
<rect x="1535" y="570" width="155" height="105" class="box external"/><text x="1612" y="612" class="label">Google</text><text x="1612" y="641" class="small">Calendar OAuth</text>
<path d="M290 445 H345" class="arrow"/><path d="M585 445 H640" class="arrow"/><path d="M880 445 H990" class="arrow"/>
<path d="M1220 387 H1260" class="arrow"/><path d="M1380 455 V535 H1110 V560" class="arrow"/>
<path d="M1380 455 V560" class="arrow"/><path d="M1490 370 H1525" class="arrow dash"/><path d="M1490 417 C1540 455 1510 535 1535 590" class="arrow dash"/>
<rect x="965" y="750" width="535" height="48" rx="18" fill="#eaf0f9"/><text x="1232" y="782" class="small">Εσωτερικό Docker network · δεδομένα επάνω σε EBS gp3</text>
</svg>`;

const sequence = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1190" viewBox="0 0 1800 1190">
${common}<rect width="1800" height="1190" fill="#f8fafc"/><text x="900" y="60" class="title" text-anchor="middle">Εγγραφή, επιβεβαίωση email και έγκριση</text>
${[['Χρήστης',150],['React',450],['Spring Boot',750],['MySQL',1050],['Amazon SES',1350],['Admin',1650]].map(([t,x])=>`<rect x="${x-110}" y="105" width="220" height="75" class="box"/><text x="${x}" y="151" class="label">${t}</text><line x1="${x}" y1="180" x2="${x}" y2="1110" stroke="#a9b7cb" stroke-width="3" stroke-dasharray="9 9"/>`).join('')}
<g font-family="Arial,sans-serif" font-size="21" fill="#34445e">
<path d="M150 240 H440" class="arrow"/><text x="295" y="226" text-anchor="middle">1. Υποβολή στοιχείων</text>
<path d="M450 300 H740" class="arrow"/><text x="595" y="286" text-anchor="middle">2. POST /register</text>
<path d="M750 360 H1040" class="arrow"/><text x="895" y="346" text-anchor="middle">3. Αποθήκευση χρήστη + SHA-256 hash</text>
<path d="M750 430 H1340" class="arrow"/><text x="1045" y="416" text-anchor="middle">4. Αποστολή verification link (24 ώρες)</text>
<path d="M1350 500 H160" class="arrow"/><text x="755" y="486" text-anchor="middle">5. Παράδοση email</text>
<path d="M150 570 H740" class="arrow"/><text x="445" y="556" text-anchor="middle">6. Άνοιγμα συνδέσμου με token</text>
<path d="M750 640 H1040" class="arrow"/><text x="895" y="626" text-anchor="middle">7. Έλεγχος hash/λήξης και διαγραφή token</text>
<path d="M750 710 H440" class="arrow"/><text x="595" y="696" text-anchor="middle">8. Email verified · αναμονή έγκρισης</text>
<path d="M1650 790 H1060" class="arrow"/><text x="1355" y="776" text-anchor="middle">9. Έγκριση και ανάθεση ρόλου</text>
<path d="M1050 850 H760" class="arrow"/><text x="905" y="836" text-anchor="middle">10. Ενεργοποίηση λογαριασμού</text>
<path d="M150 940 H440" class="arrow"/><text x="295" y="926" text-anchor="middle">11. Σύνδεση</text>
<path d="M450 1000 H740" class="arrow"/><text x="595" y="986" text-anchor="middle">12. Credentials</text>
<path d="M750 1060 H160" class="arrow"/><text x="455" y="1046" text-anchor="middle">13. Επιτυχής πρόσβαση στον πίνακα</text>
</g></svg>`;

const deployment = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="760" viewBox="0 0 1800 760">
${common}<rect width="1800" height="760" fill="#f8fafc"/><text x="900" y="65" class="title" text-anchor="middle">Ροή ενημέρωσης της εφαρμογής</text>
<text x="900" y="106" class="subtitle" text-anchor="middle">Ελεγχόμενη αντικατάσταση μόνο του application container</text>
${[['1','Αλλαγή κώδικα','Git working tree',80],['2','React build','παραγωγικά assets',360],['3','Maven package','Spring Boot JAR',640],['4','SSH / SFTP','checksum + backup',920],['5','Docker rebuild','μόνο Spring image',1200],['6','Επαλήθευση','logs · HTTP 301 · HTTPS 200',1480]].map(([n,t,s,x])=>`<rect x="${x}" y="250" width="240" height="180" class="box ${n==='4'?'aws':'docker'}"/><circle cx="${Number(x)+40}" cy="285" r="22" fill="#315fbd"/><text x="${Number(x)+40}" y="293" font-family="Arial" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">${n}</text><text x="${Number(x)+120}" y="337" class="label">${t}</text><text x="${Number(x)+120}" y="378" class="small">${s}</text>`).join('')}
${[320,600,880,1160,1440].map(x=>`<path d="M${x} 340 H${x+30}" class="arrow"/>`).join('')}
<rect x="460" y="520" width="880" height="105" class="box data"/><text x="900" y="561" class="label">Παραμένουν ενεργά κατά την ενημέρωση</text><text x="900" y="600" class="small">MySQL · Nginx · mysql-data · petclinic-uploads · logs</text>
</svg>`;

const liquibase = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1050" viewBox="0 0 1800 1050">
${common}<rect width="1800" height="1050" fill="#f7f9fc"/>
<text x="900" y="62" class="title" text-anchor="middle">Επαλήθευση μεταναστεύσεων Liquibase</text>
<text x="900" y="102" class="subtitle" text-anchor="middle">EC2 · petclinic-app restart · 4 Σεπτεμβρίου 2026, 01:29 UTC</text>
<rect x="75" y="155" width="1650" height="335" rx="26" fill="#172238" stroke="#315fbd" stroke-width="3" filter="url(#shadow)"/>
<text x="115" y="205" font-family="Consolas,monospace" font-size="24" fill="#77e6a2">$ docker logs --since 5m petclinic-app</text>
<g font-family="Consolas,monospace" font-size="23" fill="#e8eef8">
<text x="115" y="255">01:29:06  liquibase.changelog   Reading from petclinic.DATABASECHANGELOG</text>
<text x="115" y="301">01:29:06  liquibase.util        UPDATE SUMMARY</text>
<text x="155" y="342">Run: 0     Previously run: 4     Filtered out: 0     Total change sets: 4</text>
<text x="115" y="388">01:29:06  liquibase.lockservice Successfully released change log lock</text>
<text x="115" y="434">01:29:06  liquibase.command     Command execution complete</text>
</g>
<rect x="75" y="535" width="1650" height="365" rx="26" class="box"/>
<text x="115" y="590" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#253550">DATABASECHANGELOG — read-only verification</text>
<rect x="105" y="620" width="1590" height="55" rx="10" fill="#e8eef9"/>
<g font-family="Arial,sans-serif" font-size="21" fill="#2a3a55">
<text x="130" y="656" font-weight="700">#</text><text x="190" y="656" font-weight="700">Changeset ID</text><text x="690" y="656" font-weight="700">Changelog file</text><text x="1515" y="656" font-weight="700">Status</text>
<text x="130" y="720">1</text><text x="190" y="720">2025-10-23-extend-role-enum</text><text x="690" y="720">appointment-owner-pet.yaml</text><text x="1515" y="720" fill="#248454" font-weight="700">EXECUTED</text>
<text x="130" y="770">2</text><text x="190" y="770">2025-10-23-allow-null-owner-pet</text><text x="690" y="770">appointment-owner-pet.yaml</text><text x="1515" y="770" fill="#248454" font-weight="700">EXECUTED</text>
<text x="130" y="820">3</text><text x="190" y="820">2026-09-01-email-verification</text><text x="690" y="820">email-verification.yaml</text><text x="1515" y="820" fill="#248454" font-weight="700">EXECUTED</text>
<text x="130" y="870">4</text><text x="190" y="870">2026-09-04-password-reset</text><text x="690" y="870">password-reset.yaml</text><text x="1515" y="870" fill="#248454" font-weight="700">EXECUTED</text>
</g>
<rect x="350" y="945" width="1100" height="58" rx="20" fill="#eaf8f0" stroke="#3d9b68" stroke-width="2"/>
<text x="900" y="983" class="small" fill="#23734a">petclinic-app: Up · δημόσιος έλεγχος: HTTPS 200 · κανένα credential στο output</text>
</svg>`;

const uploadPersistence = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="900" viewBox="0 0 1800 900">
${common}<rect width="1800" height="900" fill="#f7f9fc"/>
<text x="900" y="64" class="title" text-anchor="middle">Έλεγχος διατήρησης μεταφορτωμένου αρχείου</text>
<text x="900" y="105" class="subtitle" text-anchor="middle">petclinic-uploads volume · επανεκκίνηση μόνο του Spring container</text>
<rect x="90" y="190" width="650" height="390" class="box docker"/>
<circle cx="155" cy="250" r="30" fill="#315fbd"/><text x="155" y="259" font-family="Arial" font-size="25" font-weight="700" fill="#fff" text-anchor="middle">1</text>
<text x="415" y="260" class="label">Πριν από την επανεκκίνηση</text>
<g font-family="Consolas,monospace" font-size="22" fill="#34445e">
<text x="140" y="340">Τύπος: application/pdf</text><text x="140" y="392">Μέγεθος: 1.191.697 bytes</text>
<text x="140" y="444">Κατάλογος: /app/uploads/pet-documents/1/</text>
<text x="140" y="510">SHA-256:</text><text x="140" y="548">6f2da0b1dc7721b3...ba366c85564</text>
</g>
<path d="M760 385 H1015" class="arrow"/><rect x="790" y="290" width="195" height="78" rx="18" fill="#fff7e8" stroke="#e7a737" stroke-width="3"/>
<text x="887" y="325" class="label">Restart</text><text x="887" y="354" class="small">petclinic-app</text>
<rect x="1060" y="190" width="650" height="390" class="box data"/>
<circle cx="1125" cy="250" r="30" fill="#29905b"/><text x="1125" y="259" font-family="Arial" font-size="25" font-weight="700" fill="#fff" text-anchor="middle">2</text>
<text x="1385" y="260" class="label">Μετά την επανεκκίνηση</text>
<g font-family="Consolas,monospace" font-size="22" fill="#34445e">
<text x="1110" y="340">Ίδια διαδρομή: διαθέσιμη</text><text x="1110" y="392">Μέγεθος: 1.191.697 bytes</text>
<text x="1110" y="444">SHA-256: αμετάβλητο</text><text x="1110" y="496">petclinic-app: Up</text><text x="1110" y="548">Δημόσια απόκριση: HTTPS 200</text>
</g>
<rect x="280" y="675" width="1240" height="105" rx="24" fill="#eaf8f0" stroke="#3d9b68" stroke-width="3"/>
<text x="900" y="720" class="label">Αποτέλεσμα: επιτυχής διατήρηση δεδομένων</text>
<text x="900" y="758" class="small">Ίδια διαδρομή + ίδιο μέγεθος + ίδιο checksum · επιτυχής ανάκτηση μέσω «Προβολή»</text>
</svg>`;

const evaluationWorkflow = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="950" viewBox="0 0 1800 950">
${common}<rect width="1800" height="950" fill="#f7f9fc"/>
<text x="900" y="64" class="title" text-anchor="middle">Ροή πειραματικής αξιολόγησης</text>
<text x="900" y="105" class="subtitle" text-anchor="middle">Σταθερό περιβάλλον · επαναλήψιμο workload · συσχέτιση εφαρμογής και AWS metrics</text>
${[['1','Προετοιμασία','Σταθερό dataset\\nκαι αρχική κατάσταση',75],['2','Workload','HTTPS σενάρια\\n1 · 5 · 10 · 25 users',355],['3','Μετρήσεις','p50 · p95 · p99\\nthroughput · errors',635],['4','CloudWatch','CPU · network\\nstatus checks',915],['5','Αξιοπιστία','restart / reboot\\nέλεγχος δεδομένων',1195],['6','Ανάλυση','πίνακες · γραφήματα\\nόρια και ευρήματα',1475]].map(([n,t,s,x])=>{const parts=s.split('\\n');return `<rect x="${x}" y="245" width="250" height="230" class="box ${n==='4'?'aws':n==='5'?'data':'docker'}"/><circle cx="${Number(x)+42}" cy="285" r="23" fill="#315fbd"/><text x="${Number(x)+42}" y="293" font-family="Arial" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">${n}</text><text x="${Number(x)+125}" y="350" class="label">${t}</text><text x="${Number(x)+125}" y="399" class="small">${parts[0]}</text><text x="${Number(x)+125}" y="432" class="small">${parts[1]}</text>`}).join('')}
${[325,605,885,1165,1445].map(x=>`<path d="M${x} 360 H${x+20}" class="arrow"/>`).join('')}
<rect x="250" y="590" width="1300" height="210" class="box external"/>
<text x="900" y="650" class="label">Κανόνες εγκυρότητας</text>
<text x="900" y="700" class="small">Ίδια έκδοση εφαρμογής και ίδιο dataset ανά βαθμίδα · UTC timestamps σε όλα τα τεκμήρια</text>
<text x="900" y="742" class="small">Τα πειραματικά όρια δεν παρουσιάζονται ως εγγυημένη παραγωγική χωρητικότητα</text>
</svg>`;

function groupedBarChart({ title, subtitle, categories, series, max, ticks, unit = '' }) {
  const width = 1800;
  const height = 980;
  const left = 180;
  const right = 90;
  const top = 180;
  const bottom = 170;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const groupWidth = plotWidth / categories.length;
  const barWidth = Math.min(100, groupWidth / (series.length + 1));
  const colors = ['#315fbd', '#e59a22', '#3d9b68'];
  const y = value => top + plotHeight - (value / max) * plotHeight;
  const grid = ticks.map(value => `<line x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}" stroke="#d8e1ee" stroke-width="2"/><text x="${left-25}" y="${y(value)+8}" text-anchor="end" font-family="Arial" font-size="22" fill="#60718d">${value}${unit}</text>`).join('');
  const bars = categories.map((category, i) => {
    const center = left + groupWidth * (i + 0.5);
    const start = center - (series.length * barWidth + (series.length - 1) * 18) / 2;
    const rects = series.map((item, j) => {
      const value = item.values[i];
      const x = start + j * (barWidth + 18);
      const barTop = y(value);
      return `<rect x="${x}" y="${barTop}" width="${barWidth}" height="${top+plotHeight-barTop}" rx="10" fill="${colors[j]}"/><text x="${x+barWidth/2}" y="${barTop-13}" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#253550">${String(value).replace('.', ',')}</text>`;
    }).join('');
    return `${rects}<text x="${center}" y="${top+plotHeight+48}" text-anchor="middle" font-family="Arial" font-size="23" fill="#34445e">${category}</text>`;
  }).join('');
  const legend = series.map((item, i) => `<rect x="${left+i*390}" y="${height-72}" width="28" height="28" rx="5" fill="${colors[i]}"/><text x="${left+42+i*390}" y="${height-49}" font-family="Arial" font-size="22" fill="#34445e">${item.name}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${common}<rect width="${width}" height="${height}" fill="#f7f9fc"/><text x="900" y="66" class="title" text-anchor="middle">${title}</text><text x="900" y="108" class="subtitle" text-anchor="middle">${subtitle}</text>${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${top+plotHeight}" stroke="#60718d" stroke-width="3"/><line x1="${left}" y1="${top+plotHeight}" x2="${width-right}" y2="${top+plotHeight}" stroke="#60718d" stroke-width="3"/>${bars}${legend}</svg>`;
}

const throughputChart = groupedBarChart({
  title: 'Κλιμάκωση throughput ανά βαθμίδα φόρτου',
  subtitle: 'Μετρημένο throughput και απλή γραμμική προβολή από το baseline',
  categories: ['1 VU', '5 VU', '10 VU', '25 VU'],
  series: [
    { name: 'Μετρημένα αιτήματα/s', values: [14.91, 79.77, 163.68, 339.73] },
    { name: 'Γραμμική προβολή', values: [14.91, 74.55, 149.10, 372.75] },
  ],
  max: 400,
  ticks: [0, 100, 200, 300, 400],
});

const latencyChart = groupedBarChart({
  title: 'Χρόνος απόκρισης p95 υπό αυξανόμενο φορτίο',
  subtitle: 'Η αυθεντικοποίηση υποβαθμίζεται αισθητά, ενώ οι επαναλαμβανόμενες αναγνώσεις παραμένουν σταθερές',
  categories: ['1 VU', '5 VU', '10 VU', '25 VU'],
  series: [
    { name: 'Login p95 (ms)', values: [429.53, 1108.98, 2049.57, 7710.72] },
    { name: 'Μέγιστο read p95 (ms)', values: [91.85, 87.28, 81.71, 109.72] },
  ],
  max: 8000,
  ticks: [0, 2000, 4000, 6000, 8000],
});

const memoryChart = groupedBarChart({
  title: 'Μνήμη application container μετά από κάθε βαθμίδα',
  subtitle: 'Στιγμιαία χρήση μνήμης του Spring container μετά την ολοκλήρωση του workload',
  categories: ['1 VU', '5 VU', '10 VU', '25 VU'],
  series: [{ name: 'Μνήμη εφαρμογής (MiB)', values: [399.3, 430.7, 477.1, 571.6] }],
  max: 650,
  ticks: [0, 150, 300, 450, 600],
  unit: '',
});

const cloudWatchChart = groupedBarChart({
  title: 'CloudWatch CPU στα πειραματικά χρονικά παράθυρα',
  subtitle: 'Πεντάλεπτα EC2 aggregates σε UTC· τα σύντομα workloads τέμνουν τα αντίστοιχα παράθυρα',
  categories: ['13:15–20', '13:20–25', '13:30–35', '13:35–40', '13:40–45'],
  series: [
    { name: 'Μέση CPU (%)', values: [3.10, 8.85, 29.88, 12.13, 12.57] },
    { name: 'Μέγιστη CPU (%)', values: [10.20, 16.25, 77.47, 22.78, 23.43] },
  ],
  max: 80,
  ticks: [0, 20, 40, 60, 80],
});

async function render(svg, relativePath) {
  const output = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output);
  console.log(output);
}

Promise.all([
  render(architecture, path.join('infrastructure', 'aws-implemented-architecture.png')),
  render(sequence, path.join('application', 'registration-verification-sequence.png')),
  render(deployment, path.join('infrastructure', 'deployment-pipeline.png')),
  render(liquibase, path.join('infrastructure', 'liquibase-migrations.png')),
  render(uploadPersistence, path.join('infrastructure', 'upload-volume-persistence.png')),
  render(evaluationWorkflow, path.join('evaluation', 'experimental-workflow.png')),
  render(throughputChart, path.join('evaluation', 'throughput-scaling.png')),
  render(latencyChart, path.join('evaluation', 'latency-p95-scaling.png')),
  render(memoryChart, path.join('evaluation', 'application-memory-scaling.png')),
  render(cloudWatchChart, path.join('evaluation', 'cloudwatch-cpu-windows.png')),
]).catch(error => { console.error(error); process.exitCode = 1; });
