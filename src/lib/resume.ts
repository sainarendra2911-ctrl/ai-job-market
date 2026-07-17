import mammoth from 'mammoth';

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/build/pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: { str?: string }) => item.str ?? '').join(' ') + '\n';
  }
  return text;
}

async function parseDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return parsePdf(file);
  if (name.endsWith('.docx')) return parseDocx(file);
  if (name.endsWith('.txt')) return file.text();
  throw new Error('Unsupported resume format. Please upload PDF, DOCX, or TXT.');
}

const SKILL_LIBRARY = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Python', 'Django',
  'Flask', 'Java', 'Spring', 'C++', 'C#', '.NET', 'Go', 'Rust', 'Ruby', 'Rails', 'PHP', 'Laravel', 'Swift',
  'Kotlin', 'Scala', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'Elasticsearch', 'GraphQL',
  'REST', 'gRPC', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Ansible', 'Jenkins', 'CI/CD',
  'Git', 'Linux', 'Bash', 'Shell', 'HTML', 'CSS', 'Tailwind', 'Sass', 'Bootstrap', 'Material UI',
  'Redux', 'MobX', 'Jest', 'Vitest', 'Cypress', 'Selenium', 'PyTorch', 'TensorFlow', 'Keras', 'scikit-learn',
  'Pandas', 'NumPy', 'Spark', 'Hadoop', 'Kafka', 'RabbitMQ', 'Microservices', 'Serverless', 'Lambda',
  'Figma', 'Agile', 'Scrum', 'Jira', 'Leadership', 'Communication', 'Project Management',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Analysis', 'Data Visualization',
  'Tableau', 'Power BI', 'Excel', 'SEO', 'Marketing', 'Salesforce', 'HubSpot',
];

export interface ParsedProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  summary: string | null;
  skills: string[];
  experience_years: number | null;
  education: string | null;
}

export function parseProfileFromText(text: string): ParsedProfile {
  const clean = text.replace(/\s+/g, ' ').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = clean.match(/(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/);

  const name = lines.find((l) => {
    if (l.includes('@') || /\d{3,}/.test(l)) return false;
    const words = l.split(/\s+/);
    return words.length >= 2 && words.length <= 4 && /^[A-Za-z][A-Za-z\s.'-]+$/.test(l) && l.length < 50;
  }) ?? null;

  const titleKeywords = ['engineer', 'developer', 'manager', 'designer', 'analyst', 'consultant', 'architect', 'lead', 'director', 'specialist', 'administrator'];
  const title = lines.find((l) => {
    const lower = l.toLowerCase();
    return titleKeywords.some((k) => lower.includes(k)) && l.length < 80 && l !== name;
  }) ?? null;

  const lower = clean.toLowerCase();
  const skills = SKILL_LIBRARY.filter((s) => {
    const sl = s.toLowerCase().replace(/[.+*?^$()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${sl}\\b`, 'i').test(lower);
  });

  const expMatch = clean.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?/i);
  const experience_years = expMatch ? parseInt(expMatch[1], 10) : null;

  const eduKeywords = ['bachelor', 'master', 'b.s.', 'b.a.', 'm.s.', 'm.a.', 'phd', 'ph.d', 'mba', 'b.tech', 'm.tech', 'b.e.', 'm.e.', 'diploma', 'associate degree'];
  const education = lines.find((l) => eduKeywords.some((k) => l.toLowerCase().includes(k))) ?? null;

  const nameIdx = name ? clean.indexOf(name) : 0;
  const summaryStart = nameIdx >= 0 ? nameIdx + (name?.length ?? 0) : 0;
  const summary = clean.slice(summaryStart, summaryStart + 350).trim() || null;

  return { name, email: emailMatch?.[0] ?? null, phone: phoneMatch?.[0] ?? null, title, summary, skills, experience_years, education };
}
