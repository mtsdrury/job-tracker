/**
 * PDF text extraction and keyword extraction utilities
 * Uses pdf-parse for server-side PDF parsing
 */

// Common stop words to filter out
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "be", "been", "are",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "must", "shall", "if", "so", "that",
  "this", "these", "those", "which", "what", "who", "when", "where",
  "why", "how", "than", "into", "through", "during", "before", "after",
  "above", "below", "up", "down", "out", "off", "over", "under", "again",
  "further", "then", "once", "here", "there", "all", "both", "each",
  "every", "few", "more", "most", "other", "some", "such", "no", "nor",
  "only", "same", "so", "than", "too", "very", "just", "because", "also",
  "about", "while", "between", "across", "without", "within", "along",
  "around", "etc", "vs", "per", "used", "using", "experience", "work",
  "job", "position", "role", "including", "required", "preferred", "ability",
  "strong", "excellent", "good", "great", "must", "should", "experience",
  "years", "year", "level", "team", "company", "business", "industry",
  "skills", "skill", "knowledge", "understanding", "knowledge", "understanding",
  "you", "your", "we", "our", "us", "them", "he", "she", "it", "they",
  "am", "being", "myself", "yourself", "itself", "ourselves", "yourselves",
  "themselves", "not", "don", "doesn", "didn", "won", "wouldn", "shouldn",
  "don't", "doesn't", "didn't", "won't", "wouldn't", "shouldn't", "can't",
  "couldn't", "mustn't", "hasn't", "haven't", "isn't", "aren't", "wasn't",
  "weren't", "needn't", "i", "me", "we", "need", "needs", "needed",
  "want", "wanted", "wants", "able", "applicable", "approximately", "description",
  "looking", "looking", "seeking", "opportunity", "opportunities", "environment",
  "minimum", "maximum", "responsibilities", "requirements", "qualifications",
  "bachelor", "degree", "certificate", "certification", "license", "licensed",
  "preferred", "desired", "candidate", "applicant", "ideal", "perfect", "right"
]);

