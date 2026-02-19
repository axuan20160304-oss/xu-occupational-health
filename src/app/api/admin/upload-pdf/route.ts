import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as Record<string, unknown>)?.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const slug = formData.get("slug") as string | null;

  if (!file || !slug) {
    return NextResponse.json(
      { success: false, message: "file 和 slug 为必填项" },
      { status: 400 },
    );
  }

  if (!file.name.endsWith(".pdf")) {
    return NextResponse.json(
      { success: false, message: "仅支持 PDF 文件" },
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

  const fileName = `${slug}.pdf`;
  const filePath = `public/uploads/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  const arrayBuffer = await file.arrayBuffer();
  const contentBase64 = Buffer.from(arrayBuffer).toString("base64");

  // Check if file already exists
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
    // File doesn't exist yet
  }

  const body: Record<string, string> = {
    message: `upload: PDF ${fileName}`,
    content: contentBase64,
    branch,
  };
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { success: false, message: `上传失败: ${errText}` },
      { status: 500 },
    );
  }

  const pdfUrl = `/uploads/${fileName}`;

  // Update the law's MDX frontmatter to include the PDF attachment
  try {
    const mdxPath = `content/laws/${slug}.mdx`;
    const mdxApiUrl = `https://api.github.com/repos/${repo}/contents/${mdxPath}`;
    const mdxCheck = await fetch(mdxApiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (mdxCheck.ok) {
      const mdxData = (await mdxCheck.json()) as { sha: string; content: string };
      const mdxContent = Buffer.from(mdxData.content, "base64").toString("utf8");

      // Replace attachments: [] with the PDF attachment
      let updatedContent = mdxContent;
      if (mdxContent.includes("attachments: []")) {
        updatedContent = mdxContent.replace(
          "attachments: []",
          `attachments:\n  - name: "${slug}.pdf"\n    url: "${pdfUrl}"\n    type: "pdf"`,
        );
      } else if (!mdxContent.includes(pdfUrl)) {
        // Add PDF to existing attachments
        updatedContent = mdxContent.replace(
          /^(attachments:)/m,
          `attachments:\n  - name: "${slug}.pdf"\n    url: "${pdfUrl}"\n    type: "pdf"`,
        );
      }

      if (updatedContent !== mdxContent) {
        await fetch(mdxApiUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `attach PDF to ${slug}`,
            content: Buffer.from(updatedContent, "utf8").toString("base64"),
            sha: mdxData.sha,
            branch,
          }),
        });
      }
    }
  } catch {
    // Non-critical: PDF uploaded but frontmatter not updated
  }

  return NextResponse.json({
    success: true,
    message: `PDF 已上传并关联到标准`,
    url: pdfUrl,
    fileName,
  });
}
