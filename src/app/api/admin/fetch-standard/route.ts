import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ------------------------------------------------------------------ */
/*  Known PDF source patterns for Chinese occupational health standards */
/* ------------------------------------------------------------------ */

const PDF_SEARCH_SOURCES = [
  // 国家标准全文公开系统
  (q: string) =>
    `https://openstd.samr.gov.cn/bzgk/gb/std_list?p.p1=0&p.p90=${encodeURIComponent(q)}&p.p2=`,
  // 安全文库
  (q: string) =>
    `https://www.aqwk.com/search?q=${encodeURIComponent(q)}+filetype:pdf`,
  // 标准网
  (q: string) =>
    `https://www.biaozhun.cc/search?q=${encodeURIComponent(q)}`,
];

/* Try to find a direct PDF link by searching known aggregator sites */
async function searchPdfUrl(query: string): Promise<string | null> {
  // Strategy 1: Try direct known URL patterns for GBZ standards
  const gbzMatch = query.match(/GBZ\s*\/?\s*T?\s*(\d+[\.\d]*)\s*[-—]\s*(\d{4})/i);
  if (gbzMatch) {
    const stdNum = gbzMatch[1];
    const stdYear = gbzMatch[2];
    
    // Try common hosting patterns
    const candidates = [
      `https://www.niohp.chinacdc.cn/jsbz/gbz/`,
      `https://max.book118.com/`,
    ];
    
    // We can't reliably scrape these, so we'll use a different approach
  }

  // Strategy 2: Use a web search to find the PDF
  // We'll try fetching from multiple sources
  const searchUrls = [
    `https://www.google.com/search?q=${encodeURIComponent(query + " filetype:pdf site:gov.cn OR site:chinacdc.cn")}&num=5`,
  ];

  // Since we can't reliably scrape Google from serverless, 
  // we'll return null and let the caller handle it
  return null;
}

/* ------------------------------------------------------------------ */
/*  GitHub helpers                                                     */
/* ------------------------------------------------------------------ */

async function uploadToGitHub(
  token: string,
  repo: string,
  branch: string,
  filePath: string,
  content: Buffer | string,
  message: string,
): Promise<boolean> {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const contentBase64 =
    typeof content === "string"
      ? Buffer.from(content, "utf8").toString("base64")
      : content.toString("base64");

  let sha: string | undefined;
  try {
    const checkRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as { sha: string };
      sha = existing.sha;
    }
  } catch {
    // File doesn't exist
  }

  const body: Record<string, string> = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.ok;
}

/* ------------------------------------------------------------------ */
/*  Standard content generator                                         */
/* ------------------------------------------------------------------ */

function generateStandardMdx(
  slug: string,
  title: string,
  stdNumber: string,
  pdfUrl: string | null,
  summary: string,
  tags: string[],
): string {
  const date = new Date().toISOString().slice(0, 10);
  const attachments = pdfUrl
    ? `attachments:\n  - name: "${slug}.pdf"\n    url: "${pdfUrl}"\n    type: "pdf"`
    : "attachments: []";

  const tagLines = tags.length > 0
    ? tags.map((t) => `  - "${t}"`).join("\n")
    : '  - "职业卫生标准"';

  return `---
slug: "${slug}"
title: "${title}"
summary: "${summary}"
date: "${date}"
category: "标准规范"
author: "徐广军"
source: "${stdNumber}"
tags:
${tagLines}
${attachments}
---

## ${title}

标准编号：${stdNumber}

${summary}

> 本标准全文可通过上方 PDF 预览查看，或点击"下载 PDF"按钮获取完整文件。
`;
}

function createSlug(stdNumber: string): string {
  return stdNumber
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[\/\\]/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as Record<string, unknown>)?.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { standardNumber, title, summary, tags, pdfUrl: externalPdfUrl } = body as {
    standardNumber: string;
    title?: string;
    summary?: string;
    tags?: string[];
    pdfUrl?: string;
  };

  if (!standardNumber) {
    return NextResponse.json(
      { success: false, message: "standardNumber 为必填项" },
      { status: 400 },
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "axuan20160304-oss/xu-occupational-health";
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) {
    return NextResponse.json(
      { success: false, message: "GITHUB_TOKEN 未配置" },
      { status: 500 },
    );
  }

  const slug = createSlug(standardNumber);
  const displayTitle = title || standardNumber;
  const displaySummary = summary || `${standardNumber} 职业卫生标准全文`;
  const displayTags = tags || ["职业卫生标准", "GBZ"];

  let pdfPath: string | null = null;

  // If external PDF URL provided, download and upload it
  if (externalPdfUrl) {
    try {
      const pdfRes = await fetch(externalPdfUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (pdfRes.ok) {
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        
        // Check if it's actually a PDF
        if (pdfBuffer.length > 100 && pdfBuffer.slice(0, 5).toString() === "%PDF-") {
          const pdfGitPath = `public/uploads/${slug}.pdf`;
          const uploaded = await uploadToGitHub(
            token,
            repo,
            branch,
            pdfGitPath,
            pdfBuffer,
            `upload: standard PDF ${slug}`,
          );

          if (uploaded) {
            pdfPath = `/uploads/${slug}.pdf`;
          }
        }
      }
    } catch {
      // PDF download failed, continue without PDF
    }
  }

  // If no external URL, try to search for one
  if (!pdfPath && !externalPdfUrl) {
    const foundUrl = await searchPdfUrl(standardNumber);
    if (foundUrl) {
      try {
        const pdfRes = await fetch(foundUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          if (pdfBuffer.length > 100 && pdfBuffer.slice(0, 5).toString() === "%PDF-") {
            const pdfGitPath = `public/uploads/${slug}.pdf`;
            const uploaded = await uploadToGitHub(
              token,
              repo,
              branch,
              pdfGitPath,
              pdfBuffer,
              `upload: standard PDF ${slug}`,
            );
            if (uploaded) {
              pdfPath = `/uploads/${slug}.pdf`;
            }
          }
        }
      } catch {
        // Search-based download failed
      }
    }
  }

  // Generate and upload the MDX file
  const mdxContent = generateStandardMdx(
    slug,
    displayTitle,
    standardNumber,
    pdfPath,
    displaySummary,
    displayTags,
  );

  const mdxPath = `content/laws/${slug}.mdx`;
  const mdxUploaded = await uploadToGitHub(
    token,
    repo,
    branch,
    mdxPath,
    mdxContent,
    `add standard: ${standardNumber}`,
  );

  if (!mdxUploaded) {
    return NextResponse.json(
      { success: false, message: "标准文件创建失败" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: pdfPath
      ? `标准 ${standardNumber} 已创建，PDF 已上传`
      : `标准 ${standardNumber} 已创建（无PDF，可稍后上传）`,
    slug,
    pdfUrl: pdfPath,
    mdxPath,
  });
}