// Keywords that are typically technical skills, tools, frameworks, or languages
const TECHNICAL_KEYWORDS = /\b(python|javascript|typescript|java|c\+\+|c#|go|rust|ruby|php|kotlin|swift|scala|react|angular|vue|node|express|django|flask|rails|spring|tensorflow|pytorch|aws|azure|gcp|docker|kubernetes|sql|postgres|mongodb|redis|git|linux|unix|windows|mac|api|rest|graphql|grpc|microservices|devops|ci\/cd|github|gitlab|jenkins|agile|scrum|jira|confluence|elasticsearch|kafka|rabbitmq|nginx|apache|html|css|scss|webpack|npm|yarn|maven|gradle|junit|pytest|jest|cypress|selenium|postman|figma|adobe|photoshop|illustrator|blender|unity|unreal|ue4|ue5|android|ios|react native|flutter|vue\.js|next\.js|nuxt|svelte|ember|backbone|knockout|threejs|babylon|webgl|opengl|vulkan|directx|openal|sfml|sdl|lua|perl|groovy|clojure|elixir|erlang|haskell|ocaml|f#|scheme|lisp|r|matlab|julia|stata|sas|spark|hadoop|cassandra|neo4j|arangodb|dynamodb|firestore|cloudflare|netlify|heroku|vercel|digital ocean|linode|vultr|hetzner|proxmox|vmware|hyperv|virtualbox|terraform|ansible|puppet|chef|vagrant|box|vagrant|packer|consul|nomad|vault|prometheus|grafana|splunk|datadog|newrelic|elastic|sumo logic|papertrail|loggly|sentry|bugsnag|raygun|rollbar|airbrake|exception|monitoring|observability|tracing|jaeger|zipkin|xray|appdynamics|dynatrace|crowdstrike|carbon black|cylance|sentinelone|malwarebytes|kaspersky|mcafee|norton|avast|avg|trend micro|f\-secure|bitdefender|eset|sophos|avira|clamav|snort|suricata|zeek|bro|tcpdump|wireshark|metasploit|burp|owasp|zap|acunetix|nessus|qualys|rapid7|tenable|rapid7|fortify|checkmarx|veracode|sonarqube|snyk|dependabot|coverity|klocwork|parasoft|jtest|javadoc|sphinx|swagger|openapi|postman|insomnia|restclient|http client|insomnia|hurl|curl|wget|httpie|xh|fetch|axios|urllib|requests|httpx|aiohttp|twisted|gevent|eventlet|tornado|asyncio|trio|curio|anyio|httpcore|httpbin|mockoon|prism|postman|insomnia|swagger ui|swagger editor|swagger codegen|openapi generator|raml|apib|blueprint|graphql playground|apollo sandbox|hasura|prisma|typeorm|sequelize|django orm|sqlalchemy|peewee|tortoise|pony|mongoengine|mango|odmantic|motor|asyncpg|asyncmy|aiosqlite|tortoise orm)\b/gi;

// Specific technical skills that might not match the regex
const TECH_SKILLS = [
  "python", "javascript", "typescript", "java", "go", "rust", "c++", "c#",
  "react", "vue", "angular", "node", "express", "django", "flask", "rails",
  "aws", "azure", "gcp", "docker", "kubernetes", "postgresql", "mongodb",
  "sql", "nosql", "redis", "elasticsearch", "kafka", "git", "linux", "html",
  "css", "webpack", "npm", "yarn", "rest", "graphql", "api", "microservices",
  "devops", "ci/cd", "jenkins", "github", "gitlab", "agile", "scrum",
  "tensorflow", "pytorch", "machine learning", "data science", "data engineering",
  "nlp", "computer vision", "deep learning", "neural networks", "gpt", "bert",
  "transformers", "llm", "large language model", "llama", "mistral", "qwen",
  "claude", "gpt-4", "gpt-3", "bard", "gemini", "palm", "flamingo", "alpaca",
  "bigquery", "snowflake", "redshift", "athena", "presto", "spark", "hadoop",
  "spark", "hive", "pig", "storm", "flink", "beam", "airflow", "dbt",
  "tableau", "power bi", "looker", "grafana", "kibana", "splunk", "datadog",
  "newrelic", "prometheus", "elk stack", "siem", "security", "ssl", "tls",
  "oauth", "saml", "jwt", "encryption", "cryptography", "blockchain", "web3",
  "ethereum", "solidity", "smart contracts", "nft", "defi", "dapp",
  "mobile development", "ios", "android", "react native", "flutter", "xamarin",
  "swift", "kotlin", "objective-c", "java", "gradle", "xcode", "android studio",
  "figma", "sketch", "adobe xd", "ui", "ux", "design systems", "accessibility",
  "wcag", "aria", "seo", "sem", "ppc", "cpc", "ctr", "roi", "kpi", "oKR",
  "analytics", "gtm", "ga4", "mixpanel", "amplitude", "heap", "segment",
  "crm", "salesforce", "hubspot", "zoho", "pipedrive", "freshdesk", "intercom",
  "slack", "teams", "discord", "zoom", "jira", "confluence", "notion", "asana",
  "monday", "trello", "todoist", "clickup", "linear", "shortcut", "youtrack",
  "aws lambda", "serverless", "faas", "gae", "cloud run", "azure functions",
  "s3", "cloudfront", "route53", "ec2", "rds", "dynamodb", "sns", "sqs", "sqs",
  "gcs", "firestore", "pubsub", "cloud tasks", "gke", "aks", "eks", "openshift",
  "helm", "istio", "istio", "envoy", "consul", "vault", "nomad", "terraform",
  "cloudformation", "bicep", "arm", "pulumi", "cdk", "sam", "serverless framework",
  "nx", "monorepo", "lerna", "yarn workspaces", "pnpm", "turborepo", "bazel"
];

// Certifications to look for
const CERTIFICATION_PATTERNS = /\b(aws certified|azure certified|gcp certified|kubernetes|ckad|cka|rhce|azure solutions architect|aws solutions architect|aws devops|aws sysops|certified kubernetes administrator|certified kubernetes application developer|certified cloud security professional|certified cloud practitioner|cissp|cism|cism|ccsk|security+|oscp|osce|giac|certified ethical hacker|ceh|certified information security manager|cissp|ccsk|offensive security certified professional|oscp|oracle certified|sun certified|microsoft certified|mcp|mcsa|mcse|ccna|ccnp|ccie|isc2|giac|sans|isc\^2|comptia|pearson vue|prometric|kryterion|pluralsight|cloudacademy|a cloud guru|linux academy|udacity|coursera|edx|udemy)\b/gi;

// Job titles to look for (indicates seniority level)
const JOB_TITLE_PATTERNS = /\b(senior|principal|lead|staff|architect|manager|director|vp|vice president|cto|cfo|ceo|coo|cio|head of|junior|intern|entry level|mid level|mid-level|mid-senior|senior-level|principal engineer|tech lead|engineering manager|product manager|project manager|program manager|delivery manager|scrum master|product owner|po|tech lead|staff engineer|principal engineer)\b/gi;

/**
 * Download PDF from URL and extract text
 * Note: This function only works server-side
 */
export async function extractTextFromPdf(fileUrl: string): Promise<string> {
  try {
    // Dynamically import pdf-parse (server-side only)
    let pdfParse: any;
    try {
      pdfParse = require("pdf-parse");
    } catch {
      // Fallback if pdf-parse package isn't available
      console.warn("pdf-parse not available, returning empty text");
      return "";
    }

    // Fetch the PDF file
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(fileUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // Parse PDF
    const data = await pdfParse(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

/**
 * Extract meaningful keywords from text
 * Returns unique keywords sorted by frequency
 */
export function extractKeywords(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Convert to lowercase for processing
  const lowerText = text.toLowerCase();

  // Extract technical skills and keywords
  const technicalMatches = new Set<string>();

  // Check regex pattern for common tech keywords
  let match;
  const techRegex = TECHNICAL_KEYWORDS;
  techRegex.lastIndex = 0;

  while ((match = techRegex.exec(lowerText)) !== null) {
    const word = match[0].toLowerCase();
    if (!STOP_WORDS.has(word)) {
      technicalMatches.add(word);
    }
  }

  // Check predefined tech skills list
  for (const skill of TECH_SKILLS) {
    if (lowerText.includes(skill.toLowerCase())) {
      technicalMatches.add(skill.toLowerCase());
    }
  }

  // Extract certifications
  let certMatch;
  const certRegex = CERTIFICATION_PATTERNS;
  certRegex.lastIndex = 0;

  while ((certMatch = certRegex.exec(text)) !== null) {
    const cert = certMatch[0].toLowerCase();
    if (!STOP_WORDS.has(cert)) {
      technicalMatches.add(cert);
    }
  }

  // Extract job titles and seniority levels
  let titleMatch;
  const titleRegex = JOB_TITLE_PATTERNS;
  titleRegex.lastIndex = 0;

  while ((titleMatch = titleRegex.exec(text)) !== null) {
    const title = titleMatch[0].toLowerCase();
    if (!STOP_WORDS.has(title)) {
      technicalMatches.add(title);
    }
  }

  // Split text into words and filter meaningful ones
  const words = lowerText
    .split(/\s+/)
    .map((word) =>
      word
        .replace(/[^\w-]/g, "") // Remove special characters except hyphens
        .toLowerCase()
    )
    .filter((word) => {
      // Keep words that are:
      // 1. Not in stop words
      // 2. At least 3 characters long
      // 3. Not purely numeric
      return (
        word.length >= 3 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word) &&
        word.length < 50 // Skip very long strings that are likely corrupted
      );
    });

  // Count word frequency
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Combine technical matches with frequency data
  const keywordCandidates = new Map<string, number>();

  // Add technical matches with high weight
  for (const tech of technicalMatches) {
    const freq = wordFreq.get(tech) || 1;
    keywordCandidates.set(tech, freq + 10); // Boost technical keywords
  }

  // Add frequent words
  for (const [word, freq] of wordFreq) {
    if (freq >= 2 || word.length > 5) {
      // Include words that appear 2+ times or are longer
      if (!keywordCandidates.has(word)) {
        keywordCandidates.set(word, freq);
      }
    }
  }

  // Sort by frequency (descending) and return top keywords
  const sortedKeywords = Array.from(keywordCandidates.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100) // Return top 100 keywords
    .map(([keyword]) => keyword);

  return sortedKeywords;
}

/**
 * Extract keywords from a job description
 * Combines job title, company name, and notes
 */
export function extractJobKeywords(
  jobTitle: string,
  company: string,
  notes: string
): string[] {
  const fullText = [
    jobTitle,
    company,
    notes || "",
  ]
    .filter(Boolean)
    .join(" ");

  return extractKeywords(fullText);
}
