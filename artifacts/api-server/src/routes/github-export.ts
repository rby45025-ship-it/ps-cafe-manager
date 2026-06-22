import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const WORKSPACE = "/home/runner/workspace";
const EXCLUDE_DIRS = new Set(["node_modules", ".git", "dist", ".local", "attached_assets", ".agents", "__pycache__", ".cache"]);
const EXCLUDE_FILES = new Set(["pnpm-lock.yaml", ".replit", "replit.nix", "ps-cafe-full-project.zip", ".env"]);
const MAX_FILE_SIZE = 1_000_000; // 1 MB — skip huge files

function getAllFiles(dir: string, base: string = dir): Array<{ abs: string; rel: string }> {
  const results: Array<{ abs: string; rel: string }> = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (EXCLUDE_FILES.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      results.push(...getAllFiles(abs, base));
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(abs);
        if (stat.size <= MAX_FILE_SIZE) results.push({ abs, rel });
      } catch { /* skip */ }
    }
  }
  return results;
}

async function ghFetch(url: string, token: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "PSCafeExporter/1.0",
      ...(options.headers ?? {}),
    },
  });
}

router.post("/github-export", async (req, res) => {
  const { token, repoName, description = "PlayStation Cafe Manager — Arabic RTL Management System", isPrivate = false } = req.body;

  if (!token || !repoName) {
    return res.status(400).json({ error: "token و repoName مطلوبان" });
  }

  try {
    // 1. Get authenticated user
    const userRes = await ghFetch("https://api.github.com/user", token);
    if (!userRes.ok) {
      return res.status(401).json({ error: "Token غير صالح — تأكد من صلاحية repo" });
    }
    const user = await userRes.json() as { login: string };
    const owner = user.login;

    // 2. Create (or reuse) repository
    const createRes = await ghFetch("https://api.github.com/user/repos", token, {
      method: "POST",
      body: JSON.stringify({ name: repoName, description, private: isPrivate, auto_init: true }),
    });

    let repoUrl = `https://github.com/${owner}/${repoName}`;
    if (!createRes.ok && createRes.status !== 422) {
      const err = await createRes.json() as { message: string };
      return res.status(400).json({ error: "فشل إنشاء المستودع: " + err.message });
    }

    // 3. Get the current HEAD commit SHA on main/master
    let baseSha = "";
    let baseTreeSha = "";
    for (const branch of ["main", "master"]) {
      const refRes = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${branch}`, token);
      if (refRes.ok) {
        const ref = await refRes.json() as { object: { sha: string } };
        baseSha = ref.object.sha;
        const commitRes = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits/${baseSha}`, token);
        const commit = await commitRes.json() as { tree: { sha: string } };
        baseTreeSha = commit.tree.sha;
        break;
      }
    }

    // 4. Read all workspace files and create blobs
    const files = getAllFiles(WORKSPACE);
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];
    let uploaded = 0;
    let failed = 0;

    for (const { abs, rel } of files) {
      try {
        const content = fs.readFileSync(abs);
        const b64 = content.toString("base64");

        const blobRes = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/git/blobs`, token, {
          method: "POST",
          body: JSON.stringify({ content: b64, encoding: "base64" }),
        });

        if (blobRes.ok) {
          const blob = await blobRes.json() as { sha: string };
          treeItems.push({ path: rel, mode: "100644", type: "blob", sha: blob.sha });
          uploaded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // 5. Create a new tree
    const treeBody: Record<string, unknown> = { tree: treeItems };
    if (baseTreeSha) treeBody.base_tree = baseTreeSha;

    const treeRes = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, token, {
      method: "POST",
      body: JSON.stringify(treeBody),
    });
    if (!treeRes.ok) {
      const err = await treeRes.json() as { message: string };
      return res.status(500).json({ error: "فشل إنشاء الشجرة: " + err.message });
    }
    const tree = await treeRes.json() as { sha: string };

    // 6. Create commit
    const commitBody: Record<string, unknown> = {
      message: "🎮 Export PlayStation Cafe Manager source code",
      tree: tree.sha,
      author: { name: "PS Cafe Manager", email: "ps-cafe@export.local", date: new Date().toISOString() },
    };
    if (baseSha) commitBody.parents = [baseSha];

    const commitRes2 = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, token, {
      method: "POST",
      body: JSON.stringify(commitBody),
    });
    if (!commitRes2.ok) {
      const err = await commitRes2.json() as { message: string };
      return res.status(500).json({ error: "فشل إنشاء الـ commit: " + err.message });
    }
    const newCommit = await commitRes2.json() as { sha: string };

    // 7. Update or create the ref
    for (const branch of ["main", "master"]) {
      const patchRes = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${branch}`, token, {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha, force: true }),
      });
      if (patchRes.ok) break;
    }

    res.json({ success: true, repoUrl, owner, repoName, uploaded, failed, total: files.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

export default router;
