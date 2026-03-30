import { Injectable } from '@nestjs/common';
import axios from 'axios';

// Real code snippets per language that get committed to repos
const CODE_SCRIPTS: Record<string, { filename: string; contents: string[] }> = {
  JAVA: {
    filename: 'src/main/java/com/demo/DemoService.java',
    contents: [
      `package com.demo;\n\nimport org.springframework.stereotype.Service;\nimport java.time.Instant;\n\n@Service\npublic class DemoService {\n    public String getStatus() {\n        return "OK at " + Instant.now();\n    }\n    // auto-commit: ${() => Date.now()}\n}\n`,
      `package com.demo;\n\nimport org.springframework.stereotype.Service;\nimport java.util.List;\nimport java.util.ArrayList;\n\n@Service\npublic class DemoService {\n    private final List<String> log = new ArrayList<>();\n\n    public void record(String msg) { log.add(msg); }\n    public List<String> getLogs() { return log; }\n    // auto-commit: ${() => Date.now()}\n}\n`,
      `package com.demo;\n\nimport org.springframework.stereotype.Service;\n\n@Service\npublic class DemoService {\n    public int add(int a, int b) { return a + b; }\n    public int multiply(int a, int b) { return a * b; }\n    // auto-commit: ${() => Date.now()}\n}\n`,
    ],
  },
  PYTHON: {
    filename: 'app/service.py',
    contents: [
      `from datetime import datetime\n\nclass DemoService:\n    def get_status(self):\n        return {"status": "ok", "time": str(datetime.now())}\n    # auto-commit: {ts}\n`,
      `import random\nfrom typing import List\n\nclass DemoService:\n    def __init__(self):\n        self.items: List[str] = []\n\n    def add(self, item: str) -> None:\n        self.items.append(item)\n\n    def get_all(self) -> List[str]:\n        return self.items\n    # auto-commit: {ts}\n`,
      `import hashlib\n\nclass DemoService:\n    def hash_data(self, data: str) -> str:\n        return hashlib.sha256(data.encode()).hexdigest()\n\n    def validate(self, data: str, expected: str) -> bool:\n        return self.hash_data(data) == expected\n    # auto-commit: {ts}\n`,
    ],
  },
  NODE: {
    filename: 'src/service.js',
    contents: [
      `const { randomUUID } = require('crypto');\n\nclass DemoService {\n  constructor() { this.store = new Map(); }\n  set(key, val) { this.store.set(key, val); }\n  get(key) { return this.store.get(key); }\n  // auto-commit: {ts}\n}\n\nmodule.exports = DemoService;\n`,
      `class DemoService {\n  async fetchData(url) {\n    const res = await fetch(url);\n    return res.json();\n  }\n  transform(data) {\n    return Array.isArray(data) ? data.map(d => ({ ...d, processed: true })) : data;\n  }\n  // auto-commit: {ts}\n}\n\nmodule.exports = DemoService;\n`,
      `const EventEmitter = require('events');\n\nclass DemoService extends EventEmitter {\n  constructor() { super(); this.queue = []; }\n  enqueue(job) { this.queue.push(job); this.emit('job', job); }\n  dequeue() { return this.queue.shift(); }\n  // auto-commit: {ts}\n}\n\nmodule.exports = DemoService;\n`,
    ],
  },
  GENERAL: {
    filename: 'scripts/run.sh',
    contents: [
      `#!/bin/bash\n# auto-commit: {ts}\necho "Running build..."\nnpm install && npm run build\necho "Done"\n`,
      `#!/bin/bash\n# auto-commit: {ts}\necho "Running tests..."\nnpm test\necho "Tests complete"\n`,
      `#!/bin/bash\n# auto-commit: {ts}\necho "Deploying..."\ndocker build -t app . && docker push app\necho "Deployed"\n`,
    ],
  },
};

const COMMIT_MESSAGES = [
  'feat: add new service method',
  'fix: resolve edge case in handler',
  'refactor: improve performance',
  'chore: update dependencies',
  'feat: implement caching layer',
  'fix: handle null pointer exception',
  'test: add unit tests for service',
  'feat: add input validation',
  'fix: correct response format',
  'refactor: extract helper functions',
];

@Injectable()
export class GitPushService {
  async pushToRepo(repo: {
    fullName: string;
    githubToken: string;
    branch: string;
    language: string;
  }): Promise<{ sha: string; message: string; filename: string } | null> {
    try {
      const script = CODE_SCRIPTS[repo.language] || CODE_SCRIPTS.NODE;
      const ts = Date.now().toString();
      const contentIndex = Math.floor(Math.random() * script.contents.length);
      const rawContent = script.contents[contentIndex].replace(/\{ts\}/g, ts);
      const content = Buffer.from(rawContent).toString('base64');
      const message = COMMIT_MESSAGES[Math.floor(Math.random() * COMMIT_MESSAGES.length)];
      const filename = script.filename;

      const headers = {
        Authorization: `token ${repo.githubToken}`,
        'User-Agent': 'PipelineHub-Demo',
        'Content-Type': 'application/json',
      };

      const baseUrl = `https://api.github.com/repos/${repo.fullName}/contents/${filename}`;

      // Get current file SHA if it exists
      let sha: string | undefined;
      try {
        const existing = await axios.get(`${baseUrl}?ref=${repo.branch}`, { headers });
        sha = existing.data.sha;
      } catch {
        // File doesn't exist yet — will create it
      }

      // Commit the file
      const response = await axios.put(baseUrl, {
        message,
        content,
        branch: repo.branch,
        ...(sha && { sha }),
      }, { headers });

      return {
        sha: response.data.commit.sha.slice(0, 7),
        message,
        filename,
      };
    } catch (err) {
      console.error(`[GitPush] Failed to push to ${repo.fullName}: ${err.message}`);
      return null;
    }
  }
}
